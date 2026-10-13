package com.mymangareader.contentdigest.page

import com.mymangareader.contentdigest.chapter.ChapterDigest

// Where a page image lives on the server; everything before it in a cached URL is just the host
// that happened to be active when the digest was written.
private const val PAGE_IMAGE_PATH = "/api/reader/image"

/**
 * [url] pointed at [activeBaseUrl]: the host it was cached with is swapped for the one active NOW,
 * the path and query kept as they are. A cached digest used to hand the reader a URL for whichever
 * address was active hours ago — a LAN IP that is unreachable once off the home network, or the
 * public one while sitting next to the server. The path never changes; the host does.
 *
 * Left untouched when there is no active base, or the URL isn't a page-image URL.
 */
internal fun rehostPageUrl(
    url: String,
    activeBaseUrl: String?,
): String {
    if (activeBaseUrl.isNullOrBlank()) return url
    val at = url.indexOf(PAGE_IMAGE_PATH)
    if (at < 0) return url
    return activeBaseUrl.trimEnd('/') + url.substring(at)
}

internal fun PageDigest.Success.rehosted(activeBaseUrl: String?): PageDigest.Success {
    val moved = rehostPageUrl(url, activeBaseUrl)
    return if (moved == url) this else copy(url = moved)
}

internal fun ChapterDigest.Success.rehosted(activeBaseUrl: String?): ChapterDigest.Success {
    if (activeBaseUrl.isNullOrBlank() || pages.list.isEmpty()) return this
    val moved = pages.list.map { if (it is PageDigest.Success) it.rehosted(activeBaseUrl) else it }
    return copy(pages = pages.copy(list = moved))
}
