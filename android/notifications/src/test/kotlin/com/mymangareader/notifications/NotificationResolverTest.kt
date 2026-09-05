package com.mymangareader.notifications

import com.mymangareader.cache.Cache
import com.mymangareader.core.database.FollowedSeriesDao
import com.mymangareader.core.database.FollowedSeriesEntity
import com.mymangareader.core.database.PreferenceDao
import com.mymangareader.core.database.PreferenceEntity
import com.mymangareader.core.database.ServerGroupEntity
import com.mymangareader.core.database.ServerUrlEntity
import com.mymangareader.notifications.plugins.RawNotificationEvent
import com.mymangareader.preferences.Preferences
import com.mymangareader.server.Server
import com.mymangareader.server.plugins.PluginSerial
import com.mymangareader.tools.network.ActiveUrlSelector
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

// ── Fakes specific to this test (ServerGroupDao/ServerUrlDao/CacheDao/ServerPlugin fakes and
// fakeSerial/fakeRegistration live in ServerTestFakes.kt, shared with NotificationGroupResolverTest) ──

private class FakeFollowedSeriesDao : FollowedSeriesDao {
    private val ids = mutableSetOf<String>()

    override suspend fun getAllIds(): List<String> = ids.toList()

    override fun observeAllIds(): Flow<List<String>> = MutableStateFlow(ids.toList())

    override suspend fun isFollowed(seriesId: String): Boolean = seriesId in ids

    override suspend fun follow(entity: FollowedSeriesEntity) {
        ids += entity.seriesId
    }

    override suspend fun unfollow(seriesId: String) {
        ids -= seriesId
    }
}

private class FakePreferenceDao : PreferenceDao {
    private val rows = mutableMapOf<String, PreferenceEntity>()

    override suspend fun getByKey(
        key: String,
        variant: String,
    ): PreferenceEntity? = rows["$key:$variant"]

    override suspend fun upsert(entity: PreferenceEntity) {
        rows["${entity.key}:${entity.variant}"] = entity
    }

    override suspend fun deleteByKey(
        key: String,
        variant: String,
    ) {
        rows.remove("$key:$variant")
    }

    override suspend fun deleteByDomain(domain: String) {
        rows.values.filter { it.domain == domain }.forEach { rows.remove("${it.key}:${it.variant}") }
    }
}

// ── Tests ──────────────────────────────────────────────────────────────────

class NotificationResolverTest {
    private lateinit var mockServer: MockWebServer
    private lateinit var followedSeriesDao: FakeFollowedSeriesDao
    private lateinit var preferences: Preferences
    private var channelEnabled = true
    private lateinit var resolver: NotificationResolver

    private suspend fun activateGroup(
        server: Server,
        groupDao: FakeServerGroupDao,
        urlDao: FakeServerUrlDao,
    ) {
        val group = ServerGroupEntity(id = "g1", name = "Test", providerId = "fake", credentialsJson = "{}", healthCheckPath = "/health")
        groupDao.upsert(group)
        urlDao.upsert(ServerUrlEntity(id = "u1", groupId = "g1", url = mockServer.url("/").toString().trimEnd('/'), timeoutMs = 5_000, priority = 0))
        mockServer.enqueue(MockResponse().setResponseCode(200).setBody("OK"))
        server.setActiveGroup("g1")
    }

    private suspend fun buildResolver(serials: List<PluginSerial> = listOf(fakeSerial("1", "One Piece"))): NotificationResolver {
        val groupDao = FakeServerGroupDao()
        val urlDao = FakeServerUrlDao()
        val cache = Cache(FakeCacheDao())
        val server =
            Server(
                groupDao,
                urlDao,
                mapOf("fake" to fakeRegistration(serials)),
                ActiveUrlSelector(OkHttpClient(), cache),
                RequestTool(OkHttpClient()),
            )
        activateGroup(server, groupDao, urlDao)
        followedSeriesDao = FakeFollowedSeriesDao()
        preferences = Preferences(FakePreferenceDao())
        channelEnabled = true
        return NotificationResolver(server, followedSeriesDao, preferences, NotificationChannelState { channelEnabled })
    }

    @Before
    fun setUp() {
        mockServer = MockWebServer()
        mockServer.start()
    }

    @After
    fun tearDown() {
        mockServer.shutdown()
    }

    // ── resolve ──

