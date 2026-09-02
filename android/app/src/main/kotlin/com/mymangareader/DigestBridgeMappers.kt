package com.mymangareader

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.mymangareader.contentdigest.chapter.ChapterDigest
import com.mymangareader.contentdigest.chapter.ChapterFields
import com.mymangareader.contentdigest.chapter.ChapterNeighborDigest
import com.mymangareader.contentdigest.error.ErrorDigest
import com.mymangareader.contentdigest.page.PageDigest
import com.mymangareader.contentdigest.serial.ExternalMetadataDigest
import com.mymangareader.contentdigest.serial.SerialDigest
import com.mymangareader.contentdigest.serial.SerialFields
import com.mymangareader.contentdigest.serial.SerialsDigest
import com.mymangareader.externalmetadataserver.ExternalMetadataActiveInfo
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataMatch
import com.mymangareader.server.ImageDescriptor
import com.mymangareader.server.ImageOrientation
import com.mymangareader.server.ServerActiveInfo
import com.mymangareader.server.plugins.PluginAgeRating
import com.mymangareader.server.plugins.PluginGenreOrTag

// `toWritableMap()` for every type PageDigest/ChapterDigest/SeriesDigest can carry — kept out of
// DigestBridgeModule.kt (which stays focused on @ReactMethod + runCatching) because of the sheer
// number of nested types here (~15+), unlike ServerBridgeModule's much smaller flat DTOs.
//
// Every XDigest maps to `{isSuccess: true, ...fields}` or `{isSuccess: false, error: {...}}` —
// never a Promise rejection. A Digest's own Failure is an expected, already-handled outcome (the
// builder function itself never throws for it), so the RN side always gets a resolved object and
// only needs to check `isSuccess`, never wrap the call in try/catch. A genuinely unexpected
// exception (a real bug, outside what buildXDigest itself covers) is the only thing that still
// becomes a Promise rejection — see DigestBridgeModule.kt's own runCatching wrapping.

fun ServerActiveInfo.toWritableMap(): WritableMap = Arguments.createMap().apply {
    putString("groupId", groupId)
    putString("groupName", groupName)
    putString("providerId", providerId)
    putString("urlId", urlId)
    putString("url", url)
    putInt("timeoutMs", timeoutMs)
    putInt("priority", priority)
}

fun ImageDescriptor.toWritableMap(): WritableMap = Arguments.createMap().apply {
    putString("url", url)
    putBoolean("hasFetchedDimensions", hasFetchedDimensions)
    width?.let { putInt("width", it) }
    height?.let { putInt("height", it) }
    aspectRatio?.let { putDouble("aspectRatio", it) }
    orientation?.let { putString("orientation", it.name) }
    putDouble("resolvedAtEpochMs", resolvedAtEpochMs.toDouble())
    putMap("server", server.toWritableMap())
    putNull("cache")
}

fun ErrorDigest.toWritableMap(): WritableMap = Arguments.createMap().apply {
    code?.let { putString("code", it) }
    message?.let { putString("message", it) }
}

// ── PageDigest ───────────────────────────────────────────────────────────

fun PageDigest.toWritableMap(): WritableMap = when (this) {
    is PageDigest.Failure -> Arguments.createMap().apply {
        putBoolean("isSuccess", false)
        putMap("error", error.toWritableMap())
    }
    is PageDigest.Success -> Arguments.createMap().apply {
        putBoolean("isSuccess", true)
        putString("id", id)
        putInt("number", number)
        putString("url", url)
        putBoolean("hasFetchedDimensions", hasFetchedDimensions)
        width?.let { putInt("width", it) }
        height?.let { putInt("height", it) }
        aspectRatio?.let { putDouble("aspectRatio", it) }
        orientation?.let { putString("orientation", it.name) }
        putDouble("resolvedAtEpochMs", resolvedAtEpochMs.toDouble())
        putMap("server", server.toWritableMap())
        cache?.let { putMap("cache", it.toWritableMap()) } ?: putNull("cache")
        // chapter: ChapterSummary — deliberately NOT included here. It's the exact ChapterSummary
        // buildPageDigest received (see :content-digest's own README), redundant with the
        // ChapterDigest the RN side already has (or is fetching separately) — avoids repeating a
        // whole nested chapter object inside every single page.
    }
}

// ── ChapterDigest / ChapterNeighborDigest ───────────────────────────────

private fun WritableMap.putChapterFields(fields: ChapterFields) = apply {
    putString("id", fields.id)
    putString("seriesId", fields.seriesId)
    fields.decimalNumber?.let { putDouble("decimalNumber", it) }
    fields.number?.let { putInt("number", it) }
    fields.specialLabel?.let { putString("specialLabel", it) }
    fields.isSpecial?.let { putBoolean("isSpecial", it) }
    putString("title", fields.title)
    fields.createdUtc?.let { putString("createdUtc", it) }
    putMap("coverImage", fields.coverImage.toWritableMap())
    putString("readStatus", fields.readStatus.name)
    putMap("pages", fields.pages.toWritableMap())
    putDouble("resolvedAtEpochMs", fields.resolvedAtEpochMs.toDouble())
    putMap("server", fields.server.toWritableMap())
    fields.cache?.let { putMap("cache", it.toWritableMap()) } ?: putNull("cache")
}

