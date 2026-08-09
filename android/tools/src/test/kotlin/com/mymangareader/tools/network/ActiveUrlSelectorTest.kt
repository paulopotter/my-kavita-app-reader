package com.mymangareader.tools.network

import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class ActiveUrlSelectorTest {

    private lateinit var server1: MockWebServer
    private lateinit var server2: MockWebServer
    private lateinit var selector: ActiveUrlSelector

    @Before
    fun setUp() {
        server1 = MockWebServer()
        server2 = MockWebServer()
        server1.start()
        server2.start()
        selector = ActiveUrlSelector()
    }

    @After
    fun tearDown() {
        runCatching { server1.shutdown() }
        runCatching { server2.shutdown() }
    }

    private fun candidate(
        server: MockWebServer,
        id: String = "s",
        priority: Int = 0,
        path: String = "/health",
        timeoutMs: Int = 2000,
    ) = UrlCandidate(
        id = id,
        url = server.url("/").toString().trimEnd('/'),
        timeoutMs = timeoutMs,
        priority = priority,
        healthCheckPath = path,
    )

    @Test
    fun `returns the single healthy candidate`() = runTest {
        server1.enqueue(MockResponse().setResponseCode(200))

        val result = selector.getActiveUrl(listOf(candidate(server1)))

        assertTrue(result.isSuccess)
        assertTrue(result.getOrThrow().startsWith("http://"))
    }

    @Test
    fun `returns failure when no candidate responds`() = runTest {
        server1.shutdown()
        server2.shutdown()

        val result = selector.getActiveUrl(
            listOf(
                candidate(server1, "a", timeoutMs = 200),
                candidate(server2, "b", timeoutMs = 200),
            )
        )

        assertTrue(result.isFailure)
    }

    @Test
    fun `returns failure on empty candidate list`() = runTest {
        val result = selector.getActiveUrl(emptyList())

        assertTrue(result.isFailure)
    }

    @Test
    fun `cached result is returned without new health check`() = runTest {
        server1.enqueue(MockResponse().setResponseCode(200))

        selector.getActiveUrl(listOf(candidate(server1)))
        server1.shutdown()

        val cached = selector.getActiveUrl(listOf(candidate(server1)))
        assertTrue(cached.isSuccess)
    }

    @Test
    fun `invalidateAndReselect re-probes after cache is cleared`() = runTest {
        server1.enqueue(MockResponse().setResponseCode(200))
        server2.enqueue(MockResponse().setResponseCode(200))

        selector.getActiveUrl(listOf(candidate(server1, "a", priority = 0)))
        server1.shutdown()

        val second = selector.invalidateAndReselect(
            listOf(
                candidate(server2, "b", priority = 0),
            )
        )
        assertTrue(second.isSuccess)
    }

    @Test
    fun `getLastKnownUrl is null before any probe`() {
        assertEquals(null, selector.getLastKnownUrl())
    }

    @Test
    fun `getLastKnownUrl returns cached url after successful probe`() = runTest {
        server1.enqueue(MockResponse().setResponseCode(200))

        selector.getActiveUrl(listOf(candidate(server1)))

        assertTrue(selector.getLastKnownUrl()?.startsWith("http://") == true)
    }
}
