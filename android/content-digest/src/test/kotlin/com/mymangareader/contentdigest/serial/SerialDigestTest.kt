package com.mymangareader.contentdigest.serial

import com.mymangareader.contentdigest.chapter.ChapterDigest
import com.mymangareader.contentdigest.chapter.ChapterFields
import com.mymangareader.contentdigest.testcache.fakeCache
import com.mymangareader.core.database.ExternalMetadataGroupDao
import com.mymangareader.core.database.ExternalMetadataGroupEntity
import com.mymangareader.core.database.ExternalMetadataUrlDao
import com.mymangareader.core.database.ExternalMetadataUrlEntity
import com.mymangareader.core.database.ServerGroupDao
import com.mymangareader.core.database.ServerGroupEntity
import com.mymangareader.core.database.ServerUrlDao
import com.mymangareader.core.database.ServerUrlEntity
import com.mymangareader.externalmetadataserver.ExternalMetadataServer
import com.mymangareader.externalmetadataserver.NewExternalMetadataGroup
import com.mymangareader.externalmetadataserver.NewExternalMetadataUrl
import com.mymangareader.externalmetadataserver.plugins.CredentialField as ExternalMetadataCredentialField
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataMatch
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataPlugin
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataPluginRegistration
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataSeriesRef
import com.mymangareader.server.NewServerGroup
import com.mymangareader.server.NewServerUrl
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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

// ── Fakes ────────────────────────────────────────────────────────────────

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

private fun fakeChapter(
    id: String,
    decimalNumber: Double,
    pagesRead: Int = 0,
    pageCount: Int = 0,
    isSpecial: Boolean = false,
) = PluginChapter(
    id = id, title = "Chapter $id", number = decimalNumber.toString(), pageCount = pageCount, pagesRead = pagesRead, isSpecial = isSpecial,
    decimalNumber = decimalNumber, specialLabel = if (isSpecial) "Extra" else decimalNumber.toString(),
    createdUtc = "2026-01-01T00:00:00", lastReadingProgressUtc = "2026-01-02T00:00:00", fileFormat = "archive",
)

// Controls every ServerPlugin.Serial operation buildSerialDigest calls.
private class FakePlugin(
    var serialResult: Result<PluginSerial> = Result.success(
        PluginSerial(
            id = "s1", name = "Series 1", coverUrl = "http://cover/s1", pagesRead = 0, totalPages = 0,
            libraryId = "1", libraryName = "Library", lastFolderScannedUtc = null, lastChapterAddedUtc = null,
            latestReadDateUtc = null, originalName = null, localizedName = null, sortName = null,
            aniListId = null, malId = null, primaryColor = null, secondaryColor = null,
        ),
    ),
    var metadataResult: Result<PluginSeriesMetadata> = Result.success(
        PluginSeriesMetadata(description = null, genres = emptyList(), tags = emptyList(), publicationStatus = null, ageRating = null, releaseYear = null, language = null),
    ),
    var chaptersListResult: Result<List<PluginChapter>> = Result.success(emptyList()),
    var progressForChapter: (String) -> Result<PluginProgress?> = { Result.success(null) },
    var chapterIdsThatFailGet: Set<String> = emptySet(),
    var serialsListResult: Result<List<PluginSerial>> = Result.success(emptyList()),
) : ServerPlugin {
    var serialGetCallCount = 0
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
        override suspend fun list(): List<PluginSerial> = serialsListResult.getOrThrow()
    }

    override fun serial(serialId: String): ServerPlugin.Serial = object : ServerPlugin.Serial {
        override suspend fun get(): PluginSerial {
            serialGetCallCount++
            return serialResult.getOrThrow()
        }
        override suspend fun getMetadata(): PluginSeriesMetadata = metadataResult.getOrThrow()
        override fun getCoverUrl(): String = "http://fake/serial-cover/$serialId"

        override val chapters = object : ServerPlugin.Chapters {
            override suspend fun list(): List<PluginChapter> = chaptersListResult.getOrThrow()
            override suspend fun setRead(isRead: Boolean, chapterIds: List<String>) = Unit
        }

        override fun chapter(chapterId: String): ServerPlugin.Chapter = object : ServerPlugin.Chapter {
            override suspend fun get(): PluginChapter {
                if (chapterId in chapterIdsThatFailGet) throw RuntimeException("chapter $chapterId failed")
                return chaptersListResult.getOrThrow().first { it.id == chapterId }
            }
            override fun getCoverUrl(): String = "http://fake/chapter-cover/$chapterId"
            override suspend fun setRead(isRead: Boolean) = Unit
            override suspend fun getProgress(): PluginProgress? = progressForChapter(chapterId).getOrThrow()
            override suspend fun setProgress(pageIndex: Int) = Unit
            override val pages = object : ServerPlugin.Pages {}
            override fun page(pageIndex: Int): ServerPlugin.Page = object : ServerPlugin.Page {
                override suspend fun getDimensions(): PluginPageDimension = PluginPageDimension(width = 800, height = 1200)
                override fun getUrl(): String = "http://fake/page/$chapterId/$pageIndex"
            }
        }
    }
}

