package com.mymangareader.server.plugins.kavita.auth

import com.mymangareader.tools.network.RequestTool
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class KavitaAuthTest {

    private lateinit var server: MockWebServer
    private lateinit var auth: KavitaAuth

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        val baseUrl = server.url("/").toString().trimEnd('/')
        auth = KavitaAuth(baseUrl, RequestTool(OkHttpClient()))
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `authenticate returns jwt on 200`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200)
                .setBody("""{"username":"user","token":"jwt-token-abc"}"""),
        )

        val result = auth.authenticate("my-api-key")

        assertTrue(result.isSuccess)
        assertEquals("jwt-token-abc", result.getOrThrow().token)
    }

    @Test
    fun `authenticate ignores unknown UserDto fields`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"id":0,"username":"user","email":null,"roles":[],"token":"tok","refreshToken":"r","kavitaVersion":"0.9.0.2"}""",
            ),
        )

        val result = auth.authenticate("key")
        assertEquals("tok", result.getOrThrow().token)
        assertEquals("r", result.getOrThrow().refreshToken)
    }

    @Test
    fun `authenticate returns failure on 401`() = runTest {
        server.enqueue(MockResponse().setResponseCode(401))

        val result = auth.authenticate("bad-key")

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull()?.message?.contains("401") == true)
    }

    @Test
    fun `authenticate returns failure on unexpected status`() = runTest {
        server.enqueue(MockResponse().setResponseCode(500))

        val result = auth.authenticate("key")

        assertTrue(result.isFailure)
    }

    @Test
    fun `checkApiKeyExpiry returns expiry date`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200)
                .setBody("""{"expiresAt":"2027-01-01T00:00:00Z"}"""),
        )

        val result = auth.checkApiKeyExpiry("jwt")

        assertTrue(result.isSuccess)
        assertEquals("2027-01-01T00:00:00Z", result.getOrThrow().expiresAt)
    }

    @Test
    fun `checkApiKeyExpiry handles null expiresAt`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("{}"))

        val result = auth.checkApiKeyExpiry("jwt")

        assertNull(result.getOrThrow().expiresAt)
    }

    @Test
    fun `checkApiKeyExpiry returns failure on non-200`() = runTest {
        server.enqueue(MockResponse().setResponseCode(401))

        val result = auth.checkApiKeyExpiry("expired-jwt")

        assertTrue(result.isFailure)
    }

    @Test
    fun `reauthenticate returns refreshed token pair`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200)
                .setBody("""{"token":"new-jwt","refreshToken":"new-refresh"}"""),
        )

        val result = auth.reauthenticate("old-jwt", "old-refresh")

        assertTrue(result.isSuccess)
        assertEquals("new-jwt", result.getOrThrow().token)
        assertEquals("new-refresh", result.getOrThrow().refreshToken)
    }

    @Test
    fun `reauthenticate returns failure on non-200`() = runTest {
        server.enqueue(MockResponse().setResponseCode(401))

        val result = auth.reauthenticate("old-jwt", "old-refresh")

        assertTrue(result.isFailure)
    }

    @Test
    fun `logout is a no-op`() {
        auth.logout()
    }
}
