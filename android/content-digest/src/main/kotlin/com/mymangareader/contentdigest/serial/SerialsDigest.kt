package com.mymangareader.contentdigest.serial

import com.mymangareader.cache.Cache
import com.mymangareader.cache.CacheFilter
import com.mymangareader.cache.PatchItem
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

    val minimals = response.data.serials.map { serialDigestFromListData(it, serverInfo, resolvedAtEpochMs) }

    // ONE read + ONE transactional write for the whole list, instead of a get()+put() per series
    // (that per-series loop is what made a ~120-series library take ~12s on device). readFilter is
    // domain+variant-scoped so the pre-merge read is a single query with no IN-list / host-param
    // limit. Each entry is still SHALLOW-merged with whatever a prior buildSerialDigest(id) wrote,
    // so chapters/metadata survive on disk; the response itself carries only the light digest
    // (name/cover/pages — the card renders from that, richer blocks come from buildSerialDigest).
    val descriptors = cache.persistent.patchAll(
        minimals.map {
            PatchItem(
                serialsListCacheKey(it.id),
                serialsDigestJson.encodeToString(SerialDigest.Success.serializer(), it),
            )
        },
        domain = SERIAL_CACHE_DOMAIN,
        variant = SERIAL_CACHE_VARIANT,
        readFilter = CacheFilter(domain = SERIAL_CACHE_DOMAIN, variant = SERIAL_CACHE_VARIANT),
    )
    val persisted = minimals.zip(descriptors) { m, d -> m.copy(cache = d) }

    val lastUpdatedEpochMs = persisted.mapNotNull { it.cache?.cachedAtEpochMs }.maxOrNull()

    if (!force && isSerialCacheStale(lastUpdatedEpochMs)) {
        serialsDigestBackgroundScope.launch { buildSerialsDigest(server, cache, force = true) }
    }

    return SerialsDigest.Success(
        serials = persisted,
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