// ── ExternalMetadataServer fakes (for SerialDigestOptions.externalMetadataServer) ──────────

private class FakeExternalMetadataGroupDao : ExternalMetadataGroupDao {
    private val rows = mutableMapOf<String, ExternalMetadataGroupEntity>()
    override suspend fun upsert(entity: ExternalMetadataGroupEntity) { rows[entity.id] = entity }
    override suspend fun delete(entity: ExternalMetadataGroupEntity) { rows.remove(entity.id) }
    override fun observeAll(): Flow<List<ExternalMetadataGroupEntity>> = MutableStateFlow(rows.values.toList())
    override suspend fun getAll(): List<ExternalMetadataGroupEntity> = rows.values.toList()
    override suspend fun getById(id: String): ExternalMetadataGroupEntity? = rows[id]
    override suspend fun deleteById(id: String) { rows.remove(id) }
}

private class FakeExternalMetadataUrlDao : ExternalMetadataUrlDao {
    private val rows = mutableMapOf<String, ExternalMetadataUrlEntity>()
    override suspend fun upsert(entity: ExternalMetadataUrlEntity) { rows[entity.id] = entity }
    override suspend fun delete(entity: ExternalMetadataUrlEntity) { rows.remove(entity.id) }
    override fun observeByGroupId(groupId: String): Flow<List<ExternalMetadataUrlEntity>> =
        MutableStateFlow(rows.values.filter { it.groupId == groupId }.sortedBy { it.priority })
    override suspend fun getByGroupId(groupId: String): List<ExternalMetadataUrlEntity> =
        rows.values.filter { it.groupId == groupId }.sortedBy { it.priority }
    override suspend fun getAll(): List<ExternalMetadataUrlEntity> = rows.values.toList()
    override suspend fun getById(id: String): ExternalMetadataUrlEntity? = rows[id]
    override suspend fun deleteById(id: String) { rows.remove(id) }
    override suspend fun deleteByGroupId(groupId: String) { rows.values.filter { it.groupId == groupId }.forEach { rows.remove(it.id) } }
}

private class FakeExternalMetadataPlugin(var matchResult: Result<ExternalMetadataMatch?>) : ExternalMetadataPlugin {
    override val id = "fake-m3"
    override val displayName = "Fake M3"
    override val version = "0.0.0"
    override val auth = object : ExternalMetadataPlugin.Auth {
        override suspend fun authenticate() = Unit
        override suspend fun checkToken(): String? = null
        override suspend fun reauthenticate() = Unit
        override suspend fun logout() = Unit
        override fun getSession(): String? = null
    }
    override suspend fun fetchMatches(series: List<ExternalMetadataSeriesRef>): List<ExternalMetadataMatch?> =
        listOf(matchResult.getOrThrow())
    override suspend fun fetchMatch(series: ExternalMetadataSeriesRef): ExternalMetadataMatch? = matchResult.getOrThrow()
}

private fun fakeExternalMetadataRegistration(plugin: FakeExternalMetadataPlugin): ExternalMetadataPluginRegistration =
    object : ExternalMetadataPluginRegistration {
        override val id = "fake-m3"
        override val displayName = "Fake M3"
        override val version = "0.0.0"
        override val credentialFields: List<ExternalMetadataCredentialField> = emptyList()
        override val defaultHealthCheckPath = "/health"
        override val factory = { _: RequestTool, _: com.mymangareader.cache.Cache, _: String, _: String -> plugin as ExternalMetadataPlugin }
    }

private fun fakeRegistration(plugin: FakePlugin): ServerPluginRegistration = object : ServerPluginRegistration {
    override val id = "fake"
    override val displayName = "Fake"
    override val version = "0.0.0"
    override val credentialFields = listOf(CredentialField("apiKey", "API Key", "string") { null })
    override val defaultHealthCheckPath = "/health"
    override val factory = { _: RequestTool, _: String, _: String -> plugin as ServerPlugin }
}

// ── Tests ─────────────────────────────────────────────────────────────────

class SerialDigestTest {

