package com.mymangareader.contentdigest.retention

import com.mymangareader.contentdigest.chapter.CHAPTER_CACHE_DOMAIN
import com.mymangareader.contentdigest.page.PAGE_CACHE_DOMAIN
import com.mymangareader.contentdigest.serial.SERIAL_CACHE_DOMAIN
import com.mymangareader.core.database.CacheRetentionDao
import com.mymangareader.core.database.CacheRetentionRow
import com.mymangareader.core.database.FollowedSeriesDao

// How long a cached digest survives WITHOUT being read. The cache only exists to make opening a
// series fast — every open refreshes it anyway — so anything not touched recently is just weight.
// A followed series is kept a little longer (it is the one the user is likely to come back to);
// everything else only for a day.
internal const val NOT_FOLLOWED_RETENTION_MS = 24L * 60 * 60 * 1000
internal const val FOLLOWED_RETENTION_MS = 3L * 24 * 60 * 60 * 1000

data class CacheRetentionResult(
    val rowsDeleted: Int,
    val imagesRemoved: Int,
)

/**
 * Sweeps the persistent digest cache (series / chapter / page rows) of entries not read within
 * their retention window: [NOT_FOLLOWED_RETENTION_MS] for a series that is not followed,
 * [FOLLOWED_RETENTION_MS] for a followed one. Meant to run on every app start.
 *
 * A deleted page row also takes its image out of the image cache via [removeImage] (the image
 * cache is keyed by the same URL the row stores) — otherwise the bulk of the storage, the page
 * images themselves, would stay behind while only their small descriptors were dropped.
 *
 * A row whose series can't be determined (e.g. a malformed value) counts as not followed. Domains
 * this class doesn't know (enrichment matches, …) are left alone.
 */
class CacheRetention(
    private val cacheRetentionDao: CacheRetentionDao,
    private val followedSeriesDao: FollowedSeriesDao,
    private val removeImage: suspend (url: String) -> Unit,
) {
    suspend fun sweep(now: Long = System.currentTimeMillis()): CacheRetentionResult {
        // Anything read within the shortest window is safe whatever the series is — only rows idle
        // longer than that need a closer look.
        val candidates = cacheRetentionDao.rowsLastAccessedBefore(now - NOT_FOLLOWED_RETENTION_MS)
        if (candidates.isEmpty()) return CacheRetentionResult(0, 0)

        val followed = followedSeriesDao.getAllIds().toSet()
        val expired =
            candidates.filter { row ->
                val window = if (row.seriesId() in followed) FOLLOWED_RETENTION_MS else NOT_FOLLOWED_RETENTION_MS
                row.domain in KNOWN_DOMAINS && row.lastAccessedAtEpochMs < now - window
            }
        if (expired.isEmpty()) return CacheRetentionResult(0, 0)

        var imagesRemoved = 0
        for (row in expired) {
            val url = if (row.domain == PAGE_CACHE_DOMAIN) row.imageUrl() else null
            if (url != null) {
                runCatching { removeImage(url) }.onSuccess { imagesRemoved++ }
            }
        }
        cacheRetentionDao.deleteAll(expired)
        return CacheRetentionResult(rowsDeleted = expired.size, imagesRemoved = imagesRemoved)
    }
}

private val KNOWN_DOMAINS = setOf(SERIAL_CACHE_DOMAIN, CHAPTER_CACHE_DOMAIN, PAGE_CACHE_DOMAIN)

// A series row's key is "<seriesId>:<full>:<external>"; chapter/page rows carry the id inside
// their JSON value (the DAO cut a snippet starting right after `"seriesId":"`).
private fun CacheRetentionRow.seriesId(): String? =
    if (domain == SERIAL_CACHE_DOMAIN) {
        key.substringBefore(':').takeIf { it.isNotEmpty() }
    } else {
        seriesIdHint?.substringBefore('"')?.takeIf { it.isNotEmpty() }
    }

// The snippet runs past the closing quote; JSON may escape '&' and '/'.
private fun CacheRetentionRow.imageUrl(): String? =
    urlHint
        ?.let { rawUrlUntilClosingQuote(it) }
        ?.replace("\\u0026", "&")
        ?.replace("\\/", "/")
        ?.takeIf { it.isNotEmpty() }

private fun rawUrlUntilClosingQuote(snippet: String): String {
    val out = StringBuilder()
    var i = 0
    while (i < snippet.length) {
        val c = snippet[i]
        if (c == '\\' && i + 1 < snippet.length) {
            out.append(c).append(snippet[i + 1])
            i += 2
            continue
        }
        if (c == '"') break
        out.append(c)
        i++
    }
    return out.toString()
}
