package com.mymangareader.notifications

import com.mymangareader.cache.Cache
import com.mymangareader.core.database.CacheDao
import com.mymangareader.core.database.CacheEntity
import com.mymangareader.core.database.FollowedSeriesDao
import com.mymangareader.core.database.FollowedSeriesEntity
import com.mymangareader.core.database.PreferenceDao
import com.mymangareader.core.database.PreferenceEntity
import com.mymangareader.core.database.ServerGroupDao
import com.mymangareader.core.database.ServerGroupEntity
import com.mymangareader.core.database.ServerUrlDao
import com.mymangareader.core.database.ServerUrlEntity
import com.mymangareader.notifications.plugins.RawNotificationEvent
import com.mymangareader.preferences.Preferences
import com.mymangareader.server.Server
import com.mymangareader.server.plugins.CredentialField
import com.mymangareader.server.plugins.PluginChapter
import com.mymangareader.server.plugins.PluginPageDimension
import com.mymangareader.server.plugins.PluginProgress
import com.mymangareader.server.plugins.PluginSerial
import com.mymangareader.server.plugins.PluginSeriesMetadata
import com.mymangareader.server.plugins.ServerPlugin
import com.mymangareader.server.plugins.ServerPluginRegistration
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

// ── Fakes ──────────────────────────────────────────────────────────────────

private class FakeServerGroupDao : ServerGroupDao {
    private val rows = mutableMapOf<String, ServerGroupEntity>()

    override suspend fun upsert(entity: ServerGroupEntity) {
        rows[entity.id] = entity
    }

    override suspend fun delete(entity: ServerGroupEntity) {
        rows.remove(entity.id)
    }

    override fun observeAll(): Flow<List<ServerGroupEntity>> = MutableStateFlow(rows.values.toList())

    override suspend fun getAll(): List<ServerGroupEntity> = rows.values.toList()

    override suspend fun getById(id: String): ServerGroupEntity? = rows[id]

    override suspend fun deleteById(id: String) {
        rows.remove(id)
    }
}

private class FakeServerUrlDao : ServerUrlDao {
    private val rows = mutableMapOf<String, ServerUrlEntity>()

    override suspend fun upsert(entity: ServerUrlEntity) {
        rows[entity.id] = entity
    }

    override suspend fun delete(entity: ServerUrlEntity) {
        rows.remove(entity.id)
    }

    override fun observeByGroupId(groupId: String): Flow<List<ServerUrlEntity>> = MutableStateFlow(rows.values.filter { it.groupId == groupId }.sortedBy { it.priority })

    override suspend fun getByGroupId(groupId: String): List<ServerUrlEntity> = rows.values.filter { it.groupId == groupId }.sortedBy { it.priority }

    override suspend fun getById(id: String): ServerUrlEntity? = rows[id]

    override suspend fun deleteById(id: String) {
        rows.remove(id)
    }

    override suspend fun deleteByGroupId(groupId: String) {
        rows.values.filter { it.groupId == groupId }.forEach { rows.remove(it.id) }
    }
}

// In-memory CacheDao — just enough for a real Cache()/ActiveUrlSelector to construct against.
private class FakeCacheDao : CacheDao {
    private data class MapKey(
        val key: String,
        val variant: String,
    )

    private val entities = mutableMapOf<MapKey, CacheEntity>()

    override suspend fun getByKey(
        key: String,
        variant: String,
    ): CacheEntity? = entities[MapKey(key, variant)]

    override suspend fun upsert(entity: CacheEntity) {
        entities[MapKey(entity.key, entity.variant)] = entity
    }

    override suspend fun queryFiltered(
        keys: List<String>,
        hasKeys: Int,
        domain: String?,
        variant: String?,
    ): List<CacheEntity> = emptyList()

    override suspend fun touchLastAccessed(
        key: String,
        variant: String,
        lastAccessedAtEpochMs: Long,
    ) = Unit

    override suspend fun deleteByKey(
        key: String,
        variant: String,
    ) = Unit

    override suspend fun deleteByDomain(domain: String) = Unit

    override suspend fun deleteByVariant(
        domain: String,
        variant: String,
    ) = Unit

    override suspend fun getAllExpired(nowEpochMs: Long): List<CacheEntity> = emptyList()

    override suspend fun getOlderThan(cutoffEpochMs: Long): List<CacheEntity> = emptyList()
}

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

