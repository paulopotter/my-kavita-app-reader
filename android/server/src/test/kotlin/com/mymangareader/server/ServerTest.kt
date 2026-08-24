package com.mymangareader.server

import com.mymangareader.core.database.ServerGroupDao
import com.mymangareader.core.database.ServerGroupEntity
import com.mymangareader.core.database.ServerUrlDao
import com.mymangareader.core.database.ServerUrlEntity
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
import com.mymangareader.tools.network.UrlCandidate
import com.mymangareader.tools.network.UrlSelector
import java.io.IOException
import kotlin.test.assertFailsWith
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

    override fun observeByGroupId(groupId: String): Flow<List<ServerUrlEntity>> =
        MutableStateFlow(rows.values.filter { it.groupId == groupId }.sortedBy { it.priority })

    override suspend fun getByGroupId(groupId: String): List<ServerUrlEntity> =
        rows.values.filter { it.groupId == groupId }.sortedBy { it.priority }

    override suspend fun getById(id: String): ServerUrlEntity? = rows[id]

    override suspend fun deleteById(id: String) {
        rows.remove(id)
    }

    override suspend fun deleteByGroupId(groupId: String) {
        rows.values.filter { it.groupId == groupId }.forEach { rows.remove(it.id) }
    }
}

// A controllable UrlSelector double — lets network-retry tests assert exactly how many times
// each method was called, without depending on ActiveUrlSelector's real 15-minute cache or
// MockWebServer's timing for the retry scenarios specifically.
private class FakeUrlSelector(private val url: String) : UrlSelector {
    var getActiveUrlCalls = 0
    var invalidateAndReselectCalls = 0
    override suspend fun getActiveUrl(candidates: List<UrlCandidate>): Result<String> {
        getActiveUrlCalls++
        return Result.success(url)
    }
    override suspend fun invalidateAndReselect(candidates: List<UrlCandidate>): Result<String> {
        invalidateAndReselectCalls++
        return Result.success(url)
    }
    override fun getLastKnownUrl(): String? = url
}

// A minimal ServerPlugin double — records what Server called it with, so tests can assert on
// authJson content without depending on the real Kavita adapter. failSerialsListWith, when set,
// makes exactly the next serials.list() call throw that error instead of returning — used to
// simulate a dead URL for the network-retry tests.
private class FakePlugin(val authJson: String, var failSerialsListWith: Throwable? = null) : ServerPlugin {
    override val id = "fake"
    override val displayName = "Fake"
    override val version = "0.0.0"
    var authenticateCalled = false
    var tokenAfterAuth: String? = null

    override val auth = object : ServerPlugin.Auth {
        override suspend fun authenticate() {
            authenticateCalled = true
            tokenAfterAuth = "token-${authJson.hashCode()}"
        }
        override suspend fun checkToken(): String? = null
        override suspend fun reauthenticate() = Unit
        override suspend fun logout() = Unit
        override fun getSession(): String? = tokenAfterAuth?.let { """{"jwt":"$it"}""" }
    }
    override val serials = object : ServerPlugin.Serials {
        override suspend fun list(): List<PluginSerial> {
            failSerialsListWith?.let { failSerialsListWith = null; throw it }
            return listOf(fakeSerial("1"))
        }
    }

