package com.mymangareader.contentdigest.serial

import com.mymangareader.cache.Cache
import com.mymangareader.cache.CacheDescriptor
import com.mymangareader.cache.CacheEntry
import com.mymangareader.cache.CacheMode
import com.mymangareader.contentdigest.chapter.ChapterDigest
import com.mymangareader.contentdigest.chapter.ChapterFields
import com.mymangareader.contentdigest.chapter.ChapterNeighborDigest
import com.mymangareader.contentdigest.chapter.buildChapterDigest
import com.mymangareader.contentdigest.chapter.patchChapterReadStatus
import com.mymangareader.contentdigest.error.ErrorDigest
import com.mymangareader.contentdigest.error.toErrorDigest
import com.mymangareader.externalmetadataserver.ExternalMetadataServer
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataSeriesRef
import com.mymangareader.server.ImageDescriptor
import com.mymangareader.server.SerialData
import com.mymangareader.server.Server
import com.mymangareader.server.ServerActiveInfo
import com.mymangareader.server.plugins.PluginAgeRating
import com.mymangareader.server.plugins.PluginChapter
import com.mymangareader.server.plugins.PluginGenreOrTag
import com.mymangareader.server.plugins.PluginSeriesMetadata
import com.mymangareader.tools.datetime.parseIsoUtcToEpochMs
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.Transient
import kotlinx.serialization.json.Json

interface SerialFields {
    val id: String
    val name: String
    val library: Library?
    val lastUpdatesUTC: LastUpdatesUTC?
    val coverImage: ImageDescriptor
    val chapters: Chapters? // Necessary — null only when the chapters.list() call itself failed; a real empty series is chapters.list=[] (a Chapters value with an empty list), not null
    val otherNames: OtherNames?
    val sortName: String?
    val otherIds: OtherIds?
    val colors: Colors?
    val pages: Pages? // Kavita's SERIES-level page progress (pagesRead/totalPages) — coarser than chapters.readCount, but the only progress the list endpoint carries; always present (both a get() and a list() row have it)
    val metadata: Metadata? // Aggregating — null on any getMetadata() failure, never escalates
    val resolvedAtEpochMs: Long // R11 — only reflects this Series' OWN calls (get/getCoverImage), never chapters.list's or metadata's
    val server: ServerActiveInfo
    val cache: CacheDescriptor? // null only until the first successful cache write completes

    @Serializable
    data class Library(
        val id: String,
        val name: String?,
    )

    @Serializable
    data class LastUpdatesUTC(
        val series: Long?,
        val chapterAdded: Long?,
        val readDate: Long?,
    )

    @Serializable
    data class OtherNames(
        val original: String?,
        val localized: String?,
    )

    @Serializable
    data class OtherIds(
        val aniListId: Int?,
        val malId: Long?,
    )

    @Serializable
    data class Colors(
        val primary: String?,
        val secondary: String?,
    )

    @Serializable
    data class Pages(
        val read: Int,
        val total: Int,
    )

    @Serializable
    data class Metadata(
        val description: String?,
        val genres: List<PluginGenreOrTag>,
        val tags: List<PluginGenreOrTag>,
        val publicationStatus: String?,
        val ageRating: PluginAgeRating?,
        val releaseYear: Int?,
        val language: String?,
        val external: ExternalMetadataDigest?, // null when SerialDigestOptions.includeExternalMetadata was false — SerialDigest never even called buildExternalMetadataDigest; non-null (Success/Failure) once it did — see ExternalMetadataDigest's own doc
    )

    @Serializable
    enum class ChaptersStatus { SUCCESS, PARTIAL, ERROR }

    @Serializable
    data class Chapters(
        val status: ChaptersStatus,
        val readCount: Int?, // count of chapters.list entries whose ChapterDigest.Success.readStatus == READ
        val total: Int, // derived from list.size
        val resumePoint: ResumePoint?,
        val list: List<ChapterDigest>,
    )

    @Serializable
    enum class ResumePointStatus { IN_PROGRESS, UNREAD }

    @Serializable
    data class ResumePoint(
        val stoppedAtChapterId: String,
        val stoppedAtChapterIndex: Int,
        val status: ResumePointStatus,
        val recordedAtEpochMs: Long?, // duplicated from list[stoppedAtChapterIndex].pages.resumePoint.recordedAtEpochMs, for convenience
    )
}

