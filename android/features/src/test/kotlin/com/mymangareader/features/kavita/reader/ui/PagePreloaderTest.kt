package com.mymangareader.features.kavita.reader.ui

import android.graphics.drawable.ColorDrawable
import androidx.test.core.app.ApplicationProvider
import coil.ImageLoader
import coil.decode.DataSource
import coil.request.Disposable
import coil.request.ImageRequest
import coil.request.ImageResult
import coil.request.SuccessResult
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class PagePreloaderTest {

    private val context = ApplicationProvider.getApplicationContext<android.content.Context>()

    @Test
    fun `computePreloadWindow returns up to radius pages before and after, nearest first`() {
        val urls = (0..9).map { "url$it" }

        val window = computePreloadWindow(urls, visibleIndex = 5)

        assertEquals(listOf("url4", "url6", "url3", "url7", "url2", "url8"), window)
    }

    @Test
    fun `computePreloadWindow clamps to the list bounds near the edges`() {
        val urls = (0..3).map { "url$it" }

        val window = computePreloadWindow(urls, visibleIndex = 0)

        assertEquals(listOf("url1", "url2", "url3"), window)
    }

    @Test
    fun `computePreloadWindow excludes the visible index itself`() {
        val urls = (0..9).map { "url$it" }

        val window = computePreloadWindow(urls, visibleIndex = 5)

        assertFalse(window.contains("url5"))
    }

    @Test
    fun `updateWindow launches a request for each url in the window`() = runBlocking {
        val requested = mutableListOf<String>()
        val preloader = PagePreloader(context, RecordingImageLoader { requested.add(it) })

        preloader.updateWindow(listOf("url1", "url2"))
        awaitUntil { requested.size >= 2 }

        assertEquals(setOf("url1", "url2"), requested.toSet())
        preloader.clear()
    }

    @Test
    fun `updateWindow does not relaunch a url still in flight`() = runBlocking {
        var executions = 0
        val preloader = PagePreloader(
            context,
            RecordingImageLoader(delayMs = 50) { executions++ },
        )

        preloader.updateWindow(listOf("url1"))
        preloader.updateWindow(listOf("url1"))
        awaitUntil { executions >= 1 }
        delay(20)

        assertEquals(1, executions)
        preloader.clear()
    }

    private class RecordingImageLoader(
        private val delayMs: Long = 0,
        private val onExecute: (String) -> Unit,
    ) : ImageLoader by NotImplementedImageLoader {
        override suspend fun execute(request: ImageRequest): ImageResult {
            if (delayMs > 0) delay(delayMs)
            onExecute(request.data.toString())
            return SuccessResult(ColorDrawable(), request, DataSource.MEMORY_CACHE)
        }
    }

    private suspend fun awaitUntil(timeoutMs: Long = 2000, condition: () -> Boolean) {
        val start = System.currentTimeMillis()
        while (!condition()) {
            if (System.currentTimeMillis() - start > timeoutMs) error("Timed out waiting for condition")
            delay(10)
        }
    }
}

/** Minimal ImageLoader stub — only `execute` is exercised by PagePreloader. */
private object NotImplementedImageLoader : ImageLoader {
    override val defaults get() = throw NotImplementedError()
    override val components get() = throw NotImplementedError()
    override val memoryCache get() = throw NotImplementedError()
    override val diskCache get() = throw NotImplementedError()

    override fun enqueue(request: ImageRequest): Disposable = throw NotImplementedError()
    override suspend fun execute(request: ImageRequest): ImageResult = throw NotImplementedError()
    override fun newBuilder() = throw NotImplementedError()
    override fun shutdown() = Unit
}