    override fun serial(serialId: String): ServerPlugin.Serial = object : ServerPlugin.Serial {
        override suspend fun get(): PluginSerial = fakeSerial(serialId)
        override suspend fun getMetadata(): PluginSeriesMetadata =
            PluginSeriesMetadata(description = null, genres = emptyList(), tags = emptyList(), publicationStatus = null, ageRating = null, releaseYear = null, language = null)
        override fun getCoverUrl(): String = "$baseUrlForFake/serial-cover/$serialId"

        override val chapters = object : ServerPlugin.Chapters {
            override suspend fun list(): List<PluginChapter> = listOf(fakeChapter("$serialId-ch1"))
            override suspend fun setRead(isRead: Boolean, chapterIds: List<String>) {
                lastSetReadBatch = isRead to chapterIds
            }
        }

        override fun chapter(chapterId: String): ServerPlugin.Chapter = object : ServerPlugin.Chapter {
            override suspend fun get(): PluginChapter = fakeChapter(chapterId)
            override fun getCoverUrl(): String = "$baseUrlForFake/chapter-cover/$chapterId"
            override suspend fun setRead(isRead: Boolean) {
                lastSetReadSingle = chapterId to isRead
            }
            override suspend fun getProgress(): PluginProgress? = PluginProgress(pageIndex = 3, updatedAtUtc = null)
            override suspend fun setProgress(pageIndex: Int) {
                lastSetProgress = chapterId to pageIndex
            }
            override val pages = object : ServerPlugin.Pages {}
            override fun page(pageIndex: Int): ServerPlugin.Page = object : ServerPlugin.Page {
                override suspend fun getDimensions(): PluginPageDimension = PluginPageDimension(width = 800, height = 1200)
                override fun getUrl(): String = "$baseUrlForFake/page/$chapterId/$pageIndex"
            }
        }
    }

    var lastSetReadBatch: Pair<Boolean, List<String>>? = null
    var lastSetReadSingle: Pair<String, Boolean>? = null
    var lastSetProgress: Pair<String, Int>? = null
    var baseUrlForFake: String = ""

    private fun fakeSerial(id: String) = PluginSerial(
        id = id, name = "Serial $id", pagesRead = 0, totalPages = 0,
        libraryId = null, libraryName = null, lastFolderScannedUtc = null, lastChapterAddedUtc = null,
        latestReadDateUtc = null, originalName = null, localizedName = null, sortName = null,
        aniListId = null, malId = null, primaryColor = null, secondaryColor = null,
    )

    private fun fakeChapter(id: String) = PluginChapter(
        id = id, title = "Chapter $id", number = null, pageCount = 1, pagesRead = 0, isSpecial = false,
        decimalNumber = 0.0, specialLabel = null, createdUtc = null, lastReadingProgressUtc = null,
        fileFormat = null,
    )
}