@Serializable
sealed interface SerialDigest {
    @Serializable
    data class Success(
        override val id: String,
        override val name: String,
        override val library: SerialFields.Library?,
        override val lastUpdatesUTC: SerialFields.LastUpdatesUTC?,
        override val coverImage: ImageDescriptor,
        override val chapters: SerialFields.Chapters?,
        override val otherNames: SerialFields.OtherNames?,
        override val sortName: String?,
        override val otherIds: SerialFields.OtherIds?,
        override val colors: SerialFields.Colors?,
        override val pages: SerialFields.Pages?,
        override val metadata: SerialFields.Metadata?,
        override val resolvedAtEpochMs: Long,
        override val server: ServerActiveInfo,
        // Never part of the JSON persisted in Cache — see PageDigest.Success.cache's own doc.
        @Transient override val cache: CacheDescriptor? = null,
    ) : SerialDigest,
        SerialFields

    @Serializable
    data class Failure(
        val error: ErrorDigest,
    ) : SerialDigest
}

private fun PluginSeriesMetadata.toDigestMetadata(external: ExternalMetadataDigest?) =
    SerialFields.Metadata(
        description = description,
        genres = genres,
        tags = tags,
        publicationStatus = publicationStatus,
        ageRating = ageRating,
        releaseYear = releaseYear,
        language = language,
        external = external,
    )

// Optional composition inputs — grouped into one object per the project's "2+ fields → one
// named object" convention, since server/seriesId already made buildSerialDigest's signature
// crowded once external-metadata sync was added.
//
// [includeExternalMetadata] is the ONLY switch that decides whether buildSerialDigest even calls
// buildExternalMetadataDigest at all — "I don't want this data for this call" (e.g. the Reader
// screen, where it's irrelevant and would just slow the response down). This is a different
// decision from "is any ExternalMetadataServer group configured" — that's discovered INSIDE
// buildExternalMetadataDigest (via groups.list()), never signaled by passing null here.
// [externalMetadataServer] is always the real Hilt-injected instance when includeExternalMetadata
// is true — required (not nullable) at that point since there's no other way to ask it anything.
// [externalMetadataGroupId] is only ever a specific override (e.g. a config screen testing one
// exact group) — when null (the common case), resolution falls back to Kavita's own
// serverInfo.groupId (already known from server.serial(seriesId).get(), no separate lookup).
data class SerialDigestOptions(
    val full: Boolean = false,
    val includeExternalMetadata: Boolean = false,
    val externalMetadataServer: ExternalMetadataServer? = null,
    val externalMetadataGroupId: String? = null,
)

// internal (not private): buildSerialsDigest (same package, SerialsDigest.kt) merges list rows
// into these very same per-series cache entries, so it needs the domain/variant/key/TTL that
// buildSerialDigest's own default read uses — sharing the constants is what keeps a list refresh
// and a later single-series mount pointed at one entry.
internal const val SERIAL_CACHE_DOMAIN = "serial"
internal const val SERIAL_CACHE_VARIANT = "full:external"

// The key buildSerialsDigest writes: the same one buildSerialDigest(id) reads with its default
// options (full=false, includeExternalMetadata=false).
internal fun serialsListCacheKey(seriesId: String) = serialDigestCacheKey(seriesId, SerialDigestOptions())

// Whether the newest per-series cache entry a buildSerialsDigest run touched is old enough to
// warrant a background refresh. null (nothing cached / empty list) is treated as stale so the
// first-ever load still schedules a refresh. Uses the Cache module's own default TTL — the same
// one buildSerialDigest's writes carry (it never overrides ttlMs on put()).
internal fun isSerialCacheStale(lastUpdatedEpochMs: Long?): Boolean {
    if (lastUpdatedEpochMs == null) return true
    return System.currentTimeMillis() - lastUpdatedEpochMs >= SERIAL_CACHE_TTL_MS
}

// 15 min — Cache.persistent.put()'s DEFAULT_TTL_MS (that module keeps it internal, so it's
// restated here with the same value and reasoning; buildSerialDigest relies on that same default
// by never passing ttlMs).
private const val SERIAL_CACHE_TTL_MS = 15 * 60 * 1000L

