package com.mymangareader.server.plugins.kavita.chapter

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

class KavitaChapterTest {

    private lateinit var server: MockWebServer
    private lateinit var chapter: KavitaChapter
    private lateinit var baseUrl: String

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        baseUrl = server.url("/").toString().trimEnd('/')
        chapter = KavitaChapter(baseUrl, "jwt-token", "api-key-123", RequestTool(OkHttpClient()))
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `listVolumesForSeries returns raw volumes with chapters`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """[{"id":10,"seriesId":7,"chapters":[{"id":100,"range":"1","number":"1","sortOrder":1.0,"pages":20,"isSpecial":false,"title":"Ch 1","pagesRead":5,"volumeId":10}]}]""",
            ),
        )

        val result = chapter.listVolumesForSeries("7")

        assertTrue(result.isSuccess)
        val volume = result.getOrThrow().single()
        assertEquals(10, volume.id)
        assertEquals(7, volume.seriesId)
        val ch = volume.chapters.single()
        assertEquals(100, ch.id)
        assertEquals("1", ch.range)
        assertEquals(1.0, ch.sortOrder, 0.0)
        assertEquals(20, ch.pages)
        assertEquals(5, ch.pagesRead)
        assertEquals(10, ch.volumeId)
    }

    @Test
    fun `listVolumesForSeries returns failure on non-200`() = runTest {
        server.enqueue(MockResponse().setResponseCode(500))

        val result = chapter.listVolumesForSeries("7")

        assertTrue(result.isFailure)
    }

    @Test
    fun `buildPageUrls builds one url per page with apiKey`() {
        val urls = chapter.buildPageUrls("100", 3)

        assertEquals(3, urls.size)
        assertEquals("$baseUrl/api/reader/image?chapterId=100&page=0&apiKey=api-key-123", urls[0])
        assertEquals("$baseUrl/api/reader/image?chapterId=100&page=1&apiKey=api-key-123", urls[1])
        assertEquals("$baseUrl/api/reader/image?chapterId=100&page=2&apiKey=api-key-123", urls[2])
    }

    @Test
    fun `buildPageUrls returns empty list for zero pages`() {
        assertTrue(chapter.buildPageUrls("100", 0).isEmpty())
    }

    @Test
    fun `getPageDimensions returns dimensions sorted by pageNumber`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"pageDimensions":[{"width":800,"height":1200,"pageNumber":1},{"width":800,"height":1100,"pageNumber":0}]}""",
            ),
        )

        val result = chapter.getPageDimensions("100")

        assertTrue(result.isSuccess)
        val dims = result.getOrThrow()
        assertEquals(0, dims[0].pageNumber)
        assertEquals(1, dims[1].pageNumber)
    }

    @Test
    fun `getPageDimensions returns failure on non-200`() = runTest {
        server.enqueue(MockResponse().setResponseCode(500))

        val result = chapter.getPageDimensions("100")

        assertTrue(result.isFailure)
    }

    @Test
    fun `getProgress returns dto including bookScrollId`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"volumeId":10,"chapterId":100,"pageNum":5,"seriesId":7,"libraryId":2,"bookScrollId":"para-42","lastModifiedUtc":"2026-01-01T00:00:00Z"}""",
            ),
        )

        val result = chapter.getProgress("100")

        assertTrue(result.isSuccess)
        val dto = result.getOrThrow()
        assertEquals(5, dto?.pageNum)
        assertEquals("para-42", dto?.bookScrollId)
    }

    @Test
    fun `getProgress returns null on 404`() = runTest {
        server.enqueue(MockResponse().setResponseCode(404))

        val result = chapter.getProgress("100")

        assertTrue(result.isSuccess)
        assertNull(result.getOrThrow())
    }

    @Test
    fun `getProgress returns failure on unexpected status`() = runTest {
        server.enqueue(MockResponse().setResponseCode(500))

        val result = chapter.getProgress("100")

        assertTrue(result.isFailure)
    }

    @Test
    fun `markChaptersRead returns success on 200`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200))

        val result = chapter.markChaptersRead("7", listOf("100", "101"))

        assertTrue(result.isSuccess)
        val recorded = server.takeRequest()
        assertTrue(recorded.path?.endsWith("/api/Reader/mark-multiple-read") == true)
        assertTrue(recorded.body.readUtf8().contains("\"chapterIds\":[100,101]"))
    }

    @Test
    fun `markChaptersUnread returns success on 200`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200))

        val result = chapter.markChaptersUnread("7", listOf("100"))

        assertTrue(result.isSuccess)
        val recorded = server.takeRequest()
        assertTrue(recorded.path?.endsWith("/api/Reader/mark-multiple-unread") == true)
    }

    @Test
    fun `markChaptersRead returns failure on non-200`() = runTest {
        server.enqueue(MockResponse().setResponseCode(500))

        val result = chapter.markChaptersRead("7", listOf("100"))

        assertTrue(result.isFailure)
    }
}