private class FakeServerPlugin(
    private val serialsList: List<PluginSerial>,
) : ServerPlugin {
    override val id = "fake"
    override val displayName = "Fake"
    override val version = "0.0.0"

    override val auth =
        object : ServerPlugin.Auth {
            override suspend fun authenticate() = Unit

            override suspend fun checkToken(): String? = null

            override suspend fun reauthenticate() = Unit

            override suspend fun logout() = Unit

            override fun getSession(): String? = null
        }

    override val serials =
        object : ServerPlugin.Serials {
            override suspend fun list(): List<PluginSerial> = serialsList
        }

    override fun serial(serialId: String): ServerPlugin.Serial =
        object : ServerPlugin.Serial {
            override suspend fun get(): PluginSerial = serialsList.first { it.id == serialId }

            override suspend fun getMetadata(): PluginSeriesMetadata =
                PluginSeriesMetadata(
                    description = null,
                    genres = emptyList(),
                    tags = emptyList(),
                    publicationStatus = null,
                    ageRating = null,
                    releaseYear = null,
                    language = null,
                )

            override fun getCoverUrl(): String = ""

            override val chapters =
                object : ServerPlugin.Chapters {
                    override suspend fun list(): List<PluginChapter> = emptyList()

                    override suspend fun setRead(
                        isRead: Boolean,
                        chapterIds: List<String>,
                    ) = Unit
                }

            override fun chapter(chapterId: String): ServerPlugin.Chapter =
                object : ServerPlugin.Chapter {
                    override suspend fun get(): PluginChapter = throw UnsupportedOperationException()

                    override fun getCoverUrl(): String = ""

                    override suspend fun setRead(isRead: Boolean) = Unit

                    override suspend fun getProgress(): PluginProgress? = null

                    override suspend fun setProgress(pageIndex: Int) = Unit

                    override val pages = object : ServerPlugin.Pages {}

                    override fun page(pageIndex: Int): ServerPlugin.Page =
                        object : ServerPlugin.Page {
                            override suspend fun getDimensions(): PluginPageDimension = PluginPageDimension(width = 1, height = 1)

                            override fun getUrl(): String = ""
                        }
                }
        }
}

private fun fakeSerial(
    id: String,
    name: String,
) = PluginSerial(
    id = id,
    name = name,
    coverUrl = "http://cover/$id",
    pagesRead = 0,
    totalPages = 0,
    libraryId = null,
    libraryName = null,
    lastFolderScannedUtc = null,
    lastChapterAddedUtc = null,
    latestReadDateUtc = null,
    originalName = null,
    localizedName = null,
    sortName = null,
    aniListId = null,
    malId = null,
    primaryColor = null,
    secondaryColor = null,
)

private fun fakeRegistration(serials: List<PluginSerial>): ServerPluginRegistration =
    object : ServerPluginRegistration {
        override val id = "fake"
        override val displayName = "Fake"
        override val version = "0.0.0"
        override val credentialFields =
            listOf(CredentialField("apiKey", "API Key", "string") { null })
        override val defaultHealthCheckPath = "/health"
        override val factory = { _: RequestTool, _: String, _: String ->
            FakeServerPlugin(serials) as ServerPlugin
        }
    }

// ── Tests ──────────────────────────────────────────────────────────────────

class NotificationResolverTest {
    private lateinit var mockServer: MockWebServer
    private lateinit var followedSeriesDao: FakeFollowedSeriesDao
    private lateinit var preferences: Preferences
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
        return NotificationResolver(server, followedSeriesDao, preferences)
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
    fun `shouldNotify e false quando enabled e false, mesmo com scopeAll true`() =
        runTest {
            resolver = buildResolver()
            preferences.put("enabled", "false", domain = "notifications")
            preferences.put("scopeAll", "true", domain = "notifications")

            assertFalse(resolver.shouldNotify(resolvedEvent()))
        }

    @Test
    fun `shouldNotify e true quando enabled e scopeAll true, independente de Following`() =
        runTest {
            resolver = buildResolver()
            preferences.put("enabled", "true", domain = "notifications")
            preferences.put("scopeAll", "true", domain = "notifications")

            assertTrue(resolver.shouldNotify(resolvedEvent()))
        }

    @Test
    fun `shouldNotify e true quando enabled e scopeFollowedOnly true e a serie esta seguida`() =
        runTest {
            resolver = buildResolver()
            followedSeriesDao.follow(FollowedSeriesEntity(seriesId = "1", followedAtMs = 0))
            preferences.put("enabled", "true", domain = "notifications")
            preferences.put("scopeFollowedOnly", "true", domain = "notifications")

            assertTrue(resolver.shouldNotify(resolvedEvent(seriesId = "1")))
        }

    @Test
    fun `shouldNotify e false quando scopeFollowedOnly true mas a serie nao esta seguida`() =
        runTest {
            resolver = buildResolver()
            preferences.put("enabled", "true", domain = "notifications")
            preferences.put("scopeFollowedOnly", "true", domain = "notifications")

            assertFalse(resolver.shouldNotify(resolvedEvent(seriesId = "1")))
        }

    @Test
    fun `shouldNotify e false quando enabled true mas nenhum scope esta ligado`() =
        runTest {
            resolver = buildResolver()
            preferences.put("enabled", "true", domain = "notifications")

            assertFalse(resolver.shouldNotify(resolvedEvent()))
        }

    @Test
    fun `shouldNotify e true quando os dois scopes estao true, tratado como notificar tudo`() =
        runTest {
            resolver = buildResolver()
            preferences.put("enabled", "true", domain = "notifications")
            preferences.put("scopeAll", "true", domain = "notifications")
            preferences.put("scopeFollowedOnly", "true", domain = "notifications")

            assertTrue(resolver.shouldNotify(resolvedEvent()))
        }
}