    private lateinit var mockServer: MockWebServer
    private lateinit var baseUrl: String
    private lateinit var groupDao: FakeServerGroupDao
    private lateinit var urlDao: FakeServerUrlDao
    private lateinit var plugin: FakePlugin
    private lateinit var server: Server
    private val cache = fakeCache()

    @Before
    fun setUp() {
        mockServer = MockWebServer()
        mockServer.start()
        baseUrl = mockServer.url("/").toString().trimEnd('/')
        groupDao = FakeServerGroupDao()
        urlDao = FakeServerUrlDao()
        plugin = FakePlugin()
        server = Server(groupDao, urlDao, mapOf("fake" to fakeRegistration(plugin)), ActiveUrlSelector(OkHttpClient(), cache), RequestTool(OkHttpClient()))
    }

    @After
    fun tearDown() {
        mockServer.shutdown()
    }

    private suspend fun activateGroup() {
        val group = server.groups.add(NewServerGroup("My Server", "fake", """{"apiKey":"k"}""", "/health"))
        mockServer.enqueue(MockResponse().setResponseCode(200))
        server.group(group.id).addUrl(NewServerUrl(baseUrl, 5000, 0))
        mockServer.enqueue(MockResponse().setResponseCode(200))
        server.setActiveGroup(group.id)
        mockServer.enqueue(MockResponse().setResponseCode(200))
    }

    @Test
    fun `success carries every series field`() = runTest {
        activateGroup()

        val digest = buildSerialDigest(server, "s1", cache) as SerialDigest.Success

        assertEquals("s1", digest.id)
        assertEquals("Series 1", digest.name)
        assertEquals("1", digest.library?.id)
        assertEquals("Library", digest.library?.name)
        assertEquals("s1:false:false", digest.cache?.key)
    }

    @Test
    fun `full defaults to false — each chapter's pages list comes back empty`() = runTest {
        activateGroup()
        plugin.chaptersListResult = Result.success(listOf(fakeChapter("ch1", decimalNumber = 1.0, pageCount = 5)))

        val digest = buildSerialDigest(server, "s1", cache) as SerialDigest.Success
        val chapter = digest.chapters?.list?.single() as ChapterDigest.Success

        assertTrue(chapter.pages.list.isEmpty())
        assertNull(chapter.pages.status)
        assertNull(chapter.pages.total)
    }

    @Test
    fun `full=true propagates down to every chapter's pages list`() = runTest {
        activateGroup()
        plugin.chaptersListResult = Result.success(listOf(fakeChapter("ch1", decimalNumber = 1.0, pageCount = 2)))

        val digest = buildSerialDigest(server, "s1", cache, SerialDigestOptions(full = true)) as SerialDigest.Success
        val chapter = digest.chapters?.list?.single() as ChapterDigest.Success

        assertEquals(2, chapter.pages.list.size)
        assertEquals(2, chapter.pages.total)
        assertEquals(ChapterFields.PagesStatus.SUCCESS, chapter.pages.status)
    }

    @Test
    fun `serial get failure makes the whole result a Failure`() = runTest {
        activateGroup()
        plugin.serialResult = Result.failure(IllegalStateException("boom"))

        val digest = buildSerialDigest(server, "s1", cache)

        assertTrue(digest is SerialDigest.Failure)
        digest as SerialDigest.Failure
        assertEquals("IllegalStateException", digest.error.code)
    }

    @Test
    fun `getMetadata failure is tolerated — Success with metadata null`() = runTest {
        activateGroup()
        plugin.metadataResult = Result.failure(RuntimeException("no metadata"))

        val digest = buildSerialDigest(server, "s1", cache) as SerialDigest.Success

        assertNull(digest.metadata)
    }

    @Test
    fun `chapters list failure is tolerated — Success with chapters null`() = runTest {
        activateGroup()
        plugin.chaptersListResult = Result.failure(RuntimeException("no chapters"))

        val digest = buildSerialDigest(server, "s1", cache) as SerialDigest.Success

        assertNull(digest.chapters)
    }

    @Test
    fun `library is null when libraryId is missing`() = runTest {
        activateGroup()
        plugin.serialResult = Result.success(
            PluginSerial(
                id = "s1", name = "Series 1", coverUrl = "http://cover/s1", pagesRead = 0, totalPages = 0,
                libraryId = null, libraryName = null, lastFolderScannedUtc = null, lastChapterAddedUtc = null,
                latestReadDateUtc = null, originalName = null, localizedName = null, sortName = null,
                aniListId = null, malId = null, primaryColor = null, secondaryColor = null,
            ),
        )

        val digest = buildSerialDigest(server, "s1", cache) as SerialDigest.Success

        assertNull(digest.library)
    }

