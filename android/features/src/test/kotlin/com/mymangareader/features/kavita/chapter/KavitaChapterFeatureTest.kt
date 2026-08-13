package com.mymangareader.features.kavita.chapter

import com.mymangareader.core.database.AuthConfigDao
import com.mymangareader.core.database.AuthConfigEntity
import com.mymangareader.core.database.ChapterCacheDao
import com.mymangareader.core.database.ChapterCacheEntity
import com.mymangareader.core.database.PageCacheDao
import com.mymangareader.core.database.PageCacheEntity
import com.mymangareader.core.database.ReadingProgressDao
import com.mymangareader.core.database.ReadingProgressEntity
import com.mymangareader.features.kavita.KavitaUrlSource
import com.mymangareader.tools.network.RequestTool
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

// ── Fakes ─────────────────────────────────────────────────────────────────────

private class FakeAuthConfigDao(private var stored: AuthConfigEntity?) : AuthConfigDao {
    override suspend fun get(): AuthConfigEntity? = stored
    override suspend fun upsert(entity: AuthConfigEntity) { stored = entity }
    override fun observe(): Flow<AuthConfigEntity?> = MutableStateFlow(stored)
}

private class FakeUrlSource(private val url: String) : KavitaUrlSource {
    override suspend fun getActiveUrl() = Result.success(url)
    override suspend fun invalidateAndReselect() = Result.success(url)
    override fun getLastKnownUrl(): String? = url
}

private class FakeChapterCacheDao : ChapterCacheDao {
    val chapters = mutableMapOf<String, ChapterCacheEntity>()
    val updateCalls = mutableListOf<Triple<String, String, Int>>()

    override suspend fun getBySeriesId(seriesId: String) =
        chapters.values.filter { it.seriesId == seriesId }

    override suspend fun updateReadStatus(
        chapterId: String,
        readStatus: String,
        pagesRead: Int,
        updatedAtLocalMs: Long,
    ) {
        updateCalls.add(Triple(chapterId, readStatus, pagesRead))
        chapters[chapterId]?.let {
            chapters[chapterId] = it.copy(readStatus = readStatus, pagesRead = pagesRead)
        }
    }

    override suspend fun insertAll(chapters: List<ChapterCacheEntity>) {
        chapters.forEach { this.chapters[it.id] = it }
    }

    override suspend fun deleteBySeriesId(seriesId: String) {
        chapters.values.removeAll { it.seriesId == seriesId }
    }
}

private class FakeReadingProgressDao : ReadingProgressDao {
    var upserted: ReadingProgressEntity? = null
    var stored: ReadingProgressEntity? = null
    override suspend fun get(chapterId: String): ReadingProgressEntity? = stored
    override suspend fun upsert(entity: ReadingProgressEntity) { upserted = entity; stored = entity }
}

private class FakePageCacheDao : PageCacheDao {
    val store = mutableMapOf<String, MutableList<PageCacheEntity>>()
    var insertAllCallCount = 0

    override suspend fun getByChapterId(chapterId: String) =
        store[chapterId]?.sortedBy { it.pageIndex } ?: emptyList()

    override suspend fun countByChapterId(chapterId: String) = store[chapterId]?.size ?: 0

    override suspend fun insertAll(pages: List<PageCacheEntity>) {
        insertAllCallCount++
        pages.forEach { store.getOrPut(it.chapterId) { mutableListOf() }.add(it) }
    }

    override suspend fun deleteByChapterId(chapterId: String) {
        store.remove(chapterId)
    }

    override suspend fun replaceForChapter(chapterId: String, pages: List<PageCacheEntity>) {
        deleteByChapterId(chapterId)
        insertAll(pages)
    }
}

// ── Testes ────────────────────────────────────────────────────────────────────

class KavitaChapterFeatureTest {

    private lateinit var server: MockWebServer
    private lateinit var authDao: FakeAuthConfigDao
    private lateinit var chapterCacheDao: FakeChapterCacheDao
    private lateinit var readingProgressDao: FakeReadingProgressDao
    private lateinit var pageCacheDao: FakePageCacheDao
    private lateinit var feature: KavitaChapterFeature

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        authDao = FakeAuthConfigDao(AuthConfigEntity(jwt = "jwt-token", apiKey = "api-key"))
        chapterCacheDao = FakeChapterCacheDao()
        readingProgressDao = FakeReadingProgressDao()
        pageCacheDao = FakePageCacheDao()
        val baseUrl = server.url("/").toString().trimEnd('/')
        feature = KavitaChapterFeature(
            urlSource = FakeUrlSource(baseUrl),
            requestTool = RequestTool(OkHttpClient()),
            authConfigDao = authDao,
            chapterCacheDao = chapterCacheDao,
            readingProgressDao = readingProgressDao,
            pageCacheDao = pageCacheDao,
        )
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `markChaptersRead atualiza cache local em caso de sucesso`() = runTest {
        chapterCacheDao.insertAll(
            listOf(
                ChapterCacheEntity(
                    id = "1",
                    seriesId = "10",
                    title = "Cap 1",
                    number = "1",
                    pageCount = 20,
                    sortOrder = 1.0,
                    readStatus = "UNREAD",
                    pagesRead = 0,
                    updatedAtLocalMs = null,
                ),
            ),
        )
        server.enqueue(MockResponse().setResponseCode(200))

        val result = feature.markChaptersRead("10", listOf("1"))

        assertTrue(result.isSuccess)
        assertEquals("READ", chapterCacheDao.chapters["1"]?.readStatus)
        assertEquals(20, chapterCacheDao.chapters["1"]?.pagesRead)
    }

