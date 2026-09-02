package com.mymangareader.contentdigest.serial

import com.mymangareader.cache.Cache
import com.mymangareader.cache.CacheDescriptor
import com.mymangareader.contentdigest.error.ErrorDigest
import com.mymangareader.contentdigest.error.toErrorDigest
import com.mymangareader.server.SerialData
import com.mymangareader.server.Server
import com.mymangareader.server.ServerActiveInfo
import com.mymangareader.tools.datetime.parseIsoUtcToEpochMs
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json

// buildSerialsDigest — the list counterpart of buildSerialDigest. Same cache-first contract, but
// list-shaped: ONE `server.serials.list()` request (never a per-series loop of get()s), and every
// item comes back as a SerialDigest.Success assembled DIRECTLY from that list payload. The fields
// the list can't carry — chapters/metadata/resumePoint — are absent (null), exactly as they'd be
// on a fresh buildSerialDigest that only got as far as serial.get().
//
// It owns NO cache of its own. Instead it MERGES each list item into that series' own per-series
// cache (buildSerialDigest's domain "serial", key "<id>:false:false") so a later
// buildSerialDigest(id) mount is a cache hit — and, crucially, so a list refresh never clobbers a
// richer entry (chapters/metadata) a prior buildSerialDigest(id) already wrote: the merge keeps
// those and only refreshes the list-sourced fields (name/cover/pages/dates/…).
//
// `lastUpdatedEpochMs` is DERIVED every call — the newest `cachedAtEpochMs` across the per-series
// caches this run touched — never a stored value. When that newest is older than the SERIAL
// domain's TTL, a background `force=true` refresh is kicked (same pattern as buildSerialDigest's
// own stale-while-revalidate).

sealed interface SerialsDigest {
    data class Success(
        // Each entry is a SerialDigest.Success (minimal — chapters/metadata/resumePoint null) or,
        // if that one series' cache merge somehow produced a decode failure, a SerialDigest.Failure.
        val serials: List<SerialDigest>,
        // Newest cachedAtEpochMs across the per-series caches touched this run. null only when the
        // list came back empty (no series → nothing cached → nothing to date).
        val lastUpdatedEpochMs: Long?,
    ) : SerialsDigest

    // Only when `server.serials.list()` itself failed — a single series never fails this whole
    // result (there's no per-series network call here to fail).
    data class Failure(val error: ErrorDigest) : SerialsDigest
}

private val serialsDigestJson = Json { ignoreUnknownKeys = true }
private val serialsDigestBackgroundScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

/**
 * @param force when true, re-fetch `serials.list()` and re-merge every per-series cache even if
 *   the current caches are still fresh. A manual pull-to-refresh on the Library passes this.
 */
suspend fun buildSerialsDigest(server: Server, cache: Cache, force: Boolean = false): SerialsDigest {
    val response = try {
        server.serials.list()
    } catch (e: Exception) {
        return SerialsDigest.Failure(e.toErrorDigest())
    }

    val serverInfo = response.serverInfo
    val resolvedAtEpochMs = response.resolvedAtEpochMs

    val merged = response.data.serials.map { serial ->
        val minimal = serialDigestFromListData(serial, serverInfo, resolvedAtEpochMs)
        mergeIntoSerialCache(cache, serial.id, minimal)
    }

    val lastUpdatedEpochMs = merged.mapNotNull { it.descriptor?.cachedAtEpochMs }.maxOrNull()

    if (!force && isSerialCacheStale(lastUpdatedEpochMs)) {
        serialsDigestBackgroundScope.launch { buildSerialsDigest(server, cache, force = true) }
    }

    return SerialsDigest.Success(
        serials = merged.map { it.digest },
        lastUpdatedEpochMs = lastUpdatedEpochMs,
    )
}

// A single SerialData (list row, cover already an ImageDescriptor) → the minimal SerialDigest.Success
// shape buildSerialDigest would produce with only serial.get() done: chapters/metadata absent.
internal fun serialDigestFromListData(
    serial: SerialData,
    serverInfo: ServerActiveInfo,
    resolvedAtEpochMs: Long,
): SerialDigest.Success = SerialDigest.Success(
    id = serial.id,
    name = serial.name,
    library = serial.libraryId?.let { SerialFields.Library(id = it, name = serial.libraryName) },
    lastUpdatesUTC = SerialFields.LastUpdatesUTC(
        series = parseIsoUtcToEpochMs(serial.lastFolderScannedUtc),
        chapterAdded = parseIsoUtcToEpochMs(serial.lastChapterAddedUtc),
        readDate = parseIsoUtcToEpochMs(serial.latestReadDateUtc),
    ),
    coverImage = serial.coverImage,
    chapters = null,
    otherNames = SerialFields.OtherNames(original = serial.originalName, localized = serial.localizedName),
    sortName = serial.sortName,
    otherIds = SerialFields.OtherIds(aniListId = serial.aniListId, malId = serial.malId),
    colors = SerialFields.Colors(primary = serial.primaryColor, secondary = serial.secondaryColor),
    pages = SerialFields.Pages(read = serial.pagesRead, total = serial.totalPages),
    metadata = null,
    resolvedAtEpochMs = resolvedAtEpochMs,
    server = serverInfo,
    cache = null,
)

private data class MergedSerial(val digest: SerialDigest.Success, val descriptor: CacheDescriptor?)

// Merge a freshly-listed minimal digest into that series' own per-series cache. If a richer entry
// (from a prior buildSerialDigest) is already there, keep its chapters/metadata and only overlay
// the fields the list actually refreshes. Always writes back so `cachedAtEpochMs` advances (that's
// what `lastUpdatedEpochMs` is derived from).
private suspend fun mergeIntoSerialCache(
    cache: Cache,
    seriesId: String,
    minimal: SerialDigest.Success,
): MergedSerial {
    val key = serialsListCacheKey(seriesId)

    val existing = runCatching {
        cache.persistent.get(key, variant = SERIAL_CACHE_VARIANT)
            ?.let { serialsDigestJson.decodeFromString<SerialDigest.Success>(it.value) }
    }.getOrNull()

    val toPersist = if (existing == null) {
        minimal
    } else {
        // Overlay only the list-sourced fields; preserve the richer chapters/metadata blocks.
        existing.copy(
            name = minimal.name,
            library = minimal.library,
            lastUpdatesUTC = minimal.lastUpdatesUTC,
            coverImage = minimal.coverImage,
            otherNames = minimal.otherNames,
            sortName = minimal.sortName,
            otherIds = minimal.otherIds,
            colors = minimal.colors,
            pages = minimal.pages,
            resolvedAtEpochMs = minimal.resolvedAtEpochMs,
            server = minimal.server,
        )
    }

    val descriptor = cache.persistent.put(
        key,
        serialsDigestJson.encodeToString(SerialDigest.Success.serializer(), toPersist),
        SERIAL_CACHE_DOMAIN,
        variant = SERIAL_CACHE_VARIANT,
    )
    return MergedSerial(digest = toPersist.copy(cache = descriptor), descriptor = descriptor)
}
