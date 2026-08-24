package com.mymangareader.contentdigest.chapter

import com.mymangareader.contentdigest.error.ErrorDigest
import com.mymangareader.contentdigest.error.toErrorDigest
import com.mymangareader.contentdigest.page.ChapterSummary
import com.mymangareader.contentdigest.page.PageDigest
import com.mymangareader.contentdigest.page.buildPageDigest
import com.mymangareader.server.ImageDescriptor
import com.mymangareader.server.Server
import com.mymangareader.server.ServerActiveInfo
import com.mymangareader.server.plugins.PluginChapter
import com.mymangareader.tools.datetime.parseIsoUtcToEpochMs
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

// Fields shared between ChapterDigest.Success and ChapterNeighborDigest.Success — everything
// except prevChapter/nextChapter (the only fields causing unbounded recursion, see
// ChapterNeighborDigest below). Both sealed hierarchies implement this instead of duplicating
// every field declaration.
interface ChapterFields {
    val id: String
    val seriesId: String
    val decimalNumber: Double?     // maps Kavita's real SortOrder — authoritative numeric value when present
    val number: Int?               // decimalNumber truncated, only when it's a whole number — otherwise null this task (Series, Task 020, may fill it later)
    val specialLabel: String?      // = PluginChapter.specialLabel, only when isSpecial == true — otherwise null
    val isSpecial: Boolean?
    val title: String
    val createdUtc: String?
    val coverImage: ImageDescriptor
    val readStatus: ReadStatus
    val pages: Pages
    val resolvedAtEpochMs: Long    // R11 — only reflects the Chapter's OWN calls (get/getProgress), never pages.list's
    val server: ServerActiveInfo
    val cache: Nothing?            // always null this task — no Cache module exists yet (Task 015)

    enum class ReadStatus { READ, IN_PROGRESS, UNREAD }
    enum class PagesStatus { SUCCESS, PARTIAL, ERROR }

    data class Pages(
        val fileFormat: String?,
        val status: PagesStatus?,       // null when list wasn't fetched (full=false) — "not checked," never a value derived from an empty list
        val count: Int?,
        val readCount: Int?,
        val total: Int?,                 // derived from list.size when full=true — null when list wasn't fetched (full=false); never falls back to `count`, which is a different (server-declared, not cross-checked) value
        val totalWidthPx: Int?,         // Σ width across list — null unless every page succeeded AND has usable dimensions (also null whenever list wasn't fetched)
        val totalHeightPx: Int?,        // Σ height across list — same condition
        val resumePoint: ResumePoint?,  // independent of full — comes from getProgress()/lastReadingProgressUtc, not pages.list
        val list: List<PageDigest>,     // empty when full=false — not fetched, not "zero pages" (see status/total, both null in that case, for how to tell the difference)
    )

    data class ResumePoint(
        val stoppedAtPageIndex: Int?,
        val recordedAtEpochMs: Long?,
    )
}

sealed interface ChapterDigest {
    data class Success(
        override val id: String,
        override val seriesId: String,
        override val decimalNumber: Double?,
        override val number: Int?,
        override val specialLabel: String?,
        override val isSpecial: Boolean?,
        override val title: String,
        override val createdUtc: String?,
        override val coverImage: ImageDescriptor,
        override val readStatus: ChapterFields.ReadStatus,
        override val pages: ChapterFields.Pages,
        val prevChapter: ChapterNeighborDigest?,   // filled by Series (Task 020, optional param), null if no neighbor or Series didn't provide one
        val nextChapter: ChapterNeighborDigest?,
        override val resolvedAtEpochMs: Long,
        override val server: ServerActiveInfo,
        override val cache: Nothing?,
    ) : ChapterDigest, ChapterFields

    data class Failure(val error: ErrorDigest) : ChapterDigest
}