    @Test
    fun `markChaptersRead envia body no formato MarkVolumesReadDto`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200))

        feature.markChaptersRead("10", listOf("1", "2"))

        val body = server.takeRequest().body.readUtf8()
        assertEquals(
            """{"seriesId":10,"volumeIds":[],"chapterIds":[1,2],"generateReadingSession":false}""",
            body,
        )
    }

    @Test
    fun `markChaptersUnread atualiza cache local em caso de sucesso`() = runTest {
        chapterCacheDao.insertAll(
            listOf(
                ChapterCacheEntity(
                    id = "1",
                    seriesId = "10",
                    title = "Cap 1",
                    number = "1",
                    pageCount = 20,
                    sortOrder = 1.0,
                    readStatus = "READ",
                    pagesRead = 20,
                    updatedAtLocalMs = null,
                ),
            ),
        )
        server.enqueue(MockResponse().setResponseCode(200))

        val result = feature.markChaptersUnread("10", listOf("1"))

        assertTrue(result.isSuccess)
        assertEquals("UNREAD", chapterCacheDao.chapters["1"]?.readStatus)
        assertEquals(0, chapterCacheDao.chapters["1"]?.pagesRead)
    }

    @Test
    fun `markChaptersRead retorna failure em erro HTTP e nao atualiza cache`() = runTest {
        chapterCacheDao.insertAll(
            listOf(
                ChapterCacheEntity(
                    id = "1",
                    seriesId = "10",
                    title = "Cap 1",
                    number = "1",
                    pageCount = 20,
                    sortOrder = 1.0,
                    readStatus = "UNREAD",
                    pagesRead = 0,
                    updatedAtLocalMs = null,
                ),
            ),
        )
        server.enqueue(MockResponse().setResponseCode(500))

        val result = feature.markChaptersRead("10", listOf("1"))

        assertTrue(result.isFailure)
        assertEquals("UNREAD", chapterCacheDao.chapters["1"]?.readStatus)
    }

    @Test
    fun `markChaptersRead retorna failure quando nao autenticado`() = runTest {
        authDao.upsert(AuthConfigEntity(apiKey = "api-key", jwt = null))

        val result = feature.markChaptersRead("10", listOf("1"))

        assertTrue(result.isFailure)
        assertEquals(0, server.requestCount)
    }

    @Test
    fun `saveReadingProgress grava progresso e atualiza cache`() = runTest {
        chapterCacheDao.insertAll(
            listOf(
                ChapterCacheEntity(
                    id = "1",
                    seriesId = "10",
                    title = "Cap 1",
                    number = "1",
                    pageCount = 20,
                    sortOrder = 1.0,
                    readStatus = "UNREAD",
                    pagesRead = 0,
                    updatedAtLocalMs = null,
                ),
            ),
        )

        val result = feature.saveReadingProgress("1", "10", 5)

        assertTrue(result.isSuccess)
        assertEquals("10", readingProgressDao.upserted?.seriesId)
        assertEquals("IN_PROGRESS", chapterCacheDao.chapters["1"]?.readStatus)
        assertEquals(5, chapterCacheDao.chapters["1"]?.pagesRead)
    }

    @Test
    fun `listChaptersForSeries retorna capitulos a partir dos volumes`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """[{"id":1,"chapters":[{"id":100,"number":"1","title":"Cap 1","pages":20,"pagesRead":0,"sortOrder":1.0}]}]""",
            ),
        )

        val result = feature.listChaptersForSeries("10")

        assertTrue(result.isSuccess)
        val chapters = result.getOrThrow()
        assertEquals(1, chapters.size)
        assertEquals("100", chapters[0].id)
        assertEquals("UNREAD", chapters[0].readStatus)
    }

    @Test
    fun `listChaptersForSeries usa seriesId como query param`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""[]"""))

        feature.listChaptersForSeries("10")

        assertEquals("/api/Series/volumes?seriesId=10", server.takeRequest().path)
    }

    @Test
    fun `listChaptersForSeries retorna failure quando nao autenticado`() = runTest {
        authDao.upsert(AuthConfigEntity(apiKey = "api-key", jwt = null))

        val result = feature.listChaptersForSeries("10")

        assertTrue(result.isFailure)
    }

    @Test
    fun `getPageUrls com cache completo nao chama a rede`() = runTest {
        pageCacheDao.replaceForChapter(
            "1",
            listOf(
                PageCacheEntity("1", 0, "cached0", 1000),
                PageCacheEntity("1", 1, "cached1", 1000),
            ),
        )

        val result = feature.getPageUrls("1", expectedPageCount = 2)

        assertTrue(result.isSuccess)
        assertEquals(listOf("cached0", "cached1"), result.getOrThrow())
        assertEquals(0, server.requestCount)
    }

    @Test
    fun `getPageUrls com cache incompleto busca da rede e persiste`() = runTest {
        pageCacheDao.replaceForChapter("1", listOf(PageCacheEntity("1", 0, "stale", 1000)))

        val result = feature.getPageUrls("1", expectedPageCount = 2)

        assertTrue(result.isSuccess)
        val urls = result.getOrThrow()
        assertEquals(2, urls.size)
        assertTrue(urls[0].contains("chapterId=1&page=0&apiKey=api-key"))
        assertTrue(urls[1].contains("chapterId=1&page=1&apiKey=api-key"))
        assertEquals(2, pageCacheDao.getByChapterId("1").size)
    }

    @Test
    fun `getPageUrls retorna failure quando nao autenticado`() = runTest {
        val authlessFeature = KavitaChapterFeature(
            urlSource = FakeUrlSource(server.url("/").toString().trimEnd('/')),
            requestTool = RequestTool(OkHttpClient()),
            authConfigDao = FakeAuthConfigDao(null),
            chapterCacheDao = chapterCacheDao,
            readingProgressDao = readingProgressDao,
            pageCacheDao = pageCacheDao,
        )

        val result = authlessFeature.getPageUrls("1", expectedPageCount = 2)

        assertTrue(result.isFailure)
    }

    @Test
    fun `invalidatePageCache remove cache do capitulo`() = runTest {
        pageCacheDao.replaceForChapter("1", listOf(PageCacheEntity("1", 0, "url0", 1000)))

        val result = feature.invalidatePageCache("1")

        assertTrue(result.isSuccess)
        assertTrue(pageCacheDao.getByChapterId("1").isEmpty())
    }

    @Test
    fun `getPageCacheUrls le cache sem tocar rede`() = runTest {
        pageCacheDao.replaceForChapter("1", listOf(PageCacheEntity("1", 0, "url0", 1000)))

        val result = feature.getPageCacheUrls("1")

        assertTrue(result.isSuccess)
        assertEquals(listOf(0 to "url0"), result.getOrThrow())
        assertEquals(0, server.requestCount)
    }

    @Test
    fun `getServerReadProgress retorna pagina quando servidor responde 200`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"pageNum":7}"""))

        val result = feature.getServerReadProgress("1")

        assertTrue(result.isSuccess)
        assertEquals(7, result.getOrThrow())
    }

    @Test
    fun `getServerReadProgress trata 404 como sucesso nulo`() = runTest {
        server.enqueue(MockResponse().setResponseCode(404))

        val result = feature.getServerReadProgress("1")

        assertTrue(result.isSuccess)
        assertEquals(null, result.getOrThrow())
    }

    @Test
    fun `getServerReadProgress retorna failure quando nao autenticado`() = runTest {
        authDao.upsert(AuthConfigEntity(apiKey = "api-key", jwt = null))

        val result = feature.getServerReadProgress("1")

        assertTrue(result.isFailure)
        assertEquals(0, server.requestCount)
    }

    @Test
    fun `getLocalProgress mapeia entidade para LocalProgress`() = runTest {
        readingProgressDao.stored = ReadingProgressEntity(
            chapterId = "1",
            seriesId = "10",
            page = 3,
            updatedAtLocalMs = 1000,
            scrollFraction = 0.5f,
        )

        val result = feature.getLocalProgress("1")

        assertTrue(result.isSuccess)
        assertEquals(3, result.getOrThrow()?.page)
        assertEquals(0.5f, result.getOrThrow()?.scrollFraction)
    }

    @Test
    fun `getLocalProgress retorna nulo quando nao ha progresso salvo`() = runTest {
        val result = feature.getLocalProgress("1")

        assertTrue(result.isSuccess)
        assertEquals(null, result.getOrThrow())
    }

    @Test
    fun `saveLocalProgress nao invoca chapterCacheDao`() = runTest {
        val result = feature.saveLocalProgress("1", "10", page = 4, scrollFraction = 0.25f)

        assertTrue(result.isSuccess)
        assertEquals(4, readingProgressDao.upserted?.page)
        assertEquals(0.25f, readingProgressDao.upserted?.scrollFraction)
        assertTrue(chapterCacheDao.updateCalls.isEmpty())
    }
}