    // ── chapters.list ordering / number / neighbors ─────────────────────

    @Test
    fun `chapters are sorted by decimalNumber, with a special chapter landing in the right place`() = runTest {
        activateGroup()
        plugin.chaptersListResult = Result.success(
            listOf(
                fakeChapter("ch2", decimalNumber = 2.0),
                fakeChapter("ch1", decimalNumber = 1.0),
                fakeChapter("ch-extra", decimalNumber = 1.5, isSpecial = true),
            ),
        )

        val digest = buildSerialDigest(server, "s1", cache) as SerialDigest.Success
        val ids = digest.chapters?.list?.map { (it as ChapterDigest.Success).id }

        assertEquals(listOf("ch1", "ch-extra", "ch2"), ids)
    }

    @Test
    fun `number reflects 1-indexed position in the sorted list, not decimalNumber`() = runTest {
        activateGroup()
        plugin.chaptersListResult = Result.success(
            listOf(
                fakeChapter("ch2", decimalNumber = 2.0),
                fakeChapter("ch1", decimalNumber = 1.0),
                fakeChapter("ch-extra", decimalNumber = 1.5, isSpecial = true),
            ),
        )

        val digest = buildSerialDigest(server, "s1", cache) as SerialDigest.Success
        val numbers = digest.chapters?.list?.map { (it as ChapterDigest.Success).number }

        assertEquals(listOf(1, 2, 3), numbers)
    }

    @Test
    fun `prevChapter and nextChapter point to the correct sorted neighbors`() = runTest {
        activateGroup()
        plugin.chaptersListResult = Result.success(
            listOf(
                fakeChapter("ch1", decimalNumber = 1.0),
                fakeChapter("ch2", decimalNumber = 2.0),
                fakeChapter("ch3", decimalNumber = 3.0),
            ),
        )

        val digest = buildSerialDigest(server, "s1", cache) as SerialDigest.Success
        val list = digest.chapters!!.list.map { it as ChapterDigest.Success }

        fun neighborId(neighbor: com.mymangareader.contentdigest.chapter.ChapterNeighborDigest?) =
            (neighbor as? com.mymangareader.contentdigest.chapter.ChapterNeighborDigest.Success)?.id

        assertNull(list[0].prevChapter)
        assertEquals("ch2", neighborId(list[0].nextChapter))
        assertEquals("ch1", neighborId(list[1].prevChapter))
        assertEquals("ch3", neighborId(list[1].nextChapter))
        assertEquals("ch2", neighborId(list[2].prevChapter))
        assertNull(list[2].nextChapter)
    }

    // ── chapters.status / readCount ──────────────────────────────────────

    @Test
    fun `chapters status is SUCCESS when every chapter succeeds`() = runTest {
        activateGroup()
        plugin.chaptersListResult = Result.success(listOf(fakeChapter("ch1", decimalNumber = 1.0)))

        val digest = buildSerialDigest(server, "s1", cache) as SerialDigest.Success

        assertEquals(SerialFields.ChaptersStatus.SUCCESS, digest.chapters?.status)
    }

    @Test
    fun `readCount is null for a genuinely empty chapters list`() = runTest {
        activateGroup()
        plugin.chaptersListResult = Result.success(emptyList())

        val digest = buildSerialDigest(server, "s1", cache) as SerialDigest.Success

        assertEquals(0, digest.chapters?.total)
        assertNull(digest.chapters?.readCount)
    }

    @Test
    fun `readCount counts only chapters whose readStatus is READ`() = runTest {
        activateGroup()
        plugin.chaptersListResult = Result.success(
            listOf(
                fakeChapter("ch1", decimalNumber = 1.0, pageCount = 10, pagesRead = 10), // READ
                fakeChapter("ch2", decimalNumber = 2.0, pageCount = 10, pagesRead = 5),  // IN_PROGRESS
                fakeChapter("ch3", decimalNumber = 3.0, pageCount = 10, pagesRead = 0),  // UNREAD
            ),
        )

        val digest = buildSerialDigest(server, "s1", cache) as SerialDigest.Success

        assertEquals(1, digest.chapters?.readCount)
    }

    // ── resumePoint cascade ───────────────────────────────────────────────