// Excludes only prevChapter/nextChapter — the only fields causing unbounded recursion. `pages`
// (full list included) is intentionally kept, even though it makes the neighbor payload larger —
// mirrors how the Reader already fetches a neighbor's full page data today.
sealed interface ChapterNeighborDigest {
    data class Success(
        override val id: String,
        override val seriesId: String,
        override val decimalNumber: Double?,
        override val number: Int?,
        override val specialLabel: String?,
        override val isSpecial: Boolean?,
        override val title: String,
        override val createdUtc: String?,
        override val coverImage: ImageDescriptor,
        override val readStatus: ChapterFields.ReadStatus,
        override val pages: ChapterFields.Pages,
        override val resolvedAtEpochMs: Long,
        override val server: ServerActiveInfo,
        override val cache: Nothing?,
    ) : ChapterNeighborDigest, ChapterFields

    data class Failure(val error: ErrorDigest) : ChapterNeighborDigest
}

// A PluginChapter Series already fetched (from its own chapters.list() call) — used to skip a
// redundant chapter.get() call, but ONLY when it's genuinely complete for what buildChapterDigest
// itself needs. This is a completeness check, not a fallback/merge: if even one field
// buildChapterDigest reads is missing, the passed-in value is discarded entirely and get() runs
// from scratch — never a partial merge between the two sources.
internal fun PluginChapter.isCompleteForChapterDigest(): Boolean =
    decimalNumber != null && specialLabel != null && isSpecial != null && createdUtc != null &&
        lastReadingProgressUtc != null && fileFormat != null && pageCount != null && pagesRead != null

