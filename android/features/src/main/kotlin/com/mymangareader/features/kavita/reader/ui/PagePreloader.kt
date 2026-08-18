package com.mymangareader.features.kavita.reader.ui

import android.content.Context
import coil.ImageLoader
import coil.imageLoader
import coil.request.ImageRequest
import kotlin.math.abs
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

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

    /**
     * Recomputes the desired preload window. Cancels in-flight jobs whose URL fell out of the
     * window (e.g. the reader scrolled back the other way) and starts jobs only for URLs not
     * already in flight — already-cached URLs resolve near-instantly inside imageLoader.execute.
     */
    fun updateWindow(orderedUrls: List<String>) {
        val desired = orderedUrls.toSet()

        activeJobs.keys.filterNot { it in desired }.forEach { url ->
            activeJobs.remove(url)?.cancel()
        }

        orderedUrls.forEach { url ->
            if (url !in activeJobs) {
                activeJobs[url] = scope.launch {
                    imageLoader.execute(
                        ImageRequest.Builder(context).data(url).diskCacheKey(url).build(),
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
internal fun computePreloadWindow(pageUrls: List<String>, visibleIndex: Int): List<String> {
    val range = (visibleIndex - PAGE_PRELOAD_RADIUS)..(visibleIndex + PAGE_PRELOAD_RADIUS)
    return range
        .filter { it != visibleIndex && it in pageUrls.indices }
        .sortedBy { abs(it - visibleIndex) }
        .map { pageUrls[it] }
}
