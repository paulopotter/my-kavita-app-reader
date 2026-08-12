package com.mymangareader.features.kavita

import com.mymangareader.core.database.AuthConfigDao
import com.mymangareader.core.database.AuthConfigEntity
import com.mymangareader.tools.network.RequestTool
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

// ── Fakes ──────────────────────────────────────────────────────────────────────

private class FakeAuthConfigDao : AuthConfigDao {
    private var stored: AuthConfigEntity? = null
    private val _flow = MutableStateFlow<AuthConfigEntity?>(null)

    override suspend fun upsert(entity: AuthConfigEntity) { stored = entity; _flow.value = entity }
    override fun observe(): Flow<AuthConfigEntity?> = _flow
    override suspend fun get(): AuthConfigEntity? = stored
}

private class FakeKavitaUrlSource(private val url: String) : KavitaUrlSource {
    override suspend fun getActiveUrl(): Result<String> = Result.success(url)
    override suspend fun invalidateAndReselect(): Result<String> = Result.success(url)
    override fun getLastKnownUrl(): String? = url
}

// ── Tests ─────────────────────────────────────────────────────────────────────

class KavitaAuthFeatureTest {

    private lateinit var server: MockWebServer
    private lateinit var authDao: FakeAuthConfigDao
    private lateinit var feature: KavitaAuthFeature

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        authDao = FakeAuthConfigDao()
        val baseUrl = server.url("/").toString().trimEnd('/')
        feature = KavitaAuthFeature(FakeKavitaUrlSource(baseUrl), RequestTool(OkHttpClient()), authDao)
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `authenticate stores jwt on 200`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200)
                .setBody("""{"username":"user","token":"jwt-token-abc"}"""),
        )

        val result = feature.authenticate("my-api-key")

        assertTrue(result.isSuccess)
        assertEquals("jwt-token-abc", result.getOrThrow().jwt)
        assertEquals("jwt-token-abc", authDao.get()?.jwt)
        assertEquals("my-api-key", authDao.get()?.apiKey)
    }

    @Test
    fun `authenticate ignora campos desconhecidos do UserDto`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"id":0,"username":"user","email":null,"roles":[],"token":"token-with-extra-fields","refreshToken":"r","kavitaVersion":"0.9.0.2"}""",
            ),
        )

        val result = feature.authenticate("key")
        assertEquals("token-with-extra-fields", result.getOrThrow().jwt)
    }

    @Test
    fun `authenticate returns failure on 401`() = runTest {
        server.enqueue(MockResponse().setResponseCode(401))

        val result = feature.authenticate("bad-key")

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull()?.message?.contains("401") == true)
    }

    @Test
    fun `authenticate returns failure on unexpected status`() = runTest {
        server.enqueue(MockResponse().setResponseCode(500))

        val result = feature.authenticate("key")

        assertTrue(result.isFailure)
    }

    @Test
    fun `isAuthenticated returns false before auth`() = runTest {
        assertFalse(feature.isAuthenticated())
    }

    @Test
    fun `isAuthenticated returns true after successful auth`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("{\"username\":\"user\",\"token\":\"token\"}"))
        feature.authenticate("key")

        assertTrue(feature.isAuthenticated())
    }

    @Test
    fun `clearAuth removes jwt but keeps apiKey`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("{\"username\":\"user\",\"token\":\"token\"}"))
        feature.authenticate("key-123")

        feature.clearAuth()

        assertNull(authDao.get()?.jwt)
        assertEquals("key-123", authDao.get()?.apiKey)
    }

    @Test
    fun `getStoredApiKey returns null when no auth stored`() = runTest {
        assertNull(feature.getStoredApiKey())
    }

    @Test
    fun `getStoredApiKey returns key after auth`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("{\"username\":\"user\",\"token\":\"token\"}"))
        feature.authenticate("my-key")

        assertEquals("my-key", feature.getStoredApiKey())
    }
}