private val serialDigestJson = Json { ignoreUnknownKeys = true }
private val serialDigestBackgroundScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

private fun serialDigestCacheKey(
    seriesId: String,
    options: SerialDigestOptions,
) = "$seriesId:${options.full}:${options.includeExternalMetadata}"

private fun CacheEntry.toSerialCacheDescriptor(key: String) =
    CacheDescriptor(
        key = key,
        variant = "full:external",
        domain = SERIAL_CACHE_DOMAIN,
        mode = CacheMode.PERSISTENT,
        cachedAtEpochMs = cachedAtEpochMs,
        expiresAtEpochMs = cachedAtEpochMs + ttlMs,
    )

/**
 * Cache-first entry point — same shape as [buildPageDigest]/[buildChapterDigest]. `key` includes
 * both `options.full` and `options.includeExternalMetadata` (`variant = "full:external"`) since
 * either one changes the payload shape — a `full=true` cache entry is never confused with a
 * `full=false` one, same for includeExternalMetadata.
 *
 * `force` propagates all the way down: a forced Series refresh forces every chapter it builds
 * (via [buildChaptersBlock]), which in turn forces every page each of those chapters builds —
 * a manual "refresh everything" action from the Series level should never leave a stale Chapter
 * or Page underneath a freshly-refreshed Series.
 */
suspend fun buildSerialDigest(
    server: Server,
    seriesId: String,
    cache: Cache,
    options: SerialDigestOptions = SerialDigestOptions(),
    force: Boolean = false,
): SerialDigest {
    val key = serialDigestCacheKey(seriesId, options)

    if (!force) {
        val cached = cache.persistent.get(key, variant = "full:external")
        if (cached != null) {
            val digest =
                serialDigestJson
                    .decodeFromString<SerialDigest.Success>(cached.value)
                    .copy(cache = cached.toSerialCacheDescriptor(key))
            // An entry seeded ONLY by the list route (buildSerialsDigest — the splash / Library
            // batch) carries chapters == null: it never ran serial(id).chapters.list(). Serving
            // that to the SerieScreen renders an empty chapter list until the user pulls to
            // refresh. It's a fresh cache hit, so isExpired is false and nothing would refresh it
            // — so treat "no chapters block" as a miss: DON'T return here, fall through to the
            // synchronous fetch below (which also rewrites the cache, making a later mount a
            // complete hit). `full=true`'s own richer per-page shape is a separate variant here.
            // Enrichment that hadn't arrived yet when this entry was written is provisional in
            // exactly the same way: the fetch it was waiting on has long since finished into the
            // enrichment cache, but serving this entry would keep reporting "still fetching"
            // forever, since nothing here would ever re-ask. Observed on device as one series
            // stuck on the amber banner, which only a pull-to-refresh (force, which skips this
            // cache) could clear.
            val enrichmentPending =
                (digest.metadata?.external as? ExternalMetadataDigest.Failure)?.error?.code == PENDING_ERROR_CODE
            val incomplete = digest.chapters == null || enrichmentPending
            if (!incomplete) {
                if (cached.isExpired) {
                    serialDigestBackgroundScope.launch {
                        buildSerialDigest(server, seriesId, cache, options, force = true)
                    }
                }
                return digest
            }
        }
    }

    val fresh = fetchSerialDigest(server, seriesId, cache, options, force)
    if (fresh !is SerialDigest.Success) return fresh

    val descriptor =
        cache.persistent.put(
            key,
            serialDigestJson.encodeToString(SerialDigest.Success.serializer(), fresh),
            SERIAL_CACHE_DOMAIN,
            variant = "full:external",
        )
    return fresh.copy(cache = descriptor)
}

