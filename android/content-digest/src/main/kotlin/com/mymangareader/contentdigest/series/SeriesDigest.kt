package com.mymangareader.contentdigest.series

import com.mymangareader.cache.Cache
import com.mymangareader.cache.CacheDescriptor
import com.mymangareader.cache.CacheEntry
import com.mymangareader.cache.CacheMode
import com.mymangareader.contentdigest.chapter.ChapterDigest
import com.mymangareader.contentdigest.chapter.ChapterFields
import com.mymangareader.contentdigest.chapter.ChapterNeighborDigest
import com.mymangareader.contentdigest.chapter.buildChapterDigest
import com.mymangareader.contentdigest.error.ErrorDigest
import com.mymangareader.contentdigest.error.toErrorDigest
import com.mymangareader.externalmetadataserver.ExternalMetadataServer
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataSeriesRef
import com.mymangareader.server.ImageDescriptor
import com.mymangareader.server.Server
import com.mymangareader.server.ServerActiveInfo
import com.mymangareader.server.plugins.PluginAgeRating
import com.mymangareader.server.plugins.PluginChapter
import com.mymangareader.server.plugins.PluginGenreOrTag
import com.mymangareader.server.plugins.PluginSerial
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

interface SeriesFields {
    val id: String
    val name: String
    val library: Library?
    val lastUpdatesUTC: LastUpdatesUTC?
    val coverImage: ImageDescriptor
    val chapters: Chapters?            // Necessary — null only when the chapters.list() call itself failed; a real empty series is chapters.list=[] (a Chapters value with an empty list), not null
    val otherNames: OtherNames?
    val sortName: String?
    val otherIds: OtherIds?
    val colors: Colors?
    val metadata: Metadata?            // Aggregating — null on any getMetadata() failure, never escalates
    val resolvedAtEpochMs: Long        // R11 — only reflects this Series' OWN calls (get/getCoverImage), never chapters.list's or metadata's
    val server: ServerActiveInfo
    val cache: CacheDescriptor?        // null only until the first successful cache write completes

    @Serializable
    data class Library(val id: String, val name: String?)
    @Serializable
    data class LastUpdatesUTC(val series: Long?, val chapterAdded: Long?, val readDate: Long?)
    @Serializable
    data class OtherNames(val original: String?, val localized: String?)
    @Serializable
    data class OtherIds(val aniListId: Int?, val malId: Long?)
    @Serializable
    data class Colors(val primary: String?, val secondary: String?)

    @Serializable
    data class Metadata(
        val description: String?,
        val genres: List<PluginGenreOrTag>,
        val tags: List<PluginGenreOrTag>,
        val publicationStatus: String?,
        val ageRating: PluginAgeRating?,
        val releaseYear: Int?,
        val language: String?,
        val external: ExternalMetadataDigest?, // null when SeriesDigestOptions.includeExternalMetadata was false — SeriesDigest never even called buildExternalMetadataDigest; non-null (Success/Failure) once it did — see ExternalMetadataDigest's own doc
    )

    @Serializable
    enum class ChaptersStatus { SUCCESS, PARTIAL, ERROR }

    @Serializable
    data class Chapters(
        val status: ChaptersStatus,
        val readCount: Int?,    // count of chapters.list entries whose ChapterDigest.Success.readStatus == READ
        val total: Int,         // derived from list.size
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
        val recordedAtEpochMs: Long?,   // duplicated from list[stoppedAtChapterIndex].pages.resumePoint.recordedAtEpochMs, for convenience
    )
}

@Serializable
sealed interface SeriesDigest {
    @Serializable
    data class Success(
        override val id: String,
        override val name: String,
        override val library: SeriesFields.Library?,
        override val lastUpdatesUTC: SeriesFields.LastUpdatesUTC?,
        override val coverImage: ImageDescriptor,
        override val chapters: SeriesFields.Chapters?,
        override val otherNames: SeriesFields.OtherNames?,
        override val sortName: String?,
        override val otherIds: SeriesFields.OtherIds?,
        override val colors: SeriesFields.Colors?,
        override val metadata: SeriesFields.Metadata?,
        override val resolvedAtEpochMs: Long,
        override val server: ServerActiveInfo,
        // Never part of the JSON persisted in Cache — see PageDigest.Success.cache's own doc.
        @Transient override val cache: CacheDescriptor? = null,
    ) : SeriesDigest, SeriesFields

    @Serializable
    data class Failure(val error: ErrorDigest) : SeriesDigest
}

