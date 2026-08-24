package com.mymangareader.contentdigest.page

import com.mymangareader.core.database.ServerGroupDao
import com.mymangareader.core.database.ServerGroupEntity
import com.mymangareader.core.database.ServerUrlDao
import com.mymangareader.core.database.ServerUrlEntity
import com.mymangareader.server.ImageDescriptor
import com.mymangareader.server.NewServerGroup
import com.mymangareader.server.NewServerUrl
import com.mymangareader.server.Server
import com.mymangareader.server.ServerActiveInfo
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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

// ── Fakes — minimal, own to this module (not the private ones inside :server's own tests) ──

private class FakeServerGroupDao : ServerGroupDao {
    private val rows = mutableMapOf<String, ServerGroupEntity>()
    override suspend fun upsert(entity: ServerGroupEntity) { rows[entity.id] = entity }
    override suspend fun delete(entity: ServerGroupEntity) { rows.remove(entity.id) }
    override fun observeAll(): Flow<List<ServerGroupEntity>> = MutableStateFlow(rows.values.toList())
    override suspend fun getAll(): List<ServerGroupEntity> = rows.values.toList()
    override suspend fun getById(id: String): ServerGroupEntity? = rows[id]
    override suspend fun deleteById(id: String) { rows.remove(id) }
}

private class FakeServerUrlDao : ServerUrlDao {
    private val rows = mutableMapOf<String, ServerUrlEntity>()
    override suspend fun upsert(entity: ServerUrlEntity) { rows[entity.id] = entity }
    override suspend fun delete(entity: ServerUrlEntity) { rows.remove(entity.id) }
    override fun observeByGroupId(groupId: String): Flow<List<ServerUrlEntity>> =
        MutableStateFlow(rows.values.filter { it.groupId == groupId }.sortedBy { it.priority })
    override suspend fun getByGroupId(groupId: String): List<ServerUrlEntity> =
        rows.values.filter { it.groupId == groupId }.sortedBy { it.priority }
    override suspend fun getById(id: String): ServerUrlEntity? = rows[id]
    override suspend fun deleteById(id: String) { rows.remove(id) }
    override suspend fun deleteByGroupId(groupId: String) { rows.values.filter { it.groupId == groupId }.forEach { rows.remove(it.id) } }
}

// Controls exactly what page(pageIndex).getUrl()/getDimensions() return for one test — the only
// two ServerPlugin operations buildPageDigest actually calls.
private class FakePlugin(
    var urlResult: Result<String> = Result.success("http://fake/page"),
    var dimensionsResult: Result<PluginPageDimension> = Result.success(PluginPageDimension(width = 800, height = 1200)),
) : ServerPlugin {
    override val id = "fake"
    override val displayName = "Fake"
    override val version = "0.0.0"

    override val auth = object : ServerPlugin.Auth {
        override suspend fun authenticate() = Unit
        override suspend fun checkToken(): String? = null
        override suspend fun reauthenticate() = Unit
        override suspend fun logout() = Unit
        override fun getSession(): String? = null
    }

    override val serials = object : ServerPlugin.Serials {
        override suspend fun list(): List<PluginSerial> = emptyList()
    }

    override fun serial(serialId: String): ServerPlugin.Serial = object : ServerPlugin.Serial {
        override suspend fun get(): PluginSerial = PluginSerial(
            id = serialId, name = "S", pagesRead = 0, totalPages = 0,
            libraryId = null, libraryName = null, lastFolderScannedUtc = null, lastChapterAddedUtc = null,
            latestReadDateUtc = null, originalName = null, localizedName = null, sortName = null,
            aniListId = null, malId = null, primaryColor = null, secondaryColor = null,
        )
        override suspend fun getMetadata(): PluginSeriesMetadata = PluginSeriesMetadata(
            description = null, genres = emptyList(), tags = emptyList(),
            publicationStatus = null, ageRating = null, releaseYear = null, language = null,
        )
        override fun getCoverUrl(): String = "http://fake/serial-cover/$serialId"

        override val chapters = object : ServerPlugin.Chapters {
            override suspend fun list(): List<PluginChapter> = emptyList()
            override suspend fun setRead(isRead: Boolean, chapterIds: List<String>) = Unit
        }

        override fun chapter(chapterId: String): ServerPlugin.Chapter = object : ServerPlugin.Chapter {
            override suspend fun get(): PluginChapter =
                PluginChapter(
                    id = chapterId, title = "C", number = null, pageCount = 1, pagesRead = 0, isSpecial = false,
                    decimalNumber = 0.0, specialLabel = null, createdUtc = null, lastReadingProgressUtc = null,
                    fileFormat = null,
                )
            override fun getCoverUrl(): String = "http://fake/chapter-cover/$chapterId"
            override suspend fun setRead(isRead: Boolean) = Unit
            override suspend fun getProgress(): PluginProgress? = null
            override suspend fun setProgress(pageIndex: Int) = Unit
            override val pages = object : ServerPlugin.Pages {}
            override fun page(pageIndex: Int): ServerPlugin.Page = object : ServerPlugin.Page {
                override suspend fun getDimensions(): PluginPageDimension = dimensionsResult.getOrThrow()
                override fun getUrl(): String = urlResult.getOrThrow()
            }
        }
    }
}

