package com.mymangareader.contentdigest.page

import com.mymangareader.server.ImageDescriptor
import com.mymangareader.server.ServerActiveInfo
import kotlinx.serialization.Serializable

// The chapter fields already resolved BEFORE Chapter.kt (Task 019) builds pages.list — passed
// down into buildPageDigest so PageDigest.Success.chapter has real chapter data, not a
// placeholder. Deliberately excludes readStatus/pages/prevChapter/nextChapter: those either
// depend on pages.list itself (readStatus, pages) or on another domain (prevChapter/nextChapter,
// filled by Series) — building either of those first would be circular (ChapterDigest needs
// PageDigest, which would need ChapterDigest). PageDigest never re-shapes/filters this object —
// it's handed back exactly as received, same treatment server/cache already get (see PageDigest.kt).
@Serializable
data class ChapterSummary(
    val id: String,
    val seriesId: String,
    val decimalNumber: Double?,
    val number: Int?,
    val specialLabel: String?,
    val isSpecial: Boolean?,
    val title: String,
    val createdUtc: String?,
    val coverImage: ImageDescriptor,
    val resolvedAtEpochMs: Long,
    val server: ServerActiveInfo,
)