private fun PluginSeriesMetadata.toDigestMetadata(external: ExternalMetadataDigest?) = SeriesFields.Metadata(
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
// named object" convention, since server/seriesId already made buildSeriesDigest's signature
// crowded once external-metadata sync was added.
//
// [includeExternalMetadata] is the ONLY switch that decides whether buildSeriesDigest even calls
// buildExternalMetadataDigest at all — "I don't want this data for this call" (e.g. the Reader
// screen, where it's irrelevant and would just slow the response down). This is a different
// decision from "is any ExternalMetadataServer group configured" — that's discovered INSIDE
// buildExternalMetadataDigest (via groups.list()), never signaled by passing null here.
// [externalMetadataServer] is always the real Hilt-injected instance when includeExternalMetadata
// is true — required (not nullable) at that point since there's no other way to ask it anything.
// [externalMetadataGroupId] is only ever a specific override (e.g. a config screen testing one
// exact group) — when null (the common case), resolution falls back to Kavita's own
// serverInfo.groupId (already known from server.serial(seriesId).get(), no separate lookup).
data class SeriesDigestOptions(
    val full: Boolean = false,
    val includeExternalMetadata: Boolean = false,
    val externalMetadataServer: ExternalMetadataServer? = null,
    val externalMetadataGroupId: String? = null,
)

private const val SERIES_CACHE_DOMAIN = "series"
private val seriesDigestJson = Json { ignoreUnknownKeys = true }
private val seriesDigestBackgroundScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

private fun seriesDigestCacheKey(seriesId: String, options: SeriesDigestOptions) =
    "$seriesId:${options.full}:${options.includeExternalMetadata}"

private fun CacheEntry.toSeriesCacheDescriptor(key: String) = CacheDescriptor(
    key = key,
    variant = "full:external",
    domain = SERIES_CACHE_DOMAIN,
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
suspend fun buildSeriesDigest(
    server: Server,
    seriesId: String,
    cache: Cache,
    options: SeriesDigestOptions = SeriesDigestOptions(),
    force: Boolean = false,
): SeriesDigest {
    val key = seriesDigestCacheKey(seriesId, options)

    if (!force) {
        val cached = cache.persistent.get(key, variant = "full:external")
        if (cached != null) {
            val digest = seriesDigestJson.decodeFromString<SeriesDigest.Success>(cached.value)
                .copy(cache = cached.toSeriesCacheDescriptor(key))
            if (cached.isExpired) {
                seriesDigestBackgroundScope.launch {
                    buildSeriesDigest(server, seriesId, cache, options, force = true)
                }
            }
            return digest
        }
    }

    val fresh = fetchSeriesDigest(server, seriesId, cache, options, force)
    if (fresh !is SeriesDigest.Success) return fresh

    val descriptor = cache.persistent.put(key, seriesDigestJson.encodeToString(SeriesDigest.Success.serializer(), fresh), SERIES_CACHE_DOMAIN, variant = "full:external")
    return fresh.copy(cache = descriptor)
}

// Assembly order (R11): serial.get() first — vital, its failure makes the whole result a
// Failure. getCoverImage() second — never fails on its own (no network call), but only sets
// server/resolvedAtEpochMs when get() left them unset (mirrors buildChapterDigest's own
// knownChapter idiom — see there for why). getMetadata()/chapters.list()/the external-metadata
// sync are all tolerated failures (Aggregating / Necessary per the design notes) — caught, the
// corresponding field stays null, doesn't escalate, and doesn't touch server/resolvedAtEpochMs
// (those only reflect THIS Series' own get()/getCoverImage() calls, never metadata's,
// chapters'', or the external sync's).
private suspend fun fetchSeriesDigest(
    server: Server,
    seriesId: String,
    cache: Cache,
    options: SeriesDigestOptions,
    force: Boolean,
): SeriesDigest {
    val full = options.full
    var serverInfo: ServerActiveInfo? = null
    var resolvedAtEpochMs: Long? = null

    val plugin: PluginSerial
    val coverImage: ImageDescriptor
    try {
        val serialResponse = server.serial(seriesId).get()
        serverInfo = serialResponse.serverInfo
        resolvedAtEpochMs = serialResponse.resolvedAtEpochMs
        plugin = serialResponse.data

        coverImage = server.serial(seriesId).getCoverImage()
        // Unlike buildChapterDigest (which has a knownChapter fast path that can skip its own
        // get() call), buildSeriesDigest always calls serial.get() for real above — there's no
        // "Series already had this" caller. So serverInfo is never null at this point, and
        // getCoverImage() (which never fails on its own) is unconditionally the last successful
        // call per R11.
        serverInfo = coverImage.server
        resolvedAtEpochMs = coverImage.resolvedAtEpochMs
    } catch (e: Exception) {
        return SeriesDigest.Failure(e.toErrorDigest())
    }

    val externalMetadata: ExternalMetadataDigest? = if (options.includeExternalMetadata) {
        buildExternalMetadataDigest(
            externalMetadataServer = requireNotNull(options.externalMetadataServer) {
                "includeExternalMetadata=true requires a non-null externalMetadataServer"
            },
            groupId = options.externalMetadataGroupId,
            kavitaServerGroupId = serverInfo.groupId,
            series = ExternalMetadataSeriesRef(id = plugin.id, name = plugin.name),
        )
    } else {
        null
    }

    val metadata: SeriesFields.Metadata? = try {
        server.serial(seriesId).getMetadata().data.toDigestMetadata(externalMetadata)
    } catch (e: Exception) {
        null
    }

    val chapters: SeriesFields.Chapters? = try {
        buildChaptersBlock(server, seriesId, cache, server.serial(seriesId).chapters.list().data, full, force)
    } catch (e: Exception) {
        null
    }

    return SeriesDigest.Success(
        id = plugin.id,
        name = plugin.name,
        library = plugin.libraryId?.let { SeriesFields.Library(id = it, name = plugin.libraryName) },
        lastUpdatesUTC = SeriesFields.LastUpdatesUTC(
            series = parseIsoUtcToEpochMs(plugin.lastFolderScannedUtc),
            chapterAdded = parseIsoUtcToEpochMs(plugin.lastChapterAddedUtc),
            readDate = parseIsoUtcToEpochMs(plugin.latestReadDateUtc),
        ),
        coverImage = coverImage,
        chapters = chapters,
        otherNames = SeriesFields.OtherNames(original = plugin.originalName, localized = plugin.localizedName),
        sortName = plugin.sortName,
        otherIds = SeriesFields.OtherIds(aniListId = plugin.aniListId, malId = plugin.malId),
        colors = SeriesFields.Colors(primary = plugin.primaryColor, secondary = plugin.secondaryColor),
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
private suspend fun buildChaptersBlock(
    server: Server,
    seriesId: String,
    cache: Cache,
    rawChapters: List<PluginChapter>,
    full: Boolean,
    force: Boolean,
): SeriesFields.Chapters {
    val sorted = rawChapters.sortedBy { it.decimalNumber ?: Double.MAX_VALUE }

    val digests = coroutineScope {
        sorted.map { raw -> async { buildChapterDigest(server, seriesId, raw.id, cache, knownChapter = raw, full = full, force = force) } }
            .map { it.await() }
    }

    // Two passes on purpose: `number` (1-indexed position in this sorted list) must already be
    // final on every entry BEFORE building any neighbor — otherwise a neighbor's own `number`
    // would still carry buildChapterDigest's isolated-call fallback (decimalNumber truncated, or
    // null), not the real sequential position Series alone can resolve.
    val withNumber = digests.mapIndexed { index, digest ->
        if (digest is ChapterDigest.Success) digest.copy(number = index + 1) else digest
    }
    val withNeighborsAndNumber = withNumber.mapIndexed { index, digest ->
        if (digest !is ChapterDigest.Success) return@mapIndexed digest
        val prev = withNumber.getOrNull(index - 1)?.toNeighborDigest()
        val next = withNumber.getOrNull(index + 1)?.toNeighborDigest()
        digest.copy(prevChapter = prev, nextChapter = next)
    }

    val status = when {
        withNeighborsAndNumber.all { it is ChapterDigest.Success } -> SeriesFields.ChaptersStatus.SUCCESS
        withNeighborsAndNumber.all { it is ChapterDigest.Failure } -> SeriesFields.ChaptersStatus.ERROR
        else -> SeriesFields.ChaptersStatus.PARTIAL
    }

    val successfulChapters = withNeighborsAndNumber.filterIsInstance<ChapterDigest.Success>()
    // null only for a genuinely empty chapters.list (a "coming soon" series — nothing to report
    // progress on at all) — not the same as 0, which asserts "series has chapters and none are
    // read." No server-side chapter-count-based progress field exists on SeriesDto (only
    // page-granularity pages/pagesRead) — this is derived by counting list, per the design notes.
    val readCount = if (withNeighborsAndNumber.isNotEmpty()) successfulChapters.count { it.readStatus == ChapterFields.ReadStatus.READ } else null

    return SeriesFields.Chapters(
        status = status,
        readCount = readCount,
        total = withNeighborsAndNumber.size,
        resumePoint = buildResumePoint(withNeighborsAndNumber),
        list = withNeighborsAndNumber,
    )
}

// 2-level cascade: first IN_PROGRESS chapter in order → else first UNREAD chapter in order →
// else null (every chapter is READ — a "reread" state, nothing left to resume).
private fun buildResumePoint(list: List<ChapterDigest>): SeriesFields.ResumePoint? {
    val inProgressIndex = list.indexOfFirst { it is ChapterDigest.Success && it.readStatus == ChapterFields.ReadStatus.IN_PROGRESS }
    val unreadIndex = list.indexOfFirst { it is ChapterDigest.Success && it.readStatus == ChapterFields.ReadStatus.UNREAD }

    val (index, status) = when {
        inProgressIndex != -1 -> inProgressIndex to SeriesFields.ResumePointStatus.IN_PROGRESS
        unreadIndex != -1 -> unreadIndex to SeriesFields.ResumePointStatus.UNREAD
        else -> return null
    }

    val chapter = list[index] as ChapterDigest.Success
    return SeriesFields.ResumePoint(
        stoppedAtChapterId = chapter.id,
        stoppedAtChapterIndex = index,
        status = status,
        recordedAtEpochMs = chapter.pages.resumePoint?.recordedAtEpochMs,
    )
}

private fun ChapterDigest.toNeighborDigest(): ChapterNeighborDigest = when (this) {
    is ChapterDigest.Failure -> ChapterNeighborDigest.Failure(error)
    is ChapterDigest.Success -> ChapterNeighborDigest.Success(
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