private fun fakeRegistration(
    id: String = "fake",
    credentialFields: List<CredentialField> = listOf(
        CredentialField("apiKey", "API Key", "string") { v -> if (v.isBlank()) "must not be blank" else null },
    ),
    // Called with the exact FakePlugin instance factory is about to hand back to Server — not a
    // separate one — so tests can track/assert on the same instance the Server actually calls.
    onFactory: (RequestTool, String, String, FakePlugin) -> Unit = { _, _, _, _ -> },
): ServerPluginRegistration = object : ServerPluginRegistration {
    override val id = id
    override val displayName = "Fake $id"
    override val version = "0.0.0"
    override val credentialFields = credentialFields
    override val factory = { requestTool: RequestTool, baseUrl: String, authJson: String ->
        val plugin = FakePlugin(authJson)
        onFactory(requestTool, baseUrl, authJson, plugin)
        plugin as ServerPlugin
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────

class ServerTest {

    private lateinit var mockServer: MockWebServer
    private lateinit var baseUrl: String
    private lateinit var groupDao: FakeServerGroupDao
    private lateinit var urlDao: FakeServerUrlDao
    private lateinit var server: Server

    @Before
    fun setUp() {
        mockServer = MockWebServer()
        mockServer.start()
        baseUrl = mockServer.url("/").toString().trimEnd('/')
        groupDao = FakeServerGroupDao()
        urlDao = FakeServerUrlDao()
        server = Server(
            groupDao,
            urlDao,
            mapOf("fake" to fakeRegistration()),
            ActiveUrlSelector(),
            RequestTool(OkHttpClient()),
        )
    }

    @After
    fun tearDown() {
        mockServer.shutdown()
    }

    private suspend fun addHealthyGroup(credentialsJson: String = """{"apiKey":"key-1"}"""): String {
        val group = server.groups.add(NewServerGroup("My Server", "fake", credentialsJson, "/health"))
        mockServer.enqueue(MockResponse().setResponseCode(200)) // health check
        server.group(group.id).addUrl(NewServerUrl(baseUrl, 5000, 0))
        return group.id
    }

    // ── providers ────────────────────────────────────────────────────────

    @Test
    fun `providers list exposes every registered plugin's identity`() {
        val providers = server.providers.list()

        assertEquals(1, providers.size)
        assertEquals("fake", providers.single().id)
        assertEquals("Fake fake", providers.single().displayName)
    }

    // ── groups CRUD ──────────────────────────────────────────────────────

    @Test
    fun `groups add rejects an unknown providerId`() = runTest {
        assertFailsWith<ServerException> {
            server.groups.add(NewServerGroup("X", "unknown-provider", """{"apiKey":"k"}""", "/health"))
        }
    }

    @Test
    fun `groups add rejects a blank name`() = runTest {
        assertFailsWith<ServerException> {
            server.groups.add(NewServerGroup("", "fake", """{"apiKey":"k"}""", "/health"))
        }
    }

    @Test
    fun `groups add rejects credentials that fail the provider's own validation`() = runTest {
        assertFailsWith<ServerException> {
            server.groups.add(NewServerGroup("X", "fake", """{"apiKey":""}""", "/health"))
        }
    }

    @Test
    fun `groups add succeeds with valid credentials`() = runTest {
        val group = server.groups.add(NewServerGroup("My Server", "fake", """{"apiKey":"key-1"}""", "/health"))

        assertEquals("My Server", group.name)
        assertEquals("fake", group.providerId)
        assertEquals("""{"apiKey":"key-1"}""", group.credentialsJson)
    }

    @Test
    fun `groups list and get reflect what was added`() = runTest {
        val created = server.groups.add(NewServerGroup("My Server", "fake", """{"apiKey":"k"}""", "/health"))

        assertEquals(listOf(created), server.groups.list())
        assertEquals(created, server.groups.get(created.id))
        assertNull(server.groups.get("missing"))
    }

    @Test
    fun `groups update rejects invalid new credentials`() = runTest {
        val group = server.groups.add(NewServerGroup("My Server", "fake", """{"apiKey":"k"}""", "/health"))

        assertFailsWith<ServerException> {
            server.groups.update(group.id, credentialsJson = """{"apiKey":""}""")
        }
    }

    @Test
    fun `groups update changes only the fields passed`() = runTest {
        val group = server.groups.add(NewServerGroup("My Server", "fake", """{"apiKey":"k"}""", "/health"))

        val updated = server.groups.update(group.id, name = "Renamed")

        assertEquals("Renamed", updated.name)
        assertEquals("""{"apiKey":"k"}""", updated.credentialsJson)
    }

    @Test
    fun `groups remove also deletes its urls`() = runTest {
        val groupId = addHealthyGroup()

        server.groups.remove(groupId)

        assertNull(server.groups.get(groupId))
        assertTrue(server.group(groupId).getUrls().isEmpty())
    }

    // ── group(id) urls CRUD ──────────────────────────────────────────────

    @Test
    fun `group addUrl rejects when the group doesn't exist`() = runTest {
        assertFailsWith<ServerException> {
            server.group("missing").addUrl(NewServerUrl("http://x", 5000, 0))
        }
    }

    @Test
    fun `group addUrl rejects a blank url`() = runTest {
        val group = server.groups.add(NewServerGroup("My Server", "fake", """{"apiKey":"k"}""", "/health"))

        assertFailsWith<ServerException> {
            server.group(group.id).addUrl(NewServerUrl("", 5000, 0))
        }
    }

    @Test
    fun `group addUrl rejects a non-positive timeout`() = runTest {
        val group = server.groups.add(NewServerGroup("My Server", "fake", """{"apiKey":"k"}""", "/health"))

        assertFailsWith<ServerException> {
            server.group(group.id).addUrl(NewServerUrl("http://x", 0, 0))
        }
    }

    @Test
    fun `group updateUrl fails for a url belonging to a different group`() = runTest {
        val groupA = server.groups.add(NewServerGroup("A", "fake", """{"apiKey":"k"}""", "/health"))
        val groupB = server.groups.add(NewServerGroup("B", "fake", """{"apiKey":"k"}""", "/health"))
        val urlInA = server.group(groupA.id).addUrl(NewServerUrl("http://a", 5000, 0))

        assertFailsWith<ServerException> {
            server.group(groupB.id).updateUrl(urlInA.id, priority = 9)
        }
    }

    @Test
    fun `group removeUrl fails for a url belonging to a different group`() = runTest {
        val groupA = server.groups.add(NewServerGroup("A", "fake", """{"apiKey":"k"}""", "/health"))
        val groupB = server.groups.add(NewServerGroup("B", "fake", """{"apiKey":"k"}""", "/health"))
        val urlInA = server.group(groupA.id).addUrl(NewServerUrl("http://a", 5000, 0))

        assertFailsWith<ServerException> {
            server.group(groupB.id).removeUrl(urlInA.id)
        }
    }

    @Test
    fun `group getUrls returns urls sorted by priority`() = runTest {
        val group = server.groups.add(NewServerGroup("A", "fake", """{"apiKey":"k"}""", "/health"))
        server.group(group.id).addUrl(NewServerUrl("http://b", 5000, 1))
        server.group(group.id).addUrl(NewServerUrl("http://a", 5000, 0))

        val urls = server.group(group.id).getUrls()

        assertEquals(listOf("http://a", "http://b"), urls.map { it.url })
    }

    // ── setActiveGroup / getActiveContent ────────────────────────────────

    @Test
    fun `getActiveContent throws when no group is active`() = runTest {
        assertFailsWith<ServerException> { server.getActiveContent() }
    }

    @Test
    fun `setActiveGroup authenticates and getActiveContent reuses that session`() = runTest {
        val groupId = addHealthyGroup()

        // ActiveUrlSelector caches the winning URL for 15 min, so a single health check response
        // covers both setActiveGroup and the getActiveContent call right after (same Server
        // instance, same UrlSelector cache).
        mockServer.enqueue(MockResponse().setResponseCode(200))
        server.setActiveGroup(groupId)
        val plugin = server.getActiveContent() as FakePlugin

        assertEquals(groupId, server.getActiveGroupId())
        assertTrue(plugin.authJson.contains(""""credentials":{"apiKey":"key-1"}"""))
        assertTrue(plugin.authJson.contains("\"session\":{\"jwt\":\"token-"))
    }

    @Test
    fun `setActiveGroup does not re-authenticate when re-selecting an already active group`() = runTest {
        val groupId = addHealthyGroup()
        var factoryCalls = 0
        val countingServer = Server(
            groupDao,
            urlDao,
            mapOf("fake" to fakeRegistration(onFactory = { _, _, _, _ -> factoryCalls++ })),
            ActiveUrlSelector(),
            RequestTool(OkHttpClient()),
        )

        mockServer.enqueue(MockResponse().setResponseCode(200)) // health check on the first (real) authenticate
        countingServer.setActiveGroup(groupId)
        val callsAfterFirst = factoryCalls
        countingServer.setActiveGroup(groupId)

        // second setActiveGroup should not call authenticate() again — only getActiveContent-style
        // factory calls happen, not a fresh authenticate() round trip
        assertEquals(callsAfterFirst, factoryCalls)
    }

    @Test
    fun `reauthenticateActiveGroup forces a fresh authenticate even with a token on file`() = runTest {
        val groupId = addHealthyGroup()
        var factoryCalls = 0
        val trackingServer = Server(
            groupDao,
            urlDao,
            mapOf("fake" to fakeRegistration(onFactory = { _, _, _, _ -> factoryCalls++ })),
            ActiveUrlSelector(),
            RequestTool(OkHttpClient()),
        )
        // Same Server/UrlSelector instance throughout — one health check response covers every
        // resolvePlugin call below (ActiveUrlSelector caches the winning URL for 15 min).
        mockServer.enqueue(MockResponse().setResponseCode(200))
        trackingServer.setActiveGroup(groupId) // 1 factory call: the authenticate() round trip
        trackingServer.getActiveContent() // reuses the token — no new factory call for auth purposes, but still builds a plugin
        val callsBeforeReauth = factoryCalls

        trackingServer.reauthenticateActiveGroup(groupId) // must call factory again to authenticate fresh

        assertTrue(factoryCalls > callsBeforeReauth)
    }

    @Test
    fun `groups update with a different credentialsJson clears the cached token for that group`() = runTest {
        val groupId = addHealthyGroup()
        mockServer.enqueue(MockResponse().setResponseCode(200)) // setActiveGroup's health check
        server.setActiveGroup(groupId)

        server.groups.update(groupId, credentialsJson = """{"apiKey":"new-key"}""")

        // after the credential change, setActiveGroup must authenticate again (not reuse the old token)
        var factoryCalls = 0
        val countingServer = Server(
            groupDao,
            urlDao,
            mapOf("fake" to fakeRegistration(onFactory = { _, _, _, _ -> factoryCalls++ })),
            ActiveUrlSelector(),
            RequestTool(OkHttpClient()),
        )
        mockServer.enqueue(MockResponse().setResponseCode(200)) // health check
        countingServer.setActiveGroup(groupId)
        assertEquals(1, factoryCalls)
    }

    // ── content tree mirror (serials/serial/chapters/chapter/page) ─────────

    private suspend fun activateGroup(): String {
        val groupId = addHealthyGroup()
        mockServer.enqueue(MockResponse().setResponseCode(200)) // setActiveGroup's health check
        server.setActiveGroup(groupId)
        return groupId
    }

    @Test
    fun `serials list delegates to the active plugin`() = runTest {
        activateGroup()
        mockServer.enqueue(MockResponse().setResponseCode(200)) // getActiveContent's health check

        val serials = server.serials.list()

        assertEquals(listOf("1"), serials.data.map { it.id })
    }

    @Test
    fun `serials list envelope carries the group and url that answered it`() = runTest {
        val groupId = activateGroup()
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val serials = server.serials.list()

        assertEquals(groupId, serials.serverInfo.groupId)
        assertEquals(baseUrl, serials.serverInfo.url)
        assertTrue(serials.resolvedAtEpochMs > 0)
    }

    @Test
    fun `serial get delegates to the active plugin with the given id`() = runTest {
        activateGroup()
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val serial = server.serial("42").get()

        assertEquals("42", serial.data.id)
    }

    @Test
    fun `serial getCoverImage delegates to the active plugin`() = runTest {
        activateGroup()
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val cover = server.serial("42").getCoverImage()

        assertTrue(cover.url.endsWith("/serial-cover/42"))
        assertFalse(cover.hasFetchedDimensions)
        assertNull(cover.width)
        assertNull(cover.height)
    }

    @Test
    fun `serial chapters list delegates to the active plugin`() = runTest {
        activateGroup()
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val chapters = server.serial("42").chapters.list()

        assertEquals(listOf("42-ch1"), chapters.data.map { it.id })
    }

    // getActiveContent() builds a fresh FakePlugin instance on every call, so asserting on
    // write side-effects (setRead/setProgress) needs a Server whose factory hands back the
    // exact same instance the write itself just ran against.
    private class PluginTrackingServer {
        val instances = mutableListOf<FakePlugin>()
        lateinit var server: Server

        fun build(groupDao: FakeServerGroupDao, urlDao: FakeServerUrlDao) {
            server = Server(
                groupDao,
                urlDao,
                mapOf("fake" to fakeRegistration(onFactory = { _, _, _, plugin -> instances += plugin })),
                ActiveUrlSelector(),
                RequestTool(OkHttpClient()),
            )
        }

        val lastPlugin get() = instances.last()
    }

    // addHealthyGroup() itself queues one extra health-check response (consumed by whichever
    // ActiveUrlSelector asks first — addUrl never hits the network, so that response is spare
    // credit for the next resolvePlugin call). A PluginTrackingServer's ActiveUrlSelector is
    // brand new, so it queues its own extra response up front to avoid depending on which
    // selector claims the spare one first.
    private suspend fun trackingServer(): PluginTrackingServer {
        val tracking = PluginTrackingServer().apply { build(groupDao, urlDao) }
        val groupId = addHealthyGroup()
        mockServer.enqueue(MockResponse().setResponseCode(200)) // setActiveGroup's health check
        tracking.server.setActiveGroup(groupId)
        mockServer.enqueue(MockResponse().setResponseCode(200)) // pre-queued for the write call under test
        return tracking
    }

    @Test
    fun `serial chapters setRead delegates isRead and chapterIds to the active plugin`() = runTest {
        val tracking = trackingServer()

        tracking.server.serial("42").chapters.setRead(true, listOf("1", "2"))

        assertEquals(true to listOf("1", "2"), tracking.lastPlugin.lastSetReadBatch)
    }

    @Test
    fun `chapter get delegates to the active plugin with the given id`() = runTest {
        activateGroup()
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val chapter = server.serial("42").chapter("100").get()

        assertEquals("100", chapter.data.id)
    }

    @Test
    fun `chapter getCoverImage delegates to the active plugin`() = runTest {
        activateGroup()
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val cover = server.serial("42").chapter("100").getCoverImage()

        assertTrue(cover.url.endsWith("/chapter-cover/100"))
        assertFalse(cover.hasFetchedDimensions)
        assertNull(cover.width)
        assertNull(cover.height)
    }

    @Test
    fun `chapter setRead delegates to the active plugin`() = runTest {
        val tracking = trackingServer()

        tracking.server.serial("42").chapter("100").setRead(true)

        assertEquals("100" to true, tracking.lastPlugin.lastSetReadSingle)
    }

    @Test
    fun `chapter getProgress delegates to the active plugin`() = runTest {
        activateGroup()
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val progress = server.serial("42").chapter("100").getProgress()

        assertEquals(3, progress.data?.pageIndex)
    }

    @Test
    fun `chapter setProgress delegates pageIndex to the active plugin`() = runTest {
        val tracking = trackingServer()

        tracking.server.serial("42").chapter("100").setProgress(7)

        assertEquals("100" to 7, tracking.lastPlugin.lastSetProgress)
    }

    @Test
    fun `page getDimensions delegates to the active plugin`() = runTest {
        activateGroup()
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val dimension = server.serial("42").chapter("100").page(1).getDimensions()

        assertEquals(800, dimension.data.width)
        assertEquals(1200, dimension.data.height)
    }

    @Test
    fun `page getUrl delegates to the active plugin`() = runTest {
        activateGroup()
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val url = server.serial("42").chapter("100").page(1).getUrl()

        assertTrue(url.data.endsWith("/page/100/1"))
    }

    @Test
    fun `page getDimensions envelope carries the group and url that answered it`() = runTest {
        val groupId = activateGroup()
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val dimension = server.serial("42").chapter("100").page(1).getDimensions()

        assertEquals(groupId, dimension.serverInfo.groupId)
        assertEquals(baseUrl, dimension.serverInfo.url)
    }

    // ── network retry (withUrlRetry) ────────────────────────────────────────

    @Test
    fun `a network failure retries once with a freshly reselected URL and succeeds`() = runTest {
        val urlSelector = FakeUrlSelector(baseUrl)
        // Only the plugin instance withUrlRetry's first attempt actually calls serials.list() on
        // should fail — setActiveGroup's own resolvePlugin call builds an earlier instance that
        // never gets there (it only calls authenticate()), so failing every instance up front
        // would make even the retry's second attempt fail too.
        var failNextServalsListCall = false
        val retryServer = Server(
            groupDao,
            urlDao,
            mapOf(
                "fake" to fakeRegistration(
                    onFactory = { _, _, _, plugin ->
                        if (failNextServalsListCall) {
                            plugin.failSerialsListWith = IOException("connection refused")
                            failNextServalsListCall = false
                        }
                    },
                ),
            ),
            urlSelector,
            RequestTool(OkHttpClient()),
        )
        val group = retryServer.groups.add(NewServerGroup("My Server", "fake", """{"apiKey":"key-1"}""", "/health"))
        retryServer.group(group.id).addUrl(NewServerUrl(baseUrl, 5000, 0))
        retryServer.setActiveGroup(group.id)

        failNextServalsListCall = true
        val serials = retryServer.serials.list()

        assertEquals(listOf("1"), serials.data.map { it.id })
        assertEquals(1, urlSelector.invalidateAndReselectCalls)
    }

    @Test
    fun `a network failure that persists after retry propagates the exception`() = runTest {
        val urlSelector = FakeUrlSelector(baseUrl)
        val instances = mutableListOf<FakePlugin>()
        val retryServer = Server(
            groupDao,
            urlDao,
            mapOf(
                "fake" to fakeRegistration(
                    onFactory = { _, _, _, plugin ->
                        plugin.failSerialsListWith = IOException("still unreachable")
                        instances += plugin
                    },
                ),
            ),
            urlSelector,
            RequestTool(OkHttpClient()),
        )
        val group = retryServer.groups.add(NewServerGroup("My Server", "fake", """{"apiKey":"key-1"}""", "/health"))
        retryServer.group(group.id).addUrl(NewServerUrl(baseUrl, 5000, 0))
        retryServer.setActiveGroup(group.id)

        assertFailsWith<IOException> { retryServer.serials.list() }
        // exactly one retry attempt: the original call plus one reselect-and-retry, no more
        assertEquals(1, urlSelector.invalidateAndReselectCalls)
    }

    // ── group.validateUrls ───────────────────────────────────────────────────

    @Test
    fun `group validateUrls returns the url the selector picked`() = runTest {
        val urlSelector = FakeUrlSelector(baseUrl)
        val validatingServer = Server(groupDao, urlDao, mapOf("fake" to fakeRegistration()), urlSelector, RequestTool(OkHttpClient()))
        val group = validatingServer.groups.add(NewServerGroup("My Server", "fake", """{"apiKey":"key-1"}""", "/health"))
        validatingServer.group(group.id).addUrl(NewServerUrl(baseUrl, 5000, 0))

        val winner = validatingServer.group(group.id).validateUrls()

        assertEquals(baseUrl, winner.url)
        assertEquals(1, urlSelector.invalidateAndReselectCalls)
    }

    @Test
    fun `group validateUrls throws when no configured url responds`() = runTest {
        val group = server.groups.add(NewServerGroup("My Server", "fake", """{"apiKey":"key-1"}""", "/health"))
        server.group(group.id).addUrl(NewServerUrl("http://unreachable.invalid", 200, 0))

        assertFailsWith<ServerException> { server.group(group.id).validateUrls() }
    }

    @Test
    fun `group validateUrls throws when the group has no urls configured`() = runTest {
        val group = server.groups.add(NewServerGroup("My Server", "fake", """{"apiKey":"key-1"}""", "/health"))

        assertFailsWith<ServerException> { server.group(group.id).validateUrls() }
    }

    // ── group.getActive / Server.getActive ──────────────────────────────────

    @Test
    fun `group getActive returns null before this group has ever been resolved`() = runTest {
        val groupId = addHealthyGroup()

        // addHealthyGroup only adds the group+url rows — it never calls setActiveGroup or any
        // content method, so resolvePlugin has never run for this group yet.
        assertNull(server.group(groupId).getActive())
    }

    @Test
    fun `group getActive reflects the url setActiveGroup itself resolved, even with no content call yet`() = runTest {
        val groupId = activateGroup()

        // activateGroup() only calls setActiveGroup — resolvePlugin already ran once to
        // authenticate, so getActive() must already report that resolution, not null.
        val active = server.group(groupId).getActive()
        assertEquals(baseUrl, active?.url)
    }

    @Test
    fun `group getActive reflects the url a later content call resolved, updating the earlier record`() = runTest {
        val groupId = activateGroup()
        mockServer.enqueue(MockResponse().setResponseCode(200)) // getActiveContent's health check

        server.serials.list()

        val active = server.group(groupId).getActive()
        assertEquals(baseUrl, active?.url)
    }

    @Test
    fun `group getActive never hits the network itself, unlike validateUrls`() = runTest {
        val urlSelector = FakeUrlSelector(baseUrl)
        val activeServer = Server(groupDao, urlDao, mapOf("fake" to fakeRegistration()), urlSelector, RequestTool(OkHttpClient()))
        val group = activeServer.groups.add(NewServerGroup("My Server", "fake", """{"apiKey":"key-1"}""", "/health"))
        activeServer.group(group.id).addUrl(NewServerUrl(baseUrl, 5000, 0))
        mockServer.enqueue(MockResponse().setResponseCode(200)) // setActiveGroup's health check
        activeServer.setActiveGroup(group.id)
        mockServer.enqueue(MockResponse().setResponseCode(200)) // serials.list()'s health check
        activeServer.serials.list()
        val callsAfterOneContentCall = urlSelector.getActiveUrlCalls + urlSelector.invalidateAndReselectCalls

        activeServer.group(group.id).getActive()

        assertEquals(callsAfterOneContentCall, urlSelector.getActiveUrlCalls + urlSelector.invalidateAndReselectCalls)
    }

    @Test
    fun `group getActive reflects the retry's final winning url, not the one that failed`() = runTest {
        val urlSelector = FakeUrlSelector(baseUrl)
        var failNextServalsListCall = false
        val retryServer = Server(
            groupDao,
            urlDao,
            mapOf(
                "fake" to fakeRegistration(
                    onFactory = { _, _, _, plugin ->
                        if (failNextServalsListCall) {
                            plugin.failSerialsListWith = IOException("connection refused")
                            failNextServalsListCall = false
                        }
                    },
                ),
            ),
            urlSelector,
            RequestTool(OkHttpClient()),
        )
        val group = retryServer.groups.add(NewServerGroup("My Server", "fake", """{"apiKey":"key-1"}""", "/health"))
        retryServer.group(group.id).addUrl(NewServerUrl(baseUrl, 5000, 0))
        retryServer.setActiveGroup(group.id)

        failNextServalsListCall = true
        retryServer.serials.list()

        // the retry's force-reselect still resolves to the same baseUrl (only one URL configured
        // in this test) — what matters is that getActive() reflects the id resolvePlugin recorded
        // on that final, successful resolution, not a stale/failed one.
        val active = retryServer.group(group.id).getActive()
        assertEquals(baseUrl, active?.url)
    }

    @Test
    fun `Server getActive returns null when no group is active`() = runTest {
        assertNull(server.getActive())
    }

    @Test
    fun `Server getActive reflects the url setActiveGroup itself resolved, even with no content call yet`() = runTest {
        activateGroup()

        assertEquals(baseUrl, server.getActive()?.url)
    }

    @Test
    fun `Server getActive delegates to the active group's getActive`() = runTest {
        activateGroup()
        mockServer.enqueue(MockResponse().setResponseCode(200)) // getActiveContent's health check

        server.serials.list()

        assertEquals(baseUrl, server.getActive()?.url)
    }

    // ── Server.getActiveInfo ─────────────────────────────────────────────────

    @Test
    fun `getActiveInfo returns null when no group is active`() = runTest {
        assertNull(server.getActiveInfo())
    }

    @Test
    fun `getActiveInfo combines the group and its active url, flattened, without credentialsJson or healthCheckPath`() = runTest {
        val groupId = activateGroup()

        val info = server.getActiveInfo()

        assertEquals(groupId, info?.groupId)
        assertEquals("My Server", info?.groupName)
        assertEquals("fake", info?.providerId)
        assertEquals(baseUrl, info?.url)
    }

    @Test
    fun `getActiveInfo reflects a later content call's resolution, not just setActiveGroup's`() = runTest {
        activateGroup()
        mockServer.enqueue(MockResponse().setResponseCode(200)) // getActiveContent's health check

        server.serials.list()

        assertEquals(baseUrl, server.getActiveInfo()?.url)
    }
}