private fun ChapterFields.Pages.toWritableMap(): WritableMap = Arguments.createMap().apply {
    fileFormat?.let { putString("fileFormat", it) }
    status?.let { putString("status", it.name) }
    count?.let { putInt("count", it) }
    readCount?.let { putInt("readCount", it) }
    total?.let { putInt("total", it) }
    totalWidthPx?.let { putInt("totalWidthPx", it) }
    totalHeightPx?.let { putInt("totalHeightPx", it) }
    resumePoint?.let { putMap("resumePoint", it.toWritableMap()) }
    putArray("list", Arguments.createArray().also { arr -> list.forEach { arr.pushMap(it.toWritableMap()) } })
}

private fun ChapterFields.ResumePoint.toWritableMap(): WritableMap = Arguments.createMap().apply {
    stoppedAtPageIndex?.let { putInt("stoppedAtPageIndex", it) }
    recordedAtEpochMs?.let { putDouble("recordedAtEpochMs", it.toDouble()) }
}

fun ChapterDigest.toWritableMap(): WritableMap = when (this) {
    is ChapterDigest.Failure -> Arguments.createMap().apply {
        putBoolean("isSuccess", false)
        putMap("error", error.toWritableMap())
    }
    is ChapterDigest.Success -> Arguments.createMap().apply {
        putBoolean("isSuccess", true)
        putChapterFields(this@toWritableMap)
        prevChapter?.let { putMap("prevChapter", it.toWritableMap()) }
        nextChapter?.let { putMap("nextChapter", it.toWritableMap()) }
    }
}

fun ChapterNeighborDigest.toWritableMap(): WritableMap = when (this) {
    is ChapterNeighborDigest.Failure -> Arguments.createMap().apply {
        putBoolean("isSuccess", false)
        putMap("error", error.toWritableMap())
    }
    is ChapterNeighborDigest.Success -> Arguments.createMap().apply {
        putBoolean("isSuccess", true)
        putChapterFields(this@toWritableMap)
    }
}

// ── SeriesDigest ─────────────────────────────────────────────────────────

fun PluginGenreOrTag.toWritableMap(): WritableMap = Arguments.createMap().apply {
    putString("id", id)
    putString("name", name)
}

fun PluginAgeRating.toWritableMap(): WritableMap = Arguments.createMap().apply {
    rating?.let { putString("rating", it) }
    putString("system", system)
}

private fun SerialFields.Library.toWritableMap(): WritableMap = Arguments.createMap().apply {
    putString("id", id)
    name?.let { putString("name", it) }
}

private fun SerialFields.LastUpdatesUTC.toWritableMap(): WritableMap = Arguments.createMap().apply {
    series?.let { putDouble("series", it.toDouble()) }
    chapterAdded?.let { putDouble("chapterAdded", it.toDouble()) }
    readDate?.let { putDouble("readDate", it.toDouble()) }
}

private fun SerialFields.OtherNames.toWritableMap(): WritableMap = Arguments.createMap().apply {
    original?.let { putString("original", it) }
    localized?.let { putString("localized", it) }
}

private fun SerialFields.OtherIds.toWritableMap(): WritableMap = Arguments.createMap().apply {
    aniListId?.let { putInt("aniListId", it) }
    malId?.let { putDouble("malId", it.toDouble()) }
}

private fun SerialFields.Colors.toWritableMap(): WritableMap = Arguments.createMap().apply {
    primary?.let { putString("primary", it) }
    secondary?.let { putString("secondary", it) }
}

private fun SerialFields.Pages.toWritableMap(): WritableMap = Arguments.createMap().apply {
    putInt("read", read)
    putInt("total", total)
}

private fun SerialFields.Metadata.toWritableMap(): WritableMap = Arguments.createMap().apply {
    description?.let { putString("description", it) }
    putArray("genres", Arguments.createArray().also { arr -> genres.forEach { arr.pushMap(it.toWritableMap()) } })
    putArray("tags", Arguments.createArray().also { arr -> tags.forEach { arr.pushMap(it.toWritableMap()) } })
    publicationStatus?.let { putString("publicationStatus", it) }
    ageRating?.let { putMap("ageRating", it.toWritableMap()) }
    releaseYear?.let { putInt("releaseYear", it) }
    language?.let { putString("language", it) }
    // null when SerialDigestOptions.includeExternalMetadata was false — buildExternalMetadataDigest
    // was never even called, so there's genuinely nothing to report (not the same as it being
    // called and finding "not configured," which is a real Failure — see ExternalMetadataDigest).
    external?.let { putMap("external", it.toWritableMap()) }
}

