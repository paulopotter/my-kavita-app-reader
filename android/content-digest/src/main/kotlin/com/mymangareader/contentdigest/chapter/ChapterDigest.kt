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
        val status: PagesStatus,
        val count: Int?,
        val readCount: Int?,
        val total: Int,                 // derived from list.size
        val totalWidthPx: Int?,         // Σ width across list — null unless every page succeeded AND has usable dimensions
        val totalHeightPx: Int?,        // Σ height across list — same condition
        val resumePoint: ResumePoint?,
        val list: List<PageDigest>,
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

// Assembly order (R11): chapter.get() first — vital, its failure makes the whole result a
// Failure. getProgress() second — tolerated failure (caught, resumePoint stays null, doesn't
// escalate). server/resolvedAtEpochMs are overwritten after each call that actually succeeds —
// they end up reflecting whichever of THIS chapter's own calls succeeded last; pages.list's own
// per-page calls never touch these fields (each PageDigest carries its own server/resolvedAtEpochMs).
suspend fun buildChapterDigest(
    server: Server,
    seriesId: String,
    chapterId: String,
    prevChapter: ChapterNeighborDigest? = null,
    nextChapter: ChapterNeighborDigest? = null,
): ChapterDigest {
    var serverInfo: ServerActiveInfo
    var resolvedAtEpochMs: Long

    val summary: ChapterSummary
    val plugin: PluginChapter
    try {
        val chapterResponse = server.serial(seriesId).chapter(chapterId).get()
        serverInfo = chapterResponse.serverInfo
        resolvedAtEpochMs = chapterResponse.resolvedAtEpochMs
        plugin = chapterResponse.data

        val coverImage = server.serial(seriesId).chapter(chapterId).getCoverImage()

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
            resolvedAtEpochMs = resolvedAtEpochMs,
            server = serverInfo,
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

    val list = coroutineScope {
        (0 until (plugin.pageCount ?: 0)).map { pageIndex -> async { buildPageDigest(server, summary, pageIndex) } }
            .map { it.await() }
    }

    val pagesStatus = when {
        list.all { it is PageDigest.Success } -> ChapterFields.PagesStatus.SUCCESS
        list.all { it is PageDigest.Failure } -> ChapterFields.PagesStatus.ERROR
        else -> ChapterFields.PagesStatus.PARTIAL
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
            total = list.size,
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