private fun fakeRegistration(plugin: FakePlugin): ServerPluginRegistration = object : ServerPluginRegistration {
    override val id = "fake"
    override val displayName = "Fake"
    override val version = "0.0.0"
    override val credentialFields = listOf(CredentialField("apiKey", "API Key", "string") { null })
    override val factory = { _: RequestTool, _: String, _: String -> plugin as ServerPlugin }
}

// ── Tests ─────────────────────────────────────────────────────────────────

class PageDigestTest {

    private lateinit var mockServer: MockWebServer
    private lateinit var baseUrl: String
    private lateinit var groupDao: FakeServerGroupDao
    private lateinit var urlDao: FakeServerUrlDao
    private lateinit var plugin: FakePlugin
    private lateinit var server: Server
    private val fakeChapterServerInfo = ServerActiveInfo(
        groupId = "g1", groupName = "Group", providerId = "fake",
        urlId = "u1", url = "http://fake", timeoutMs = 5000, priority = 0,
    )
    private val chapter = ChapterSummary(
        id = "c1",
        seriesId = "s1",
        decimalNumber = 1.0,
        number = 1,
        specialLabel = null,
        isSpecial = false,
        title = "Chapter 1",
        createdUtc = null,
        coverImage = ImageDescriptor(
            url = "http://fake/cover", hasFetchedDimensions = false, width = null, height = null,
            aspectRatio = null, orientation = null, resolvedAtEpochMs = 1L, server = fakeChapterServerInfo, cache = null,
        ),
        resolvedAtEpochMs = 1L,
        server = fakeChapterServerInfo,
    )

    @Before
    fun setUp() {
        mockServer = MockWebServer()
        mockServer.start()
        baseUrl = mockServer.url("/").toString().trimEnd('/')
        groupDao = FakeServerGroupDao()
        urlDao = FakeServerUrlDao()
        plugin = FakePlugin(urlResult = Result.success("$baseUrl/page/c1/0"))
        server = Server(groupDao, urlDao, mapOf("fake" to fakeRegistration(plugin)), ActiveUrlSelector(), RequestTool(OkHttpClient()))
    }

    @After
    fun tearDown() {
        mockServer.shutdown()
    }

    private suspend fun activateGroup() {
        val group = server.groups.add(NewServerGroup("My Server", "fake", """{"apiKey":"k"}""", "/health"))
        mockServer.enqueue(MockResponse().setResponseCode(200)) // health check for addUrl's own resolvePlugin
        server.group(group.id).addUrl(NewServerUrl(baseUrl, 5000, 0))
        mockServer.enqueue(MockResponse().setResponseCode(200)) // health check for setActiveGroup
        server.setActiveGroup(group.id)
        mockServer.enqueue(MockResponse().setResponseCode(200)) // health check for the content calls under test
    }