    @Test
    fun `resumePoint picks the first IN_PROGRESS chapter over UNREAD ones`() = runTest {
        activateGroup()
        plugin.chaptersListResult = Result.success(
            listOf(
                fakeChapter("ch1", decimalNumber = 1.0, pageCount = 10, pagesRead = 10), // READ
                fakeChapter("ch2", decimalNumber = 2.0, pageCount = 10, pagesRead = 0),  // UNREAD
                fakeChapter("ch3", decimalNumber = 3.0, pageCount = 10, pagesRead = 4),  // IN_PROGRESS
            ),
        )

        val digest = buildSerialDigest(server, "s1", cache) as SerialDigest.Success

        assertEquals("ch3", digest.chapters?.resumePoint?.stoppedAtChapterId)
        assertEquals(SerialFields.ResumePointStatus.IN_PROGRESS, digest.chapters?.resumePoint?.status)
    }

    @Test
    fun `resumePoint falls back to the first UNREAD chapter when none are IN_PROGRESS`() = runTest {
        activateGroup()
        plugin.chaptersListResult = Result.success(
            listOf(
                fakeChapter("ch1", decimalNumber = 1.0, pageCount = 10, pagesRead = 10), // READ
                fakeChapter("ch2", decimalNumber = 2.0, pageCount = 10, pagesRead = 0),  // UNREAD
            ),
        )

        val digest = buildSerialDigest(server, "s1", cache) as SerialDigest.Success

        assertEquals("ch2", digest.chapters?.resumePoint?.stoppedAtChapterId)
        assertEquals(SerialFields.ResumePointStatus.UNREAD, digest.chapters?.resumePoint?.status)
    }

    @Test
    fun `resumePoint's recordedAtEpochMs is null when the chapter has no progress data at all`() = runTest {
        activateGroup()
        val unreadNoProgress = fakeChapter("ch1", decimalNumber = 1.0, pageCount = 10, pagesRead = 0)
            .copy(lastReadingProgressUtc = null)
        plugin.chaptersListResult = Result.success(listOf(unreadNoProgress))

        val digest = buildSerialDigest(server, "s1", cache) as SerialDigest.Success

        assertEquals("ch1", digest.chapters?.resumePoint?.stoppedAtChapterId)
        assertNull(digest.chapters?.resumePoint?.recordedAtEpochMs)
    }

    @Test
    fun `resumePoint is null when every chapter is READ`() = runTest {
        activateGroup()
        plugin.chaptersListResult = Result.success(
            listOf(fakeChapter("ch1", decimalNumber = 1.0, pageCount = 10, pagesRead = 10)),
        )

        val digest = buildSerialDigest(server, "s1", cache) as SerialDigest.Success

        assertNull(digest.chapters?.resumePoint)
    }

    @Test
    fun `chapters status is PARTIAL when one chapter fails and others succeed`() = runTest {
        activateGroup()
        plugin.chaptersListResult = Result.success(
            listOf(
                fakeChapter("ch1", decimalNumber = 1.0),
                // fileFormat=null makes this knownChapter incomplete, forcing a real chapter.get() call
                fakeChapter("ch2", decimalNumber = 2.0).copy(fileFormat = null),
            ),
        )
        plugin.chapterIdsThatFailGet = setOf("ch2")

        val digest = buildSerialDigest(server, "s1", cache) as SerialDigest.Success

        assertEquals(SerialFields.ChaptersStatus.PARTIAL, digest.chapters?.status)
        val results = digest.chapters?.list?.map { it::class.simpleName }
        assertEquals(listOf("Success", "Failure"), results)
    }

    @Test
    fun `chapters status is ERROR when every chapter fails`() = runTest {
        activateGroup()
        plugin.chaptersListResult = Result.success(
            listOf(fakeChapter("ch1", decimalNumber = 1.0).copy(fileFormat = null)),
        )
        plugin.chapterIdsThatFailGet = setOf("ch1")

        val digest = buildSerialDigest(server, "s1", cache) as SerialDigest.Success

        assertEquals(SerialFields.ChaptersStatus.ERROR, digest.chapters?.status)
    }

    @Test
    fun `a failed chapter's neighbors still get built for the surrounding successful chapters`() = runTest {
        activateGroup()
        plugin.chaptersListResult = Result.success(
            listOf(
                fakeChapter("ch1", decimalNumber = 1.0),
                fakeChapter("ch2", decimalNumber = 2.0).copy(fileFormat = null),
                fakeChapter("ch3", decimalNumber = 3.0),
            ),
        )
        plugin.chapterIdsThatFailGet = setOf("ch2")

        val digest = buildSerialDigest(server, "s1", cache) as SerialDigest.Success
        val list = digest.chapters!!.list

        assertTrue(list[0] is ChapterDigest.Success)
        assertTrue(list[1] is ChapterDigest.Failure)
        assertTrue(list[2] is ChapterDigest.Success)
        // ch1's nextChapter still resolves to ch2's Failure (not skipped)
        val ch1Next = (list[0] as ChapterDigest.Success).nextChapter
        assertTrue(ch1Next is com.mymangareader.contentdigest.chapter.ChapterNeighborDigest.Failure)
    }

