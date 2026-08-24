package com.mymangareader.contentdigest.chapter

import com.mymangareader.core.database.ServerGroupDao
import com.mymangareader.core.database.ServerGroupEntity
import com.mymangareader.core.database.ServerUrlDao
import com.mymangareader.core.database.ServerUrlEntity
import com.mymangareader.contentdigest.page.PageDigest
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

// Controls every ServerPlugin.Chapter operation buildChapterDigest calls — chapterResult (vital),
// progressResult (tolerated), and per-page dimensions (via dimensionsForPage).
private class FakePlugin(
    var chapterResult: Result<PluginChapter> = Result.success(
        PluginChapter(
            id = "c1", title = "Chapter 1", number = "1", pageCount = 2, pagesRead = 0, isSpecial = false,
            decimalNumber = 1.0, specialLabel = "1", createdUtc = "2026-01-01T00:00:00",
            lastReadingProgressUtc = "2026-01-02T00:00:00", fileFormat = "archive",
        ),
    ),
    var progressResult: Result<PluginProgress?> = Result.success(PluginProgress(pageIndex = 1, updatedAtUtc = null)),
    var dimensionsForPage: (Int) -> Result<PluginPageDimension> = { Result.success(PluginPageDimension(width = 800, height = 1200)) },
    var urlForPage: (Int) -> Result<String> = { pageIndex -> Result.success("http://fake/page/$pageIndex") },
) : ServerPlugin {
    var chapterGetCallCount = 0
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
            override suspend fun get(): PluginChapter {
                chapterGetCallCount++
                return chapterResult.getOrThrow()
            }
            override fun getCoverUrl(): String = "http://fake/chapter-cover/$chapterId"
            override suspend fun setRead(isRead: Boolean) = Unit
            override suspend fun getProgress(): PluginProgress? = progressResult.getOrThrow()
            override suspend fun setProgress(pageIndex: Int) = Unit
            override val pages = object : ServerPlugin.Pages {}
            override fun page(pageIndex: Int): ServerPlugin.Page = object : ServerPlugin.Page {
                override suspend fun getDimensions(): PluginPageDimension = dimensionsForPage(pageIndex).getOrThrow()
                override fun getUrl(): String = urlForPage(pageIndex).getOrThrow()
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

class ChapterDigestTest {

    private lateinit var mockServer: MockWebServer
    private lateinit var baseUrl: String
    private lateinit var groupDao: FakeServerGroupDao
    private lateinit var urlDao: FakeServerUrlDao
    private lateinit var plugin: FakePlugin
    private lateinit var server: Server

    @Before
    fun setUp() {
        mockServer = MockWebServer()
        mockServer.start()
        baseUrl = mockServer.url("/").toString().trimEnd('/')
        groupDao = FakeServerGroupDao()
        urlDao = FakeServerUrlDao()
        plugin = FakePlugin()
        server = Server(groupDao, urlDao, mapOf("fake" to fakeRegistration(plugin)), ActiveUrlSelector(OkHttpClient()), RequestTool(OkHttpClient()))
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
    fun `success carries every chapter field`() = runTest {
        activateGroup()

        val digest = buildChapterDigest(server, "s1", "c1") as ChapterDigest.Success

        assertEquals("c1", digest.id)
        assertEquals("s1", digest.seriesId)
        assertEquals(1.0, digest.decimalNumber)
        assertEquals(1, digest.number)
        assertNull(digest.specialLabel)   // isSpecial is false in the default fake chapter — see specialLabel-specific tests below
        assertEquals(false, digest.isSpecial)
        assertEquals("Chapter 1", digest.title)
        assertEquals("2026-01-01T00:00:00", digest.createdUtc)
        assertTrue(digest.coverImage.url.endsWith("/chapter-cover/c1"))
        assertNull(digest.prevChapter)
        assertNull(digest.nextChapter)
        assertNull(digest.cache)
    }

    @Test
    fun `chapter get failure makes the whole result a Failure`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.failure(IllegalStateException("boom"))

        val digest = buildChapterDigest(server, "s1", "c1")

        assertTrue(digest is ChapterDigest.Failure)
        digest as ChapterDigest.Failure
        assertEquals("IllegalStateException", digest.error.code)
        assertEquals("boom", digest.error.message)
    }

    @Test
    fun `getProgress failure is tolerated — Success with null stoppedAtPageIndex`() = runTest {
        activateGroup()
        plugin.progressResult = Result.failure(RuntimeException("no progress"))

        val digest = buildChapterDigest(server, "s1", "c1") as ChapterDigest.Success

        assertNull(digest.pages.resumePoint?.stoppedAtPageIndex)
    }

    @Test
    fun `resumePoint carries stoppedAtPageIndex and recordedAtEpochMs when both are available`() = runTest {
        activateGroup()

        val digest = buildChapterDigest(server, "s1", "c1") as ChapterDigest.Success

        assertEquals(1, digest.pages.resumePoint?.stoppedAtPageIndex)
        assertEquals(1767312000000L, digest.pages.resumePoint?.recordedAtEpochMs)
    }

    @Test
    fun `resumePoint is null when neither stoppedAtPageIndex nor recordedAtEpochMs are available`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.success(
            PluginChapter(
                id = "c1", title = "Chapter 1", number = "1", pageCount = 0, pagesRead = 0, isSpecial = false,
                decimalNumber = 1.0, specialLabel = "1", createdUtc = null, lastReadingProgressUtc = null, fileFormat = null,
            ),
        )
        plugin.progressResult = Result.success(null)

        val digest = buildChapterDigest(server, "s1", "c1") as ChapterDigest.Success

        assertNull(digest.pages.resumePoint)
    }

    // ── number derivation ───────────────────────────────────────────────

    @Test
    fun `number is decimalNumber truncated when it's a whole number`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.success(baseChapter(decimalNumber = 5.0))

        val digest = buildChapterDigest(server, "s1", "c1") as ChapterDigest.Success

        assertEquals(5, digest.number)
    }

    @Test
    fun `number is null when decimalNumber is fractional`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.success(baseChapter(decimalNumber = 5.5))

        val digest = buildChapterDigest(server, "s1", "c1") as ChapterDigest.Success

        assertNull(digest.number)
    }

    @Test
    fun `number is null when decimalNumber is null`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.success(baseChapter(decimalNumber = null))

        val digest = buildChapterDigest(server, "s1", "c1") as ChapterDigest.Success

        assertNull(digest.number)
    }

    // ── specialLabel ─────────────────────────────────────────────────────

    @Test
    fun `specialLabel is populated only when isSpecial is true`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.success(baseChapter(specialLabel = "Extra", isSpecial = true))

        val digest = buildChapterDigest(server, "s1", "c1") as ChapterDigest.Success

        assertEquals("Extra", digest.specialLabel)
    }

    @Test
    fun `specialLabel is null when isSpecial is false, even if specialLabel is present`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.success(baseChapter(specialLabel = "1", isSpecial = false))

        val digest = buildChapterDigest(server, "s1", "c1") as ChapterDigest.Success

        assertNull(digest.specialLabel)
    }

    @Test
    fun `specialLabel is null when isSpecial is null`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.success(baseChapter(specialLabel = "1", isSpecial = null))

        val digest = buildChapterDigest(server, "s1", "c1") as ChapterDigest.Success

        assertNull(digest.specialLabel)
    }

    // ── readStatus ───────────────────────────────────────────────────────

    @Test
    fun `readStatus is UNREAD when readCount is zero`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.success(baseChapter(pageCount = 5, pagesRead = 0))

        val digest = buildChapterDigest(server, "s1", "c1") as ChapterDigest.Success

        assertEquals(ChapterFields.ReadStatus.UNREAD, digest.readStatus)
    }

    @Test
    fun `readStatus is READ when readCount reaches count`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.success(baseChapter(pageCount = 5, pagesRead = 5))

        val digest = buildChapterDigest(server, "s1", "c1") as ChapterDigest.Success

        assertEquals(ChapterFields.ReadStatus.READ, digest.readStatus)
    }

    @Test
    fun `readStatus is IN_PROGRESS when readCount is between zero and count`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.success(baseChapter(pageCount = 5, pagesRead = 2))

        val digest = buildChapterDigest(server, "s1", "c1") as ChapterDigest.Success

        assertEquals(ChapterFields.ReadStatus.IN_PROGRESS, digest.readStatus)
    }

    @Test
    fun `readStatus falls back to UNREAD when count or readCount is null`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.success(baseChapter(pageCount = null, pagesRead = 3))

        val digest = buildChapterDigest(server, "s1", "c1") as ChapterDigest.Success

        assertEquals(ChapterFields.ReadStatus.UNREAD, digest.readStatus)
    }

    // ── pages.list / pages.status ────────────────────────────────────────

    @Test
    fun `pages list is built by calling Page per index, in order`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.success(baseChapter(pageCount = 3))

        val digest = buildChapterDigest(server, "s1", "c1", full = true) as ChapterDigest.Success

        assertEquals(3, digest.pages.total)
        assertEquals(listOf(0, 1, 2), digest.pages.list.map { (it as PageDigest.Success).number })
    }

    @Test
    fun `pages status is SUCCESS when every page succeeds`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.success(baseChapter(pageCount = 2))

        val digest = buildChapterDigest(server, "s1", "c1", full = true) as ChapterDigest.Success

        assertEquals(ChapterFields.PagesStatus.SUCCESS, digest.pages.status)
    }

    @Test
    fun `pages status is ERROR when every page's getUrl fails`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.success(baseChapter(pageCount = 2))
        plugin.urlForPage = { Result.failure(RuntimeException("dead")) }

        val digest = buildChapterDigest(server, "s1", "c1", full = true) as ChapterDigest.Success

        assertEquals(ChapterFields.PagesStatus.ERROR, digest.pages.status)
        assertTrue(digest.pages.list.all { it is PageDigest.Failure })
    }

    @Test
    fun `pages status is PARTIAL when some pages fail getUrl and others succeed`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.success(baseChapter(pageCount = 3))
        plugin.urlForPage = { index -> if (index == 1) Result.failure(RuntimeException("bad")) else Result.success("http://fake/page/$index") }

        val digest = buildChapterDigest(server, "s1", "c1", full = true) as ChapterDigest.Success

        assertEquals(ChapterFields.PagesStatus.PARTIAL, digest.pages.status)
    }

    @Test
    fun `a getDimensions failure on one page is tolerated and doesn't affect pages status`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.success(baseChapter(pageCount = 3))
        plugin.dimensionsForPage = { index -> if (index == 1) Result.failure(RuntimeException("bad")) else Result.success(PluginPageDimension(800, 1200)) }

        val digest = buildChapterDigest(server, "s1", "c1", full = true) as ChapterDigest.Success

        // getDimensions() failing is tolerated inside PageDigest (still Success, per Task 018) —
        // so pages.status stays SUCCESS even though page 1 has no usable dimensions.
        assertEquals(ChapterFields.PagesStatus.SUCCESS, digest.pages.status)
    }

    // ── full=false (default) ─────────────────────────────────────────────

    @Test
    fun `full defaults to false — pages list is empty, status and total are null`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.success(baseChapter(pageCount = 3))

        val digest = buildChapterDigest(server, "s1", "c1") as ChapterDigest.Success

        assertTrue(digest.pages.list.isEmpty())
        assertNull(digest.pages.status)
        assertNull(digest.pages.total)
        // count/readCount/fileFormat/resumePoint don't depend on pages.list — still populated
        assertEquals(3, digest.pages.count)
    }

    // ── totalWidthPx / totalHeightPx ─────────────────────────────────────

    @Test
    fun `totalWidthPx and totalHeightPx are summed when every page has usable dimensions`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.success(baseChapter(pageCount = 2))
        plugin.dimensionsForPage = { Result.success(PluginPageDimension(width = 100, height = 200)) }

        val digest = buildChapterDigest(server, "s1", "c1", full = true) as ChapterDigest.Success

        assertEquals(200, digest.pages.totalWidthPx)
        assertEquals(400, digest.pages.totalHeightPx)
    }

    @Test
    fun `totalWidthPx and totalHeightPx are null when a page has zero dimensions`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.success(baseChapter(pageCount = 2))
        plugin.dimensionsForPage = { index -> if (index == 0) Result.success(PluginPageDimension(0, 0)) else Result.success(PluginPageDimension(100, 200)) }

        val digest = buildChapterDigest(server, "s1", "c1", full = true) as ChapterDigest.Success

        assertNull(digest.pages.totalWidthPx)
        assertNull(digest.pages.totalHeightPx)
    }

    @Test
    fun `totalWidthPx and totalHeightPx are null when pages list is empty`() = runTest {
        activateGroup()
        plugin.chapterResult = Result.success(baseChapter(pageCount = 0))

        val digest = buildChapterDigest(server, "s1", "c1") as ChapterDigest.Success

        assertNull(digest.pages.totalWidthPx)
        assertNull(digest.pages.totalHeightPx)
    }

    // ── prevChapter / nextChapter (optional params) ────────────────────

    @Test
    fun `prevChapter and nextChapter are carried through unchanged (Failure neighbor)`() = runTest {
        activateGroup()
        val neighbor = ChapterNeighborDigest.Failure(com.mymangareader.contentdigest.error.ErrorDigest("X", "boom"))

        val digest = buildChapterDigest(server, "s1", "c1", prevChapter = neighbor, nextChapter = null) as ChapterDigest.Success

        assertEquals(neighbor, digest.prevChapter)
        assertNull(digest.nextChapter)
    }

    @Test
    fun `prevChapter and nextChapter are carried through unchanged (Success neighbor)`() = runTest {
        activateGroup()
        val neighborDigest = buildChapterDigest(server, "s1", "c0") as ChapterDigest.Success
        val neighbor = ChapterNeighborDigest.Success(
            id = neighborDigest.id,
            seriesId = neighborDigest.seriesId,
            decimalNumber = neighborDigest.decimalNumber,
            number = neighborDigest.number,
            specialLabel = neighborDigest.specialLabel,
            isSpecial = neighborDigest.isSpecial,
            title = neighborDigest.title,
            createdUtc = neighborDigest.createdUtc,
            coverImage = neighborDigest.coverImage,
            readStatus = neighborDigest.readStatus,
            pages = neighborDigest.pages,
            resolvedAtEpochMs = neighborDigest.resolvedAtEpochMs,
            server = neighborDigest.server,
            cache = null,
        )

        val digest = buildChapterDigest(server, "s1", "c1", prevChapter = neighbor, nextChapter = neighbor) as ChapterDigest.Success

        assertEquals(neighbor, digest.prevChapter)
        assertEquals(neighbor, digest.nextChapter)
        assertEquals(neighborDigest.id, (digest.prevChapter as ChapterNeighborDigest.Success).id)
    }

    // ── knownChapter (Series-supplied PluginChapter) ────────────────────

    @Test
    fun `a complete knownChapter skips chapter get entirely`() = runTest {
        activateGroup()
        val known = baseChapter()

        val digest = buildChapterDigest(server, "s1", "c1", knownChapter = known) as ChapterDigest.Success

        assertEquals(0, plugin.chapterGetCallCount)
        assertEquals(known.id, digest.id)
        assertEquals(known.title, digest.title)
    }

    @Test
    fun `an incomplete knownChapter (one field missing) falls back to chapter get entirely`() = runTest {
        activateGroup()
        val incomplete = baseChapter(fileFormat = null)

        val digest = buildChapterDigest(server, "s1", "c1", knownChapter = incomplete) as ChapterDigest.Success

        assertEquals(1, plugin.chapterGetCallCount)
        // the real chapter.get() result wins entirely — not a partial merge with `incomplete`
        assertEquals("archive", digest.pages.fileFormat)
    }

    @Test
    fun `no knownChapter always calls chapter get, same as before`() = runTest {
        activateGroup()

        buildChapterDigest(server, "s1", "c1")

        assertEquals(1, plugin.chapterGetCallCount)
    }

    @Test
    fun `server and resolvedAtEpochMs come from getCoverImage when chapter get was skipped`() = runTest {
        activateGroup()
        val known = baseChapter()

        val digest = buildChapterDigest(server, "s1", "c1", knownChapter = known) as ChapterDigest.Success

        assertTrue(digest.resolvedAtEpochMs > 0)
        assertEquals(baseUrl, digest.server.url)
    }

    @Test
    fun `no active group makes the whole result a Failure, not a crash`() = runTest {
        val digest = buildChapterDigest(server, "s1", "c1")

        assertTrue(digest is ChapterDigest.Failure)
    }

    private fun baseChapter(
        id: String = "c1",
        title: String = "Chapter 1",
        number: String? = "1",
        pageCount: Int? = 2,
        pagesRead: Int? = 0,
        isSpecial: Boolean? = false,
        decimalNumber: Double? = 1.0,
        specialLabel: String? = "1",
        createdUtc: String? = "2026-01-01T00:00:00",
        lastReadingProgressUtc: String? = "2026-01-02T00:00:00",
        fileFormat: String? = "archive",
    ) = PluginChapter(
        id = id, title = title, number = number, pageCount = pageCount, pagesRead = pagesRead, isSpecial = isSpecial,
        decimalNumber = decimalNumber, specialLabel = specialLabel, createdUtc = createdUtc,
        lastReadingProgressUtc = lastReadingProgressUtc, fileFormat = fileFormat,
    )
}
