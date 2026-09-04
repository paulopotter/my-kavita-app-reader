package com.mymangareader.contentdigest.page

import com.mymangareader.cache.Cache
import com.mymangareader.cache.CacheDescriptor
import com.mymangareader.cache.CacheEntry
import com.mymangareader.cache.CacheMode
import com.mymangareader.contentdigest.error.ErrorDigest
import com.mymangareader.contentdigest.error.toErrorDigest
import com.mymangareader.server.Server
import com.mymangareader.server.ServerActiveInfo
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.Transient
import kotlinx.serialization.json.Json

// Page IS an image (mirrors the TS spec's ImageDescriptor fields flattened, per Task 009's
// PageContract extends ImageDescriptor) — no separate PageResult wrapper type (unlike the
// modeling-phase TS spec's `{isSuccess} & Contract` union): the sealed hierarchy itself already
// is the discriminated result, same idiom as the existing OtaCheckResult (:tools).
@Serializable
sealed interface PageDigest {
    @Serializable
    data class Success(
        val id: String, // synthetic "chapterId:pageIndex" — Kavita has no native page id
        val number: Int, // caller-supplied page index, 0-based — never absent
        val url: String,
        val hasFetchedDimensions: Boolean, // width/height non-null AND > 0 — a real 0 counts as "no usable dimension"
        val width: Int?,
        val height: Int?,
        val aspectRatio: Double?, // width/height — NOT height/width
        val orientation: Orientation?, // null when aspectRatio is null OR exactly 1 (perfect square)
        val resolvedAtEpochMs: Long,
        val server: ServerActiveInfo, // never null in Success — see R11 in _contract-design-notes.md
        // Never part of the JSON persisted in Cache — it would be a circular value at write time
        // (the descriptor only exists AFTER the write completes) and is redundant to persist
        // anyway (Cache already knows its own cachedAtEpochMs/ttlMs for this row). Reconstructed
        // from the real CacheEntry every time a value is read back from the cache.
        @Transient val cache: CacheDescriptor? = null,
        val chapter: ChapterSummary, // the exact parameter buildPageDigest received, unfiltered
    ) : PageDigest

    @Serializable
    data class Failure(
        val error: ErrorDigest,
    ) : PageDigest

    @Serializable
    enum class Orientation { PORTRAIT, LANDSCAPE }
}

private const val PAGE_CACHE_DOMAIN = "page"
private val pageDigestJson = Json { ignoreUnknownKeys = true }
private val pageDigestBackgroundScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

private fun pageDigestCacheKey(
    chapterId: String,
    pageIndex: Int,
) = "$chapterId:$pageIndex"

/**
 * Cache-first entry point. [cache] is required — every caller (RN bridge, [buildChapterDigest]
 * looping over a chapter's pages) shares the same injected [Cache] instance, same convention
 * [Server] already uses (passed explicitly, never a module-level singleton reference).
 *
 * - `force = false` (default) + a fresh cache hit: returns the cached value, no network call.
 * - `force = false` + a stale cache hit: returns the stale value immediately, and fires a
 *   background refresh (this same function, `force = true`) that re-fetches and rewrites the
 *   cache — the original caller never waits for it.
 * - `force = false` + a cache miss, or `force = true`: always fetches fresh from [server] (the
 *   logic already in place before caching existed — see the private `fetchPageDigest` below) and
 *   writes the result into [cache] before returning, whether this call started as a miss or was
 *   forced.
 *
 * PERSISTENT is the only mode used here — see the Task 023 mini-iteration notes for why every
 * domain starts there.
 */
suspend fun buildPageDigest(
    server: Server,
    chapter: ChapterSummary,
    pageIndex: Int,
    cache: Cache,
    force: Boolean = false,
): PageDigest {
    val key = pageDigestCacheKey(chapter.id, pageIndex)

    if (!force) {
        val cached = cache.persistent.get(key)
        if (cached != null) {
            val digest =
                pageDigestJson
                    .decodeFromString<PageDigest.Success>(cached.value)
                    .copy(cache = cached.toCacheDescriptor(key))
            if (cached.isExpired) {
                pageDigestBackgroundScope.launch {
                    buildPageDigest(server, chapter, pageIndex, cache, force = true)
                }
            }
            return digest
        }
    }

    val fresh = fetchPageDigest(server, chapter, pageIndex)
    if (fresh !is PageDigest.Success) return fresh

    val descriptor = cache.persistent.put(key, pageDigestJson.encodeToString(PageDigest.Success.serializer(), fresh), PAGE_CACHE_DOMAIN)
    return fresh.copy(cache = descriptor)
}

private fun CacheEntry.toCacheDescriptor(key: String) =
    CacheDescriptor(
        key = key,
        variant = "",
        domain = PAGE_CACHE_DOMAIN,
        mode = CacheMode.PERSISTENT,
        cachedAtEpochMs = cachedAtEpochMs,
        expiresAtEpochMs = cachedAtEpochMs + ttlMs,
    )

// Assembly order matters (R11): getUrl() first — vital, its failure makes the whole result a
// Failure. getDimensions() second — a tolerated failure (caught, width/height stay null, doesn't
// escalate to Failure). `server`/`resolvedAtEpochMs` are overwritten after each call that
// actually succeeds, so they end up reflecting whichever call succeeded LAST in this sequence.
private suspend fun fetchPageDigest(
    server: Server,
    chapter: ChapterSummary,
    pageIndex: Int,
): PageDigest {
    var serverInfo: ServerActiveInfo? = null
    var resolvedAtEpochMs: Long? = null

    val url: String
    try {
        val urlResponse =
            server
                .serial(chapter.seriesId)
                .chapter(chapter.id)
                .page(pageIndex)
                .getUrl()
        serverInfo = urlResponse.serverInfo
        resolvedAtEpochMs = urlResponse.resolvedAtEpochMs
        url = urlResponse.data
    } catch (e: Exception) {
        return PageDigest.Failure(e.toErrorDigest())
    }

    var width: Int? = null
    var height: Int? = null
    try {
        val dimensionsResponse =
            server
                .serial(chapter.seriesId)
                .chapter(chapter.id)
                .page(pageIndex)
                .getDimensions()
        serverInfo = dimensionsResponse.serverInfo
        resolvedAtEpochMs = dimensionsResponse.resolvedAtEpochMs
        width = dimensionsResponse.data.width
        height = dimensionsResponse.data.height
    } catch (e: Exception) {
        // Tolerated — width/height stay null, serverInfo/resolvedAtEpochMs keep whatever getUrl() set.
    }

    val hasFetchedDimensions = width != null && height != null && width > 0 && height > 0
    val aspectRatio = if (hasFetchedDimensions) width!!.toDouble() / height!!.toDouble() else null
    val orientation =
        when {
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