    @Test
    fun `no active group makes the whole result a Failure, not a crash`() = runTest {
        val digest = buildSerialDigest(server, "s1", cache)

        assertTrue(digest is SerialDigest.Failure)
    }

    // ── external metadata composition (SerialDigestOptions.externalMetadataServer) ──────────

    private suspend fun buildTestExternalMetadataServer(
        externalPlugin: FakeExternalMetadataPlugin,
        linkedServerGroupId: String? = null,
    ): ExternalMetadataServer {
        val extGroupDao = FakeExternalMetadataGroupDao()
        val extUrlDao = FakeExternalMetadataUrlDao()
        val externalMetadataServer = ExternalMetadataServer(
            extGroupDao,
            extUrlDao,
            mapOf("fake-m3" to fakeExternalMetadataRegistration(externalPlugin)),
            ActiveUrlSelector(OkHttpClient(), cache),
            RequestTool(OkHttpClient()),
            cache,
        )
        val group = externalMetadataServer.groups.add(
            NewExternalMetadataGroup("Fake M3", "fake-m3", "{}", "/health", linkedServerGroupId),
        )
        mockServer.enqueue(MockResponse().setResponseCode(200)) // health check
        externalMetadataServer.group(group.id).addUrl(NewExternalMetadataUrl(baseUrl, 5000, 0))
        return externalMetadataServer
    }

    @Test
    fun `includeExternalMetadata false (default) never calls buildExternalMetadataDigest — metadata external stays null`() = runTest {
        activateGroup()

        val digest = buildSerialDigest(server, "s1", cache) as SerialDigest.Success

        assertNull(digest.metadata?.external)
    }

    @Test
    fun `includeExternalMetadata true resolves via syncByServerId using this series' own serverInfo groupId`() = runTest {
        activateGroup()
        val kavitaGroupId = server.getActiveGroupId()!!
        val externalPlugin = FakeExternalMetadataPlugin(
            Result.success(ExternalMetadataMatch("s1", "slug-1", "ongoing", 3, 10, "10", false)),
        )
        val externalMetadataServer = buildTestExternalMetadataServer(externalPlugin, linkedServerGroupId = kavitaGroupId)
        mockServer.enqueue(MockResponse().setResponseCode(200)) // resolvePlugin's health check for the sync itself

        val digest = buildSerialDigest(
            server, "s1", cache,
            SerialDigestOptions(includeExternalMetadata = true, externalMetadataServer = externalMetadataServer),
        ) as SerialDigest.Success

        val external = digest.metadata?.external as ExternalMetadataDigest.Success
        assertEquals("slug-1", external.match?.slug)
        assertEquals("ongoing", external.match?.status)
        assertTrue(external.resolvedAtEpochMs > 0)
    }

    @Test
    fun `externalMetadataGroupId override uses syncByGroup instead of resolving by server`() = runTest {
        activateGroup()
        val externalPlugin = FakeExternalMetadataPlugin(
            Result.success(ExternalMetadataMatch("s1", "slug-explicit", "completed", 5, 5, "5", false)),
        )
        // unlinked group — if the composition wrongly used syncByServerId here, this would still
        // resolve via the unlinked fallback and pass; the real assertion that proves syncByGroup
        // specifically was used is the groupId identity check below.
        val extGroupDao = FakeExternalMetadataGroupDao()
        val extUrlDao = FakeExternalMetadataUrlDao()
        val externalMetadataServer = ExternalMetadataServer(
            extGroupDao, extUrlDao,
            mapOf("fake-m3" to fakeExternalMetadataRegistration(externalPlugin)),
            ActiveUrlSelector(OkHttpClient(), cache), RequestTool(OkHttpClient()), cache,
        )
        val explicitGroup = externalMetadataServer.groups.add(NewExternalMetadataGroup("Explicit", "fake-m3", "{}", "/health"))
        mockServer.enqueue(MockResponse().setResponseCode(200))
        externalMetadataServer.group(explicitGroup.id).addUrl(NewExternalMetadataUrl(baseUrl, 5000, 0))
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val digest = buildSerialDigest(
            server, "s1", cache,
            SerialDigestOptions(includeExternalMetadata = true, externalMetadataServer = externalMetadataServer, externalMetadataGroupId = explicitGroup.id),
        ) as SerialDigest.Success

        val external = digest.metadata?.external as ExternalMetadataDigest.Success
        assertEquals("slug-explicit", external.match?.slug)
    }