// Patches one chapter's readStatus in-place inside every cached variant of this series (full x
// includeExternalMetadata — 4 combinations), and recomputes chapters.readCount from the patched
// list, instead of invalidating and forcing a network re-fetch — same rationale as
// patchChapterReadStatus (ChapterDigest.kt), which this calls first so a lone getChapterDigest
// read (no Series in the loop) sees the same status.
//
// Deliberately partial: chapters.resumePoint is NOT recomputed here (it requires the same
// prev/next-in-reading-order decision buildSerialDigest's assembly makes from the full server
// response — out of scope for a local patch). A stale resumePoint self-heals on the next network
// fetch (TTL expiry or force=true), same as before this patch existed.
suspend fun patchSerialChapterReadStatus(
    cache: Cache,
    seriesId: String,
    chapterId: String,
    readStatus: ChapterFields.ReadStatus,
) {
    patchChapterReadStatus(cache, chapterId, readStatus)

    for (full in listOf(true, false)) {
        for (includeExternalMetadata in listOf(true, false)) {
            val key = serialDigestCacheKey(seriesId, SerialDigestOptions(full = full, includeExternalMetadata = includeExternalMetadata))
            val cached = cache.persistent.get(key, variant = SERIAL_CACHE_VARIANT) ?: continue
            val digest = runCatching { serialDigestJson.decodeFromString<SerialDigest.Success>(cached.value) }.getOrNull() ?: continue
            val chapters = digest.chapters ?: continue
            var changed = false
            val patchedList =
                chapters.list.map { chapter ->
                    if (chapter is ChapterDigest.Success && chapter.id == chapterId && chapter.readStatus != readStatus) {
                        changed = true
                        chapter.copy(readStatus = readStatus)
                    } else {
                        chapter
                    }
                }
            if (!changed) continue
            val patchedReadCount = patchedList.count { it is ChapterDigest.Success && it.readStatus == ChapterFields.ReadStatus.READ }
            val patched = digest.copy(chapters = chapters.copy(list = patchedList, readCount = patchedReadCount))
            cache.persistent.put(
                key,
                serialDigestJson.encodeToString(SerialDigest.Success.serializer(), patched),
                SERIAL_CACHE_DOMAIN,
                variant = SERIAL_CACHE_VARIANT,
            )
        }
    }
}

