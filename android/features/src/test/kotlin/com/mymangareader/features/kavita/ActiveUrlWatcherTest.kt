package com.mymangareader.features.kavita

import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

private class FakeUrlSource(private val urls: MutableList<String>) : KavitaUrlSource {
    override suspend fun getActiveUrl(): Result<String> =
        if (urls.isEmpty()) Result.success(urls.lastOrNull() ?: "") else Result.success(urls.removeAt(0))
    override suspend fun invalidateAndReselect(): Result<String> = getActiveUrl()
    override fun getLastKnownUrl(): String? = null
}

class ActiveUrlWatcherTest {

    @Test
    fun `emite apenas quando a url muda entre polls`() = runTest {
        val urls = mutableListOf("url-a", "url-a", "url-b", "url-b")
        val watcher = ActiveUrlWatcher(FakeUrlSource(urls))
        val emitted = mutableListOf<String?>()
        backgroundScope.launch { watcher.activeUrl.collect { emitted.add(it) } }

        watcher.start(backgroundScope)
        advanceTimeBy(1)
        advanceTimeBy(30_001)
        advanceTimeBy(30_001)

        assertEquals(listOf(null, "url-a", "url-b"), emitted)
    }

    @Test
    fun `start chamado duas vezes nao inicia dois jobs`() = runTest {
        val urls = mutableListOf("url-a", "url-b", "url-c", "url-d")
        val watcher = ActiveUrlWatcher(FakeUrlSource(urls))

        watcher.start(backgroundScope)
        watcher.start(backgroundScope)
        advanceTimeBy(1)

        assertEquals("url-a", watcher.activeUrl.value)
        // Se dois jobs tivessem sido iniciados, o segundo poll consumiria "url-b" imediatamente.
        advanceTimeBy(30_001)
        assertEquals("url-b", watcher.activeUrl.value)
    }

    @Test
    fun `valor inicial e nulo antes do primeiro poll`() = runTest {
        val watcher = ActiveUrlWatcher(FakeUrlSource(mutableListOf("url-a")))
        assertNull(watcher.activeUrl.value)
    }
}
