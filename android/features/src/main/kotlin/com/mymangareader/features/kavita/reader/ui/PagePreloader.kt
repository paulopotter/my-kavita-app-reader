package com.mymangareader.features.kavita.reader.ui

import android.content.Context
import coil.ImageLoader
import coil.imageLoader
import coil.memory.MemoryCache
import coil.request.ImageRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlin.math.abs

internal const val PAGE_PRELOAD_RADIUS = 3
private const val PRELOAD_PARALLELISM = 3

/**
 * Warms Coil's memory+disk cache for pages near the current reading position, mirroring the
 * reference project's PagePreloader (my-manga-app-reader). The chapter's full URL list is
 * already in memory (see ReaderPageList) — only the image bytes are fetched on demand, so a
 * mobile-data reader never downloads a whole chapter up front, just the visible page plus a
 * small window around it.
 */
internal class PagePreloader(
    context: Context,
    private val imageLoader: ImageLoader = context.imageLoader,
) {
    private val supervisorJob = SupervisorJob()
    private val scope = CoroutineScope(supervisorJob + Dispatchers.IO.limitedParallelism(PRELOAD_PARALLELISM))
    private val context = context.applicationContext

    private val activeJobs = mutableMapOf<String, Job>()

    // The URL most recently reported as fully out of the preload window (see updateWindow) —
    // evicted from Coil's in-memory cache on the NEXT call rather than immediately: the visible
    // page itself is one step outside this preloader's own window (PAGE_PRELOAD_RADIUS excludes
    // visibleIndex, see computePreloadWindow) but Coil's memory cache is still what serves it on
    // re-render, so evicting a URL the instant it drops out risks evicting the page still on
    // screen for a tick. Delaying eviction by one window update gives that page one more cycle to
    // actually leave the viewport first.
    private var previousWindow: Set<String> = emptySet()

    /**
     * Recomputes the desired preload window. Cancels in-flight jobs whose URL fell out of the
     * window (e.g. the reader scrolled back the other way) and starts jobs only for URLs not
     * already in flight — already-cached URLs resolve near-instantly inside imageLoader.execute.
     *
     * Also evicts decoded pages from Coil's in-memory cache once they've been out of the window
     * for a full update cycle — full-resolution manga/webtoon pages are large ARGB_8888 bitmaps
     * (SafeBitmapDecoder never downsamples), and the reader's chapter window only ever grows
     * (reader.window.ts is append-only, by design), so nothing else ever tells Coil a page is no
     * longer relevant. Only the memory cache is cleared — the disk cache (and Coil's own
     * automatic re-caching on the next request) is untouched, so scrolling back to a page that
     * was evicted is a cheap disk hit, not a re-download.
     */
    fun updateWindow(orderedUrls: List<String>) {
        val desired = orderedUrls.toSet()

        activeJobs.keys.filterNot { it in desired }.forEach { url ->
            activeJobs.remove(url)?.cancel()
        }

        previousWindow
            .filterNot { it in desired }
            .forEach { url -> imageLoader.memoryCache?.remove(MemoryCache.Key(url)) }
        previousWindow = desired

        orderedUrls.forEach { url ->
            if (url !in activeJobs) {
                activeJobs[url] =
                    scope.launch {
                        imageLoader.execute(
                            ImageRequest
                                .Builder(context)
                                .data(url)
                                .diskCacheKey(url)
                                .build(),
                        )
                    }
            }
        }
    }

    fun clear() {
        activeJobs.values.forEach { it.cancel() }
        activeJobs.clear()
        supervisorJob.cancel()
    }
}

/**
 * Builds the ordered preload window around [visibleIndex]: up to [PAGE_PRELOAD_RADIUS] pages
 * before and after, nearest first — that ordering is the only "priority" signal Coil 2.x offers
 * (it launches requests in the order given).
 */
internal fun computePreloadWindow(
    pageUrls: List<String>,
    visibleIndex: Int,
): List<String> {
    val range = (visibleIndex - PAGE_PRELOAD_RADIUS)..(visibleIndex + PAGE_PRELOAD_RADIUS)
    return range
        .filter { it != visibleIndex && it in pageUrls.indices }
        .sortedBy { abs(it - visibleIndex) }
        .map { pageUrls[it] }
}
