package com.mymangareader.contentdigest.page

import com.mymangareader.server.Server
import com.mymangareader.server.ServerActiveInfo

// Page IS an image (mirrors the TS spec's ImageDescriptor fields flattened, per Task 009's
// PageContract extends ImageDescriptor) — no separate PageResult wrapper type (unlike the
// modeling-phase TS spec's `{isSuccess} & Contract` union): the sealed hierarchy itself already
// is the discriminated result, same idiom as the existing OtaCheckResult (:tools).
sealed interface PageDigest {
    data class Success(
        val id: String,                     // synthetic "chapterId:pageIndex" — Kavita has no native page id
        val number: Int,                     // caller-supplied page index, 0-based — never absent
        val url: String,
        val hasFetchedDimensions: Boolean,   // width/height non-null AND > 0 — a real 0 counts as "no usable dimension"
        val width: Int?,
        val height: Int?,
        val aspectRatio: Double?,            // width/height — NOT height/width
        val orientation: Orientation?,       // null when aspectRatio is null OR exactly 1 (perfect square)
        val resolvedAtEpochMs: Long,
        val server: ServerActiveInfo,        // never null in Success — see R11 in _contract-design-notes.md
        val cache: Nothing?,                 // always null this task — no Cache module exists yet (Task 015)
        val chapter: Chapter,                // the exact parameter buildPageDigest received, unfiltered
    ) : PageDigest

    data class Failure(val error: ErrorDigest) : PageDigest

    enum class Orientation { PORTRAIT, LANDSCAPE }
}

// Assembly order matters (R11): getUrl() first — vital, its failure makes the whole result a
// Failure. getDimensions() second — a tolerated failure (caught, width/height stay null, doesn't
// escalate to Failure). `server`/`resolvedAtEpochMs` are overwritten after each call that
// actually succeeds, so they end up reflecting whichever call succeeded LAST in this sequence.
suspend fun buildPageDigest(server: Server, chapter: Chapter, pageIndex: Int): PageDigest {
    var serverInfo: ServerActiveInfo? = null
    var resolvedAtEpochMs: Long? = null

    val url: String
    try {
        val urlResponse = server.serial(chapter.serial.id).chapter(chapter.id).page(pageIndex).getUrl()
        serverInfo = urlResponse.serverInfo
        resolvedAtEpochMs = urlResponse.resolvedAtEpochMs
        url = urlResponse.data
    } catch (e: Exception) {
        return PageDigest.Failure(e.toErrorDigest())
    }

    var width: Int? = null
    var height: Int? = null
    try {
        val dimensionsResponse = server.serial(chapter.serial.id).chapter(chapter.id).page(pageIndex).getDimensions()
        serverInfo = dimensionsResponse.serverInfo
        resolvedAtEpochMs = dimensionsResponse.resolvedAtEpochMs
        width = dimensionsResponse.data.width
        height = dimensionsResponse.data.height
    } catch (e: Exception) {
        // Tolerated — width/height stay null, serverInfo/resolvedAtEpochMs keep whatever getUrl() set.
    }

    val hasFetchedDimensions = width != null && height != null && width > 0 && height > 0
    val aspectRatio = if (hasFetchedDimensions) width!!.toDouble() / height!!.toDouble() else null
    val orientation = when {
        aspectRatio == null || aspectRatio == 1.0 -> null
        aspectRatio > 1.0 -> PageDigest.Orientation.LANDSCAPE
        else -> PageDigest.Orientation.PORTRAIT
    }

    return PageDigest.Success(
        id = "${chapter.id}:$pageIndex",
        number = pageIndex,
        url = url,
        hasFetchedDimensions = hasFetchedDimensions,
        width = width,
        height = height,
        aspectRatio = aspectRatio,
        orientation = orientation,
        resolvedAtEpochMs = resolvedAtEpochMs!!,
        server = serverInfo!!,
        cache = null,
        chapter = chapter,
    )
}