private fun ExternalMetadataActiveInfo.toWritableMap(): WritableMap = Arguments.createMap().apply {
    putString("groupId", groupId)
    putString("groupName", groupName)
    putString("providerId", providerId)
    putString("urlId", urlId)
    putString("url", url)
    putInt("timeoutMs", timeoutMs)
    putInt("priority", priority)
}

private fun ExternalMetadataMatch.toWritableMap(): WritableMap = Arguments.createMap().apply {
    putString("seriesId", seriesId)
    slug?.let { putString("slug", it) }
    putString("status", status)
    downloadedChapters?.let { putInt("downloadedChapters", it) }
    totalChapters?.let { putInt("totalChapters", it) }
    latestChapterLabel?.let { putString("latestChapterLabel", it) }
    putBoolean("hasErrors", hasErrors)
}

// Same 2-state {isSuccess, error} shape every other XDigest uses on the bridge. A Failure whose
// error.code is "not_configured" means buildExternalMetadataDigest was called but found no
// ExternalMetadataServer group configured — RN checks error.code to tell that apart from a real
// sync failure (per Task 022's explicit call: RN validates the error code/message and ignores vs.
// explodes accordingly).
private fun ExternalMetadataDigest.toWritableMap(): WritableMap = when (this) {
    is ExternalMetadataDigest.Failure -> Arguments.createMap().apply {
        putBoolean("isSuccess", false)
        putMap("error", error.toWritableMap())
    }
    is ExternalMetadataDigest.Success -> Arguments.createMap().apply {
        putBoolean("isSuccess", true)
        match?.let { putMap("match", it.toWritableMap()) }
        putMap("server", server.toWritableMap())
        putDouble("resolvedAtEpochMs", resolvedAtEpochMs.toDouble())
    }
}

private fun SerialFields.ResumePoint.toWritableMap(): WritableMap = Arguments.createMap().apply {
    putString("stoppedAtChapterId", stoppedAtChapterId)
    putInt("stoppedAtChapterIndex", stoppedAtChapterIndex)
    putString("status", status.name)
    recordedAtEpochMs?.let { putDouble("recordedAtEpochMs", it.toDouble()) }
}

private fun SerialFields.Chapters.toWritableMap(): WritableMap = Arguments.createMap().apply {
    status?.let { putString("status", it.name) }
    readCount?.let { putInt("readCount", it) }
    putInt("total", total)
    resumePoint?.let { putMap("resumePoint", it.toWritableMap()) }
    putArray("list", Arguments.createArray().also { arr -> list.forEach { arr.pushMap(it.toWritableMap()) } })
}

fun SerialDigest.toWritableMap(): WritableMap = when (this) {
    is SerialDigest.Failure -> Arguments.createMap().apply {
        putBoolean("isSuccess", false)
        putMap("error", error.toWritableMap())
    }
    is SerialDigest.Success -> Arguments.createMap().apply {
        putBoolean("isSuccess", true)
        putString("id", id)
        putString("name", name)
        library?.let { putMap("library", it.toWritableMap()) }
        lastUpdatesUTC?.let { putMap("lastUpdatesUTC", it.toWritableMap()) }
        putMap("coverImage", coverImage.toWritableMap())
        chapters?.let { putMap("chapters", it.toWritableMap()) }
        otherNames?.let { putMap("otherNames", it.toWritableMap()) }
        sortName?.let { putString("sortName", it) }
        otherIds?.let { putMap("otherIds", it.toWritableMap()) }
        colors?.let { putMap("colors", it.toWritableMap()) }
        pages?.let { putMap("pages", it.toWritableMap()) }
        metadata?.let { putMap("metadata", it.toWritableMap()) }
        putDouble("resolvedAtEpochMs", resolvedAtEpochMs.toDouble())
        putMap("server", server.toWritableMap())
        cache?.let { putMap("cache", it.toWritableMap()) } ?: putNull("cache")
    }
}

// ── SerialsDigest (list) ─────────────────────────────────────────────────

fun SerialsDigest.toWritableMap(): WritableMap = when (this) {
    is SerialsDigest.Failure -> Arguments.createMap().apply {
        putBoolean("isSuccess", false)
        putMap("error", error.toWritableMap())
    }
    is SerialsDigest.Success -> Arguments.createMap().apply {
        putBoolean("isSuccess", true)
        putArray("serials", Arguments.createArray().also { arr -> serials.forEach { arr.pushMap(it.toWritableMap()) } })
        lastUpdatedEpochMs?.let { putDouble("lastUpdatedEpochMs", it.toDouble()) } ?: putNull("lastUpdatedEpochMs")
    }
}