// Assembly order (R11): chapter.get() first (unless skipped — see isCompleteForChapterDigest
// above) — vital when it does run, its failure makes the whole result a Failure. getProgress()
// second — tolerated failure (caught, resumePoint stays null, doesn't escalate). server/
// resolvedAtEpochMs are overwritten after each call that actually succeeds — they end up
// reflecting whichever of THIS chapter's own calls succeeded last; pages.list's own per-page
// calls never touch these fields (each PageDigest carries its own server/resolvedAtEpochMs). If
// get() is skipped, server/resolvedAtEpochMs simply have no value yet until the next call
// (getCoverImage, which always runs) sets them — same idiom PageDigest already uses.
suspend fun buildChapterDigest(
    server: Server,
    seriesId: String,
    chapterId: String,
    knownChapter: PluginChapter? = null,
    prevChapter: ChapterNeighborDigest? = null,
    nextChapter: ChapterNeighborDigest? = null,
    full: Boolean = false,
): ChapterDigest {
    var serverInfo: ServerActiveInfo? = null
    var resolvedAtEpochMs: Long? = null

    val summary: ChapterSummary
    val plugin: PluginChapter
    try {
        if (knownChapter != null && knownChapter.isCompleteForChapterDigest()) {
            plugin = knownChapter
        } else {
            val chapterResponse = server.serial(seriesId).chapter(chapterId).get()
            serverInfo = chapterResponse.serverInfo
            resolvedAtEpochMs = chapterResponse.resolvedAtEpochMs
            plugin = chapterResponse.data
        }

        val coverImage = server.serial(seriesId).chapter(chapterId).getCoverImage()
        // getCoverImage() never fails on its own (no network call — see :server's README), but
        // it only gets to set server/resolvedAtEpochMs when get() didn't already (i.e. get() was
        // skipped via knownChapter) — otherwise get()'s own envelope is the one R11 cares about
        // at this point, same as before knownChapter existed.
        if (serverInfo == null) {
            serverInfo = coverImage.server
            resolvedAtEpochMs = coverImage.resolvedAtEpochMs
        }

        val number = plugin.decimalNumber?.let { decimal ->
            val whole = decimal.toInt()
            if (whole.toDouble() == decimal) whole else null
        }

        summary = ChapterSummary(
            id = plugin.id,
            seriesId = seriesId,
            decimalNumber = plugin.decimalNumber,
            number = number,
            specialLabel = plugin.specialLabel.takeIf { plugin.isSpecial == true },
            isSpecial = plugin.isSpecial,
            title = plugin.title,
            createdUtc = plugin.createdUtc,
            coverImage = coverImage,
            resolvedAtEpochMs = resolvedAtEpochMs!!,
            server = serverInfo!!,
        )
    } catch (e: Exception) {
        return ChapterDigest.Failure(e.toErrorDigest())
    }

    var stoppedAtPageIndex: Int? = null
    var recordedAtEpochMs: Long? = null
    try {
        val progressResponse = server.serial(seriesId).chapter(chapterId).getProgress()
        serverInfo = progressResponse.serverInfo
        resolvedAtEpochMs = progressResponse.resolvedAtEpochMs
        stoppedAtPageIndex = progressResponse.data?.pageIndex
    } catch (e: Exception) {
        // Tolerated — resumePoint's stoppedAtPageIndex stays null, server/resolvedAtEpochMs keep
        // whatever chapter.get() set.
    }

    recordedAtEpochMs = parseIsoUtcToEpochMs(plugin.lastReadingProgressUtc)

    // full=false (the default) skips every per-page network call entirely — not just trims the
    // resulting payload. A caller only listing chapters (e.g. SeriesDigest today) doesn't pay for
    // pages.list's URL/dimensions round-trips at all unless it explicitly asks for full=true.
    val list = if (full) {
        coroutineScope {
            (0 until (plugin.pageCount ?: 0)).map { pageIndex -> async { buildPageDigest(server, summary, pageIndex) } }
                .map { it.await() }
        }
    } else {
        emptyList()
    }

    val pagesStatus = if (!full) {
        null
    } else {
        when {
            list.all { it is PageDigest.Success } -> ChapterFields.PagesStatus.SUCCESS
            list.all { it is PageDigest.Failure } -> ChapterFields.PagesStatus.ERROR
            else -> ChapterFields.PagesStatus.PARTIAL
        }
    }

    val count = plugin.pageCount
    val readCount = plugin.pagesRead
    val readStatus = when {
        count == null || readCount == null -> ChapterFields.ReadStatus.UNREAD
        readCount == 0 -> ChapterFields.ReadStatus.UNREAD
        readCount >= count -> ChapterFields.ReadStatus.READ
        else -> ChapterFields.ReadStatus.IN_PROGRESS
    }

    val resumePoint = if (stoppedAtPageIndex != null || recordedAtEpochMs != null) {
        ChapterFields.ResumePoint(stoppedAtPageIndex = stoppedAtPageIndex, recordedAtEpochMs = recordedAtEpochMs)
    } else {
        null
    }

    // Only summed when every page succeeded AND every page actually has usable dimensions — a
    // single missing/zero dimension makes the total meaningless, so both stay null rather than
    // silently under-counting.
    val successfulPages = list.filterIsInstance<PageDigest.Success>()
    val allDimensionsUsable = list.isNotEmpty() &&
        successfulPages.size == list.size &&
        successfulPages.all { it.hasFetchedDimensions }
    val totalWidthPx = if (allDimensionsUsable) successfulPages.sumOf { it.width ?: 0 } else null
    val totalHeightPx = if (allDimensionsUsable) successfulPages.sumOf { it.height ?: 0 } else null

    return ChapterDigest.Success(
        id = summary.id,
        seriesId = summary.seriesId,
        decimalNumber = summary.decimalNumber,
        number = summary.number,
        specialLabel = summary.specialLabel,
        isSpecial = summary.isSpecial,
        title = summary.title,
        createdUtc = summary.createdUtc,
        coverImage = summary.coverImage,
        readStatus = readStatus,
        pages = ChapterFields.Pages(
            fileFormat = plugin.fileFormat,
            status = pagesStatus,
            count = count,
            readCount = readCount,
            total = if (full) list.size else null,
            totalWidthPx = totalWidthPx,
            totalHeightPx = totalHeightPx,
            resumePoint = resumePoint,
            list = list,
        ),
        prevChapter = prevChapter,
        nextChapter = nextChapter,
        resolvedAtEpochMs = resolvedAtEpochMs,
        server = serverInfo,
        cache = null,
    )
}