    @Test
    fun `success carries url, dimensions and derived fields`() = runTest {
        activateGroup()
        plugin.dimensionsResult = Result.success(PluginPageDimension(width = 1240, height = 1754))

        val digest = buildPageDigest(server, chapter, pageIndex = 3) as PageDigest.Success

        assertEquals("c1:3", digest.id)
        assertEquals(3, digest.number)
        assertTrue(digest.url.endsWith("/page/c1/0"))
        assertEquals(1240, digest.width)
        assertEquals(1754, digest.height)
        assertTrue(digest.hasFetchedDimensions)
        assertEquals(1240.0 / 1754.0, digest.aspectRatio!!, 0.0001)
        assertEquals(PageDigest.Orientation.PORTRAIT, digest.orientation)
        assertNull(digest.cache)
        assertEquals(chapter, digest.chapter)
    }

    @Test
    fun `success reflects the last successful call's serverInfo per R11`() = runTest {
        activateGroup()

        val digest = buildPageDigest(server, chapter, pageIndex = 0) as PageDigest.Success

        // getDimensions() ran after getUrl() and succeeded — its serverInfo/resolvedAtEpochMs win.
        assertEquals(baseUrl, digest.server.url)
        assertTrue(digest.resolvedAtEpochMs > 0)
    }

    @Test
    fun `landscape orientation when aspectRatio greater than 1`() = runTest {
        activateGroup()
        plugin.dimensionsResult = Result.success(PluginPageDimension(width = 1600, height = 900))

        val digest = buildPageDigest(server, chapter, pageIndex = 0) as PageDigest.Success

        assertEquals(PageDigest.Orientation.LANDSCAPE, digest.orientation)
    }

    @Test
    fun `orientation is null for a perfect square`() = runTest {
        activateGroup()
        plugin.dimensionsResult = Result.success(PluginPageDimension(width = 500, height = 500))

        val digest = buildPageDigest(server, chapter, pageIndex = 0) as PageDigest.Success

        assertNull(digest.orientation)
        assertEquals(1.0, digest.aspectRatio)
    }

    @Test
    fun `a zero dimension counts as not fetched, not as a usable value`() = runTest {
        activateGroup()
        plugin.dimensionsResult = Result.success(PluginPageDimension(width = 0, height = 0))

        val digest = buildPageDigest(server, chapter, pageIndex = 0) as PageDigest.Success

        assertEquals(false, digest.hasFetchedDimensions)
        assertNull(digest.aspectRatio)
        assertNull(digest.orientation)
        // the raw (unusable) values still pass through — only the derived fields treat them as absent
        assertEquals(0, digest.width)
        assertEquals(0, digest.height)
    }

    @Test
    fun `getDimensions failure is tolerated — Success with null dimensions, not a Failure`() = runTest {
        activateGroup()
        plugin.dimensionsResult = Result.failure(RuntimeException("no dimension for this page"))

        val digest = buildPageDigest(server, chapter, pageIndex = 0)

        assertTrue(digest is PageDigest.Success)
        digest as PageDigest.Success
        assertNull(digest.width)
        assertNull(digest.height)
        assertEquals(false, digest.hasFetchedDimensions)
        // getDimensions() failed — server/resolvedAtEpochMs fall back to getUrl()'s own envelope (R11)
        assertEquals(baseUrl, digest.server.url)
    }

    @Test
    fun `getUrl failure makes the whole result a Failure`() = runTest {
        activateGroup()
        plugin.urlResult = Result.failure(IllegalStateException("boom"))

        val digest = buildPageDigest(server, chapter, pageIndex = 0)

        assertTrue(digest is PageDigest.Failure)
        digest as PageDigest.Failure
        assertEquals("IllegalStateException", digest.error.code)
        assertEquals("boom", digest.error.message)
    }

    @Test
    fun `no active group makes the whole result a Failure, not a crash`() = runTest {
        val digest = buildPageDigest(server, chapter, pageIndex = 0)

        assertTrue(digest is PageDigest.Failure)
    }
}