// Assembly order (R11): serial.get() first — vital, its failure makes the whole result a
// Failure. getCoverImage() second — never fails on its own (no network call), but only sets
// server/resolvedAtEpochMs when get() left them unset (mirrors buildChapterDigest's own
// knownChapter idiom — see there for why). getMetadata()/chapters.list()/the external-metadata
// sync are all tolerated failures (Aggregating / Necessary per the design notes) — caught, the
// corresponding field stays null, doesn't escalate, and doesn't touch server/resolvedAtEpochMs
// (those only reflect THIS Series' own get()/getCoverImage() calls, never metadata's,
// chapters'', or the external sync's).
private suspend fun fetchSerialDigest(
    server: Server,
    seriesId: String,
    cache: Cache,
    options: SerialDigestOptions,
    force: Boolean,
): SerialDigest {
    val full = options.full
    var serverInfo: ServerActiveInfo? = null
    var resolvedAtEpochMs: Long? = null

    // DIAGNOSTIC (serial page latency) — kept commented, not deleted: it is what attributed the
    // slow serial page to a specific leg instead of a guess, and it is the first thing to re-enable
    // if that timing regresses. What it measured, on device:
    //   - the per-chapter digest dominated a long series (2.5s of a 4s build), which is why
    //     full=false now builds the list straight from chapters.list()
    //   - enrichment then became the visible cost, which is why it is capped, cached and limited
    //   - the three remaining legs were sequential, which is why they now run together
    // Re-enable by uncommenting these four marks and the Log.i below.
    // val tStart = System.currentTimeMillis()

    val plugin: SerialData
    val coverImage: ImageDescriptor
    try {
        val serialResponse = server.serial(seriesId).get()
        serverInfo = serialResponse.serverInfo
        resolvedAtEpochMs = serialResponse.resolvedAtEpochMs
        plugin = serialResponse.data
        // Server already normalized the raw cover URL into a full ImageDescriptor on the same
        // serial.get() call (SerialData.coverImage) — no separate getCoverImage() round trip.
        // Its server/resolvedAtEpochMs are this same get()'s, so R11's "last successful call
        // wins" is already satisfied without a second call.
        coverImage = plugin.coverImage
    } catch (e: Exception) {
        return SerialDigest.Failure(e.toErrorDigest())
    }

    // val tSerial = System.currentTimeMillis()

    // The three remaining legs are independent of each other — enrichment asks another server
    // entirely, and metadata and the chapter list are separate Kavita endpoints that only needed
    // the series call above. Running them concurrently makes this build cost about as much as its
    // slowest leg instead of the sum of all three.
    val parallel =
        coroutineScope {
            val externalDeferred =
                async {
                    if (options.includeExternalMetadata) {
                        buildExternalMetadataDigest(
                            externalMetadataServer =
                                requireNotNull(options.externalMetadataServer) {
                                    "includeExternalMetadata=true requires a non-null externalMetadataServer"
                                },
                            groupId = options.externalMetadataGroupId,
                            kavitaServerGroupId = serverInfo.groupId,
                            // providerId comes from the same serverInfo this digest was resolved
                            // against — the series id and the provider it belongs to always
                            // travel together.
                            series = ExternalMetadataSeriesRef(id = plugin.id, providerId = serverInfo.providerId, name = plugin.name),
                            force = force,
                        )
                    } else {
                        null
                    }
                }

            val rawMetadataDeferred =
                async {
                    runCatching {
                        server
                            .serial(seriesId)
                            .getMetadata()
                            .data
                    }.getOrNull()
                }

            val chaptersDeferred =
                async {
                    runCatching {
                        val rawChapters =
                            server
                                .serial(seriesId)
                                .chapters
                                .list()
                                .data
                        // full=false is the chapter LIST (the serial page): it renders a title, a
                        // number and a read status, all of which chapters.list() already carries,
                        // so it skips the per-chapter digest entirely. full=true is the reader's
                        // own request, which does need every chapter's pages and neighbours.
                        if (full) {
                            buildChaptersBlock(server, seriesId, cache, rawChapters, full, force)
                        } else {
                            buildLightChaptersBlock(server, seriesId, rawChapters)
                        }
                    }.getOrNull()
                }

            Triple(externalDeferred.await(), rawMetadataDeferred.await(), chaptersDeferred.await())
        }

    val externalMetadata: ExternalMetadataDigest? = parallel.first
    val metadata: SerialFields.Metadata? = parallel.second?.toDigestMetadata(externalMetadata)
    val chapters: SerialFields.Chapters? = parallel.third

    // val tChapters = System.currentTimeMillis()
    // Log.i(
    //     "MMR-DIAG",
    //     "serialDigest $seriesId force=$force total=${tChapters - tStart}ms " +
    //         "serial=${tSerial - tStart} parallel=${tChapters - tSerial} (${chapters?.list?.size ?: 0} chapters)",
    // )

    return SerialDigest.Success(
        id = plugin.id,
        name = plugin.name,
        library = plugin.libraryId?.let { SerialFields.Library(id = it, name = plugin.libraryName) },
        lastUpdatesUTC =
            SerialFields.LastUpdatesUTC(
                series = parseIsoUtcToEpochMs(plugin.lastFolderScannedUtc),
                chapterAdded = parseIsoUtcToEpochMs(plugin.lastChapterAddedUtc),
                readDate = parseIsoUtcToEpochMs(plugin.latestReadDateUtc),
            ),
        coverImage = coverImage,
        chapters = chapters,
        otherNames = SerialFields.OtherNames(original = plugin.originalName, localized = plugin.localizedName),
        sortName = plugin.sortName,
        otherIds = SerialFields.OtherIds(aniListId = plugin.aniListId, malId = plugin.malId),
        colors = SerialFields.Colors(primary = plugin.primaryColor, secondary = plugin.secondaryColor),
        pages = SerialFields.Pages(read = plugin.pagesRead, total = plugin.totalPages),
        metadata = metadata,
        resolvedAtEpochMs = resolvedAtEpochMs!!,
        server = serverInfo!!,
        cache = null,
    )
}