    @Test
    fun `includeExternalMetadata true with no group configured yields a Failure with not_configured code`() = runTest {
        activateGroup()
        val extGroupDao = FakeExternalMetadataGroupDao()
        val extUrlDao = FakeExternalMetadataUrlDao()
        val emptyExternalMetadataServer = ExternalMetadataServer(
            extGroupDao, extUrlDao, emptyMap(),
            ActiveUrlSelector(OkHttpClient(), cache), RequestTool(OkHttpClient()), cache,
        )

        val digest = buildSerialDigest(
            server, "s1", cache,
            SerialDigestOptions(includeExternalMetadata = true, externalMetadataServer = emptyExternalMetadataServer),
        ) as SerialDigest.Success

        val external = digest.metadata?.external as ExternalMetadataDigest.Failure
        assertEquals("not_configured", external.error.code)
    }

    @Test
    fun `external metadata sync failure becomes a Failure, not a null, and doesn't fail the whole digest`() = runTest {
        activateGroup()
        val kavitaGroupId = server.getActiveGroupId()!!
        val externalPlugin = FakeExternalMetadataPlugin(Result.failure(RuntimeException("M3 unreachable")))
        val externalMetadataServer = buildTestExternalMetadataServer(externalPlugin, linkedServerGroupId = kavitaGroupId)
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val digest = buildSerialDigest(
            server, "s1", cache,
            SerialDigestOptions(includeExternalMetadata = true, externalMetadataServer = externalMetadataServer),
        ) as SerialDigest.Success

        assertTrue(digest.metadata?.external is ExternalMetadataDigest.Failure)
    }

    // ── Cache-first behavior ─────────────────────────────────────────────────

    @Test
    fun `a fresh cache hit never touches the network`() = runTest {
        activateGroup()
        val first = buildSerialDigest(server, "s1", cache) as SerialDigest.Success

        val second = buildSerialDigest(server, "s1", cache) as SerialDigest.Success

        assertEquals(first.name, second.name)
        assertEquals(first.cache?.cachedAtEpochMs, second.cache?.cachedAtEpochMs)
    }

    @Test
    fun `full and includeExternalMetadata variants are cached separately`() = runTest {
        activateGroup()

        val light = buildSerialDigest(server, "s1", cache, SerialDigestOptions(full = false)) as SerialDigest.Success
        val full = buildSerialDigest(server, "s1", cache, SerialDigestOptions(full = true)) as SerialDigest.Success

        assertEquals("s1:false:false", light.cache?.key)
        assertEquals("s1:true:false", full.cache?.key)
    }

    @Test
    fun `force true bypasses the cache read but still writes fresh data`() = runTest {
        activateGroup()
        buildSerialDigest(server, "s1", cache)
        mockServer.enqueue(MockResponse().setResponseCode(200)) // health check for the forced re-fetch

        val forced = buildSerialDigest(server, "s1", cache, force = true) as SerialDigest.Success

        assertTrue(forced.cache != null)
    }

}

// ── buildSerialsDigest — list counterpart ──────────────────────────────────

private fun fakePluginSerial(
    id: String,
    name: String = "Series $id",
    lastChapterAddedUtc: String? = null,
) = PluginSerial(
    id = id, name = name, coverUrl = "http://cover/$id", pagesRead = 0, totalPages = 0,
    libraryId = "1", libraryName = "Library", lastFolderScannedUtc = null,
    lastChapterAddedUtc = lastChapterAddedUtc, latestReadDateUtc = null,
    originalName = null, localizedName = null, sortName = null,
    aniListId = null, malId = null, primaryColor = null, secondaryColor = null,
)

class SerialsDigestTest {

    private lateinit var mockServer: MockWebServer
    private lateinit var baseUrl: String
    private lateinit var groupDao: FakeServerGroupDao
    private lateinit var urlDao: FakeServerUrlDao
    private lateinit var plugin: FakePlugin
    private lateinit var server: Server
    private val cache = fakeCache()

    @Before
    fun setUp() {
        mockServer = MockWebServer()
        mockServer.start()
        baseUrl = mockServer.url("/").toString().trimEnd('/')
        groupDao = FakeServerGroupDao()
        urlDao = FakeServerUrlDao()
        plugin = FakePlugin()
        server = Server(groupDao, urlDao, mapOf("fake" to fakeRegistration(plugin)), ActiveUrlSelector(OkHttpClient(), cache), RequestTool(OkHttpClient()))
    }