    @Test
    fun `resolve com seriesId presente pula a busca por nome`() =
        runTest {
            resolver = buildResolver(serials = emptyList())

            val resolved =
                resolver.resolve(
                    RawNotificationEvent(seriesId = "42", seriesName = "Anything", chapterIds = null, chapterNumbers = null, detectedAtMs = 1_000L),
                )

            assertEquals("42", resolved?.seriesId)
        }

    @Test
    fun `resolve por seriesName com exatamente 1 match resolve`() =
        runTest {
            resolver = buildResolver(serials = listOf(fakeSerial("1", "One Piece")))
            mockServer.enqueue(MockResponse().setResponseCode(200).setBody("[]"))

            val resolved =
                resolver.resolve(
                    RawNotificationEvent(seriesId = null, seriesName = "One Piece", chapterIds = null, chapterNumbers = null, detectedAtMs = 1_000L),
                )

            assertEquals("1", resolved?.seriesId)
        }

    @Test
    fun `resolve por seriesName com zero matches descarta o evento`() =
        runTest {
            resolver = buildResolver(serials = listOf(fakeSerial("1", "One Piece")))
            mockServer.enqueue(MockResponse().setResponseCode(200).setBody("[]"))

            val resolved =
                resolver.resolve(
                    RawNotificationEvent(seriesId = null, seriesName = "Missing", chapterIds = null, chapterNumbers = null, detectedAtMs = 1_000L),
                )

            assertNull(resolved)
        }

    @Test
    fun `resolve por seriesName com mais de 1 match descarta o evento`() =
        runTest {
            resolver = buildResolver(serials = listOf(fakeSerial("1", "Dup"), fakeSerial("2", "Dup")))
            mockServer.enqueue(MockResponse().setResponseCode(200).setBody("[]"))

            val resolved =
                resolver.resolve(
                    RawNotificationEvent(seriesId = null, seriesName = "Dup", chapterIds = null, chapterNumbers = null, detectedAtMs = 1_000L),
                )

            assertNull(resolved)
        }

    // ── shouldNotify ──

    private fun resolvedEvent(seriesId: String = "1") = ResolvedSeriesEvent(seriesId = seriesId, seriesName = "One Piece", chapterIds = null, chapterNumbers = null, detectedAtMs = 1_000L)

    @Test
    fun `shouldNotify e false quando o canal esta desabilitado, mesmo com scopeAll true`() =
        runTest {
            resolver = buildResolver()
            channelEnabled = false
            preferences.put("scopeAll", "true", domain = "notifications")

            assertFalse(resolver.shouldNotify(resolvedEvent()))
        }

    @Test
    fun `shouldNotify e true quando o canal esta habilitado e scopeAll true, independente de Following`() =
        runTest {
            resolver = buildResolver()
            preferences.put("scopeAll", "true", domain = "notifications")

            assertTrue(resolver.shouldNotify(resolvedEvent()))
        }

    @Test
    fun `shouldNotify e true quando o canal esta habilitado e scopeFollowedOnly true e a serie esta seguida`() =
        runTest {
            resolver = buildResolver()
            followedSeriesDao.follow(FollowedSeriesEntity(seriesId = "1", followedAtMs = 0))
            preferences.put("scopeFollowedOnly", "true", domain = "notifications")

            assertTrue(resolver.shouldNotify(resolvedEvent(seriesId = "1")))
        }

    @Test
    fun `shouldNotify e false quando scopeFollowedOnly true mas a serie nao esta seguida`() =
        runTest {
            resolver = buildResolver()
            preferences.put("scopeFollowedOnly", "true", domain = "notifications")

            assertFalse(resolver.shouldNotify(resolvedEvent(seriesId = "1")))
        }

    @Test
    fun `shouldNotify e false quando o canal esta habilitado mas nenhum scope esta ligado`() =
        runTest {
            resolver = buildResolver()

            assertFalse(resolver.shouldNotify(resolvedEvent()))
        }

    @Test
    fun `shouldNotify e true quando os dois scopes estao true, tratado como notificar tudo`() =
        runTest {
            resolver = buildResolver()
            preferences.put("scopeAll", "true", domain = "notifications")
            preferences.put("scopeFollowedOnly", "true", domain = "notifications")

            assertTrue(resolver.shouldNotify(resolvedEvent()))
        }
}
