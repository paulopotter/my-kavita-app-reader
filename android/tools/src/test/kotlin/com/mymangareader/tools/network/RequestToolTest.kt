package com.mymangareader.tools.network

import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class RequestToolTest {

    private lateinit var server: MockWebServer
    private lateinit var tool: RequestTool

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        tool = RequestTool(OkHttpClient())
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `GET returns status and body`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"ok":true}"""))

        val result = tool.request(server.url("/api/test").toString())

        assertTrue(result.isSuccess)
        val http = result.getOrThrow()
        assertEquals(200, http.status)
        assertEquals("""{"ok":true}""", http.body)
        assertEquals("GET", server.takeRequest().method)
    }

    @Test
    fun `POST sends body and returns response`() = runTest {
        server.enqueue(MockResponse().setResponseCode(201).setBody("created"))

        val result = tool.request(
            url = server.url("/api/resource").toString(),
            method = "POST",
            body = """{"name":"test"}""",
        )

        assertTrue(result.isSuccess)
        val http = result.getOrThrow()
        assertEquals(201, http.status)
        val recorded = server.takeRequest()
        assertEquals("POST", recorded.method)
        assertEquals("""{"name":"test"}""", recorded.body.readUtf8())
    }

    @Test
    fun `custom headers are forwarded`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200))

        tool.request(
            url = server.url("/api/auth").toString(),
            headers = mapOf("Authorization" to "Bearer token123"),
        )

        val recorded = server.takeRequest()
        assertEquals("Bearer token123", recorded.getHeader("Authorization"))
    }

    @Test
    fun `DELETE sends no body`() = runTest {
        server.enqueue(MockResponse().setResponseCode(204))

        val result = tool.request(
            url = server.url("/api/item/1").toString(),
            method = "DELETE",
        )

        assertTrue(result.isSuccess)
        val recorded = server.takeRequest()
        assertEquals("DELETE", recorded.method)
        assertEquals(0L, recorded.bodySize)
    }

    @Test
    fun `non-2xx status is returned as success with status code`() = runTest {
        server.enqueue(MockResponse().setResponseCode(404).setBody("not found"))

        val result = tool.request(server.url("/missing").toString())

        assertTrue(result.isSuccess)
        assertEquals(404, result.getOrThrow().status)
    }

    @Test
    fun `connection failure returns failure result`() = runTest {
        server.shutdown()

        val result = tool.request("http://localhost:1/unreachable")

        assertTrue(result.isFailure)
    }
}