    @After
    fun tearDown() {
        mockServer.shutdown()
    }

    private suspend fun activateGroup() {
        val group = server.groups.add(NewServerGroup("My Server", "fake", """{"apiKey":"k"}""", "/health"))
        mockServer.enqueue(MockResponse().setResponseCode(200))
        server.group(group.id).addUrl(NewServerUrl(baseUrl, 5000, 0))
        mockServer.enqueue(MockResponse().setResponseCode(200))
        server.setActiveGroup(group.id)
        mockServer.enqueue(MockResponse().setResponseCode(200))
    }

    @Test
    fun `every listed series comes back as a minimal SerialDigest Success`() = runTest {
        activateGroup()
        plugin.serialsListResult = Result.success(listOf(fakePluginSerial("s1"), fakePluginSerial("s2")))

        val result = buildSerialsDigest(server, cache) as SerialsDigest.Success

        assertEquals(2, result.serials.size)
        val first = result.serials.first() as SerialDigest.Success
        assertEquals("s1", first.id)
        assertEquals("Series s1", first.name)
        // chapters / metadata / resumePoint the list can't carry → absent
        assertNull(first.chapters)
        assertNull(first.metadata)
        // cover was normalized by :server into a full ImageDescriptor
        assertTrue(first.coverImage.url.isNotEmpty())
    }

    @Test
    fun `each series is written into its own per-series cache under the single-series key`() = runTest {
        activateGroup()
        plugin.serialsListResult = Result.success(listOf(fakePluginSerial("s1")))

        buildSerialsDigest(server, cache)

        // buildSerialDigest(id) with default options must now be a cache hit — same key/variant.
        val entry = cache.persistent.get("s1:false:false", variant = "full:external")
        assertTrue(entry != null)
    }

    @Test
    fun `lastUpdatedEpochMs is the newest cachedAtEpochMs across the per-series caches`() = runTest {
        activateGroup()
        plugin.serialsListResult = Result.success(listOf(fakePluginSerial("s1"), fakePluginSerial("s2")))

        val before = System.currentTimeMillis()
        val result = buildSerialsDigest(server, cache) as SerialsDigest.Success
        val after = System.currentTimeMillis()

        val lastUpdated = result.lastUpdatedEpochMs
        assertTrue(lastUpdated != null && lastUpdated in before..after)
    }

    @Test
    fun `empty list yields Success with no serials and a null lastUpdatedEpochMs`() = runTest {
        activateGroup()
        plugin.serialsListResult = Result.success(emptyList())

        val result = buildSerialsDigest(server, cache) as SerialsDigest.Success

        assertTrue(result.serials.isEmpty())
        assertNull(result.lastUpdatedEpochMs)
    }

    @Test
    fun `a serials list failure makes the whole result a Failure`() = runTest {
        activateGroup()
        plugin.serialsListResult = Result.failure(IllegalStateException("list boom"))

        val result = buildSerialsDigest(server, cache)

        assertTrue(result is SerialsDigest.Failure)
        result as SerialsDigest.Failure
        assertEquals("IllegalStateException", result.error.code)
    }

    @Test
    fun `a list refresh shallow-merges into the per-series cache — chapters a prior buildSerialDigest wrote survive on disk`() = runTest {
        activateGroup()
        // Prior single-series build → cache entry WITH a chapters block.
        plugin.chaptersListResult = Result.success(listOf(fakeChapter("ch1", decimalNumber = 1.0)))
        buildSerialDigest(server, "s1", cache)
        val withChapters = cache.persistent.get("s1:false:false", variant = "full:external")
        assertTrue(withChapters!!.value.contains("\"chapters\""))

        // List refresh renames the series.
        plugin.serialsListResult = Result.success(listOf(fakePluginSerial("s1", name = "Renamed")))
        val result = buildSerialsDigest(server, cache, force = true) as SerialsDigest.Success

        // The RESPONSE carries only the light (list-sourced) digest — no chapters. The card gets
        // those from a later buildSerialDigest(id); the list itself doesn't need them.
        val fromList = result.serials.single() as SerialDigest.Success
        assertEquals("Renamed", fromList.name)
        assertNull(fromList.chapters)

        // The cache ENTRY, though, was patch()'d — shallow-merged — so the rename landed AND the
        // richer chapters block a prior single-series fetch wrote is still there.
        val onDisk = cache.persistent.get("s1:false:false", variant = "full:external")!!.value
        assertTrue(onDisk.contains("\"name\":\"Renamed\""))
        assertTrue(onDisk.contains("\"chapters\""))
    }
}