// Builds chapters.list: sorts by decimalNumber (ascending — this is what lets a special/extra
// chapter like 1.5 land in the right place without any special-cased logic), builds every
// ChapterDigest in parallel (passing each chapter's own PluginChapter as knownChapter, since
// Series already fetched it via chapters.list() — see buildChapterDigest's own completeness
// check for why this may or may not actually skip a redundant chapter.get()), then makes a
// second pass to inject each chapter's real `number` (1-indexed position in this sorted list —
// supersedes the decimalNumber-truncated fallback buildChapterDigest used when built in
// isolation) and prevChapter/nextChapter (from the already-built neighbors, converted to
// ChapterNeighborDigest — no additional network calls).
// Builds the chapter block WITHOUT going through buildChapterDigest per chapter.
//
// Why this exists: buildChapterDigest reads and writes Room for every chapter it builds, so a
// series with 900 chapters paid ~1800 database round trips before the screen could render — and
// measured on device, that was the bulk of the whole serial digest (2.5s of a 4s build). The
// chapter list only renders a title, a number and a read status, and every one of those already
// arrives in chapters.list()'s own response; the heavy per-chapter digest is what the READER
// needs, and it asks for it one chapter at a time when a chapter is actually opened.
//
// The result is the same SerialFields.Chapters shape, so nothing downstream changes: what is
// missing from each entry is the per-chapter pages block and the prev/next neighbors, neither of
// which any list row reads (the reader builds its own, with full=true).
private suspend fun buildLightChaptersBlock(
    server: Server,
    seriesId: String,
    rawChapters: List<PluginChapter>,
): SerialFields.Chapters {
    val sorted = rawChapters.sortedBy { it.decimalNumber ?: Double.MAX_VALUE }

    val list =
        sorted.mapIndexed { index, raw ->
            // No network: :server assembles a chapter's cover URL locally (see its README), so
            // this stays a local call even inside a long loop.
            val coverImage = server.serial(seriesId).chapter(raw.id).getCoverImage()
            ChapterDigest.Success(
                id = raw.id,
                seriesId = seriesId,
                decimalNumber = raw.decimalNumber,
                // 1-indexed position in this sorted list — the same value buildChaptersBlock's
                // own second pass assigns on the full path, and something only the series can
                // resolve (buildChapterDigest, seeing one chapter in isolation, cannot).
                number = index + 1,
                // A label only means anything on a chapter that is actually special — same
                // condition buildChapterDigest applies.
                specialLabel = raw.specialLabel.takeIf { raw.isSpecial == true },
                isSpecial = raw.isSpecial,
                title = raw.title,
                createdUtc = raw.createdUtc,
                coverImage = coverImage,
                readStatus = readStatusOf(raw),
                // Page-level detail deliberately unfetched — exactly the "full=false" shape
                // ChapterFields.Pages already documents: status/total/dimensions null means "not
                // checked", never "zero pages". count/readCount are carried anyway because
                // chapters.list() hands them over for free.
                pages =
                    ChapterFields.Pages(
                        fileFormat = raw.fileFormat,
                        status = null,
                        count = raw.pageCount,
                        readCount = raw.pagesRead,
                        total = null,
                        totalWidthPx = null,
                        totalHeightPx = null,
                        resumePoint = null,
                        list = emptyList(),
                    ),
                prevChapter = null,
                nextChapter = null,
                resolvedAtEpochMs = coverImage.resolvedAtEpochMs,
                server = coverImage.server,
            )
        }

    val readCount = if (list.isNotEmpty()) list.count { it.readStatus == ChapterFields.ReadStatus.READ } else null

    return SerialFields.Chapters(
        status = SerialFields.ChaptersStatus.SUCCESS,
        readCount = readCount,
        total = list.size,
        resumePoint = buildResumePoint(list),
        list = list,
    )
}

// Same derivation buildChapterDigest uses — both read it off the very same chapters.list()
// fields, so a chapter's status never depends on which path built it.
private fun readStatusOf(raw: PluginChapter): ChapterFields.ReadStatus {
    val count = raw.pageCount
    val readCount = raw.pagesRead
    return when {
        count == null || readCount == null -> ChapterFields.ReadStatus.UNREAD
        readCount == 0 -> ChapterFields.ReadStatus.UNREAD
        readCount >= count -> ChapterFields.ReadStatus.READ
        else -> ChapterFields.ReadStatus.IN_PROGRESS
    }
}

