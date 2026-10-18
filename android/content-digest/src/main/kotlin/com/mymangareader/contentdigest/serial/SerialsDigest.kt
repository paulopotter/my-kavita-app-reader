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
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.serialization.json.Json

// buildSerialsDigest — the list counterpart of buildSerialDigest. Same cache-first contract, but
// list-shaped: ONE `server.serials.list()` request (never a per-series loop of get()s), and every
// item comes back as a SerialDigest.Success assembled DIRECTLY from that list payload. The fields
// the list can't carry — chapters/metadata/resumePoint — are absent (null), exactly as they'd be
// on a fresh buildSerialDigest that only got as far as serial.get().
//
// Its only cache of its own is the list snapshot (SerialsListSnapshot.kt) that makes a plain read
// instant. Apart from that it MERGES each list item into that series' own per-series
// cache (buildSerialDigest's domain "serial", key "<id>:false:false") so a later
// buildSerialDigest(id) mount is a cache hit — and, crucially, so a list refresh never clobbers a
// richer entry (chapters/metadata) a prior buildSerialDigest(id) already wrote: the merge keeps
// those and only refreshes the list-sourced fields (name/cover/pages/dates/…).
//
// `lastUpdatedEpochMs` is the moment of the last sync with the server (the snapshot's own stamp when
// it is served). When the snapshot is older than SERIALS_SNAPSHOT_TTL_MS, a background `force=true`
// refresh is kicked (same stale-while-revalidate pattern as buildSerialDigest).

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
    data class Failure(
        val error: ErrorDigest,
    ) : SerialsDigest
}

// A field the list cannot know (chapters, metadata, ...) is a null in the minimal digest. Written out as
// `"chapters":null` it would OVERWRITE the chapters an earlier buildSerialDigest saved in the very same
// row — the shallow merge below treats an explicit null as a value — so every list refresh wiped them
// and the next open of each series was a cache miss. Nulls are left out instead, and the merge keeps
// whatever was already there.
private val serialsDigestJson = Json {
    ignoreUnknownKeys = true
    explicitNulls = false
}
private val serialsDigestBackgroundScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
// One list refresh in the background at a time: the Library and the Dashboard both ask on focus.
private val serialsRefreshing = AtomicBoolean(false)

/**
 * Cache-first, as the data-freshness principle 2 asks: without `force`, a snapshot of the list that
 * is still fresh (SERIALS_SNAPSHOT_TTL_MS) is returned at once with no network call, and an older one
 * is returned too while a background refresh replaces it. Only with no usable snapshot does the call
 * wait for the server.
 *
 * @param force when true, re-fetch `serials.list()` and re-merge every per-series cache even if
 *   the current caches are still fresh. A manual pull-to-refresh on the Library passes this.
 */
suspend fun buildSerialsDigest(
    server: Server,
    cache: Cache,
    force: Boolean = false,
): SerialsDigest {
    if (!force) {
        val snapshot = readServedSnapshot(server, cache)
        if (snapshot != null) {
            if (snapshot.isStale(System.currentTimeMillis()) && serialsRefreshing.compareAndSet(false, true)) {
                serialsDigestBackgroundScope.launch {
                    try {
                        buildSerialsDigest(server, cache, force = true)
                    } finally {
                        serialsRefreshing.set(false)
                    }
                }
            }
            serialLog("list snapshot hit serials=${snapshot.serials.size} ageMs=${System.currentTimeMillis() - snapshot.syncedAtEpochMs}")
            return SerialsDigest.Success(serials = snapshot.withDescriptors(), lastUpdatedEpochMs = snapshot.syncedAtEpochMs)
        }
    }

    val response =
        try {
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
    val descriptors =
        cache.persistent.patchAll(
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

    // An empty list is not remembered: it is more likely a server hiccup than an empty library.
    if (minimals.isNotEmpty()) {
        writeSerialsSnapshot(cache, SerialsSnapshot(System.currentTimeMillis(), serverInfo.url, minimals))
    }

    return SerialsDigest.Success(
        serials = persisted,
        lastUpdatedEpochMs = lastUpdatedEpochMs,
    )
}

// The snapshot, unless it came from another server or another address of it (its covers would point
// there). With no active server resolved yet (a cold start) it is trusted: that is what lets the
// first screen paint without waiting for the network.
private suspend fun readServedSnapshot(
    server: Server,
    cache: Cache,
): SerialsSnapshot? {
    val snapshot = readSerialsSnapshot(cache) ?: return null
    val activeUrl = server.getActiveInfo()?.url
    return if (activeUrl != null && activeUrl != snapshot.serverUrl) null else snapshot
}

// A single SerialData (list row, cover already an ImageDescriptor) → the minimal SerialDigest.Success
// shape buildSerialDigest would produce with only serial.get() done: chapters/metadata absent.
internal fun serialDigestFromListData(
    serial: SerialData,
    serverInfo: ServerActiveInfo,
    resolvedAtEpochMs: Long,
): SerialDigest.Success =
    SerialDigest.Success(
        id = serial.id,
        name = serial.name,
        library = serial.libraryId?.let { SerialFields.Library(id = it, name = serial.libraryName) },
        lastUpdatesUTC =
            SerialFields.LastUpdatesUTC(
                series = parseIsoUtcToEpochMs(serial.lastFolderScannedUtc),
                chapterAdded = parseIsoUtcToEpochMs(serial.lastChapterAddedUtc),
                readDate = parseIsoUtcToEpochMs(serial.latestReadDateUtc),
                created = parseIsoUtcToEpochMs(serial.createdUtc),
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