private suspend fun buildChaptersBlock(
    server: Server,
    seriesId: String,
    cache: Cache,
    rawChapters: List<PluginChapter>,
    full: Boolean,
    force: Boolean,
): SerialFields.Chapters {
    val sorted = rawChapters.sortedBy { it.decimalNumber ?: Double.MAX_VALUE }

    val digests =
        coroutineScope {
            sorted
                .map { raw ->
                    async { buildChapterDigest(server, seriesId, raw.id, cache, knownChapter = raw, full = full, force = force) }
                }.map { it.await() }
        }

    // Two passes on purpose: `number` (1-indexed position in this sorted list) must already be
    // final on every entry BEFORE building any neighbor — otherwise a neighbor's own `number`
    // would still carry buildChapterDigest's isolated-call fallback (decimalNumber truncated, or
    // null), not the real sequential position Series alone can resolve.
    val withNumber =
        digests.mapIndexed { index, digest ->
            if (digest is ChapterDigest.Success) digest.copy(number = index + 1) else digest
        }
    val withNeighborsAndNumber =
        withNumber.mapIndexed { index, digest ->
            if (digest !is ChapterDigest.Success) return@mapIndexed digest
            val prev = withNumber.getOrNull(index - 1)?.toNeighborDigest()
            val next = withNumber.getOrNull(index + 1)?.toNeighborDigest()
            digest.copy(prevChapter = prev, nextChapter = next)
        }

    val status =
        when {
            withNeighborsAndNumber.all { it is ChapterDigest.Success } -> SerialFields.ChaptersStatus.SUCCESS
            withNeighborsAndNumber.all { it is ChapterDigest.Failure } -> SerialFields.ChaptersStatus.ERROR
            else -> SerialFields.ChaptersStatus.PARTIAL
        }

    val successfulChapters = withNeighborsAndNumber.filterIsInstance<ChapterDigest.Success>()
    // null only for a genuinely empty chapters.list (a "coming soon" series — nothing to report
    // progress on at all) — not the same as 0, which asserts "series has chapters and none are
    // read." No server-side chapter-count-based progress field exists on SeriesDto (only
    // page-granularity pages/pagesRead) — this is derived by counting list, per the design notes.
    val readCount =
        if (withNeighborsAndNumber.isNotEmpty()) {
            successfulChapters.count {
                it.readStatus == ChapterFields.ReadStatus.READ
            }
        } else {
            null
        }

    return SerialFields.Chapters(
        status = status,
        readCount = readCount,
        total = withNeighborsAndNumber.size,
        resumePoint = buildResumePoint(withNeighborsAndNumber),
        list = withNeighborsAndNumber,
    )
}

// 2-level cascade: first IN_PROGRESS chapter in order → else first UNREAD chapter in order →
// else null (every chapter is READ — a "reread" state, nothing left to resume).
private fun buildResumePoint(list: List<ChapterDigest>): SerialFields.ResumePoint? {
    val inProgressIndex = list.indexOfFirst { it is ChapterDigest.Success && it.readStatus == ChapterFields.ReadStatus.IN_PROGRESS }
    val unreadIndex = list.indexOfFirst { it is ChapterDigest.Success && it.readStatus == ChapterFields.ReadStatus.UNREAD }

    val (index, status) =
        when {
            inProgressIndex != -1 -> inProgressIndex to SerialFields.ResumePointStatus.IN_PROGRESS
            unreadIndex != -1 -> unreadIndex to SerialFields.ResumePointStatus.UNREAD
            else -> return null
        }

    val chapter = list[index] as ChapterDigest.Success
    return SerialFields.ResumePoint(
        stoppedAtChapterId = chapter.id,
        stoppedAtChapterIndex = index,
        status = status,
        recordedAtEpochMs = chapter.pages.resumePoint?.recordedAtEpochMs,
    )
}

private fun ChapterDigest.toNeighborDigest(): ChapterNeighborDigest =
    when (this) {
        is ChapterDigest.Failure -> ChapterNeighborDigest.Failure(error)
        is ChapterDigest.Success ->
            ChapterNeighborDigest.Success(
                id = id,
                seriesId = seriesId,
                decimalNumber = decimalNumber,
                number = number,
                specialLabel = specialLabel,
                isSpecial = isSpecial,
                title = title,
                createdUtc = createdUtc,
                coverImage = coverImage,
                readStatus = readStatus,
                pages = pages,
                resolvedAtEpochMs = resolvedAtEpochMs,
                server = server,
                cache = cache,
            )
    }
