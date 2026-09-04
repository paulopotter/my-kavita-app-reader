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
import kotlin.test.assertFailsWith

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
    fun `listVolumesForSeries returns raw volumes with chapters`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"id":10,"seriesId":7,"chapters":[{"id":100,"range":"1","number":"1","sortOrder":1.0,"pages":20,"isSpecial":false,"title":"Ch 1","pagesRead":5,"volumeId":10,"createdUtc":"2026-01-01T00:00:00Z","format":3}]}]""",
                ),
            )

            val volume = chapter.listVolumesForSeries("7").single()

            assertEquals(10, volume.id)
            assertEquals(7, volume.seriesId)
            val ch = volume.chapters.single()
            assertEquals(100, ch.id)
            assertEquals("1", ch.range)
            assertEquals(1.0, ch.sortOrder, 0.0)
            assertEquals(20, ch.pages)
            assertEquals(5, ch.pagesRead)
            assertEquals(10, ch.volumeId)
            assertEquals("2026-01-01T00:00:00Z", ch.createdUtc)
            assertEquals(3, ch.format)
        }

    @Test
    fun `listVolumesForSeries defaults format to 0 when absent`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"id":10,"seriesId":7,"chapters":[{"id":100}]}]""",
                ),
            )

            val ch =
                chapter
                    .listVolumesForSeries("7")
                    .single()
                    .chapters
                    .single()

            assertEquals(0, ch.format)
        }

    @Test
    fun `listVolumesForSeries throws on non-200`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(500))

            assertFailsWith<KavitaChapterException> { chapter.listVolumesForSeries("7") }
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
    fun `buildPageUrl builds a single page url`() {
        val url = chapter.buildPageUrl("100", 2)

        assertEquals("$baseUrl/api/reader/image?chapterId=100&page=2&apiKey=api-key-123", url)
    }

    @Test
    fun `buildChapterCoverUrl builds a chapter cover url`() {
        val url = chapter.buildChapterCoverUrl("100")

        assertEquals("$baseUrl/api/Image/chapter-cover?chapterId=100&apiKey=api-key-123", url)
    }

    @Test
    fun `getPageDimensions returns dimensions sorted by pageNumber`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """{"pageDimensions":[{"width":800,"height":1200,"pageNumber":1},{"width":800,"height":1100,"pageNumber":0}]}""",
                ),
            )

            val dims = chapter.getPageDimensions("100")

            assertEquals(0, dims[0].pageNumber)
            assertEquals(1, dims[1].pageNumber)
        }

    @Test
    fun `getPageDimensions throws on non-200`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(500))

            assertFailsWith<KavitaChapterException> { chapter.getPageDimensions("100") }
        }

    @Test
    fun `getProgress returns dto including bookScrollId`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """{"volumeId":10,"chapterId":100,"pageNum":5,"seriesId":7,"libraryId":2,"bookScrollId":"para-42","lastModifiedUtc":"2026-01-01T00:00:00Z"}""",
                ),
            )

            val dto = chapter.getProgress("100")

            assertEquals(5, dto?.pageNum)
            assertEquals("para-42", dto?.bookScrollId)
        }

    @Test
    fun `getProgress returns null on 404`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(404))

            assertNull(chapter.getProgress("100"))
        }

    @Test
    fun `getProgress throws on unexpected status`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(500))

            assertFailsWith<KavitaChapterException> { chapter.getProgress("100") }
        }

    @Test
    fun `saveProgress looks up volumeId then posts progress`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"id":10,"seriesId":7,"chapters":[{"id":100,"volumeId":10}]}]""",
                ),
            )
            server.enqueue(MockResponse().setResponseCode(200))

            chapter.saveProgress("7", "100", pageIndex = 5)

            server.takeRequest() // the volumes lookup
            val recorded = server.takeRequest()
            assertTrue(recorded.path?.endsWith("/api/Reader/progress") == true)
            val body = recorded.body.readUtf8()
            assertTrue(body.contains("\"volumeId\":10"))
            assertTrue(body.contains("\"chapterId\":100"))
            assertTrue(body.contains("\"pageNum\":5"))
            assertTrue(body.contains("\"seriesId\":7"))
        }

    @Test
    fun `saveProgress throws when chapter not found in series`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200).setBody("""[]"""))

            assertFailsWith<KavitaChapterException> { chapter.saveProgress("7", "999", pageIndex = 0) }
        }

    @Test
    fun `saveProgress throws when volumes lookup fails`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(500))

            assertFailsWith<KavitaChapterException> { chapter.saveProgress("7", "100", pageIndex = 0) }
        }

    @Test
    fun `saveProgress throws on non-200 from progress endpoint`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"id":10,"seriesId":7,"chapters":[{"id":100,"volumeId":10}]}]""",
                ),
            )
            server.enqueue(MockResponse().setResponseCode(500))

            assertFailsWith<KavitaChapterException> { chapter.saveProgress("7", "100", pageIndex = 5) }
        }

    @Test
    fun `markChaptersRead posts to mark-multiple-read`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200))

            chapter.markChaptersRead("7", listOf("100", "101"))

            val recorded = server.takeRequest()
            assertTrue(recorded.path?.endsWith("/api/Reader/mark-multiple-read") == true)
            assertTrue(recorded.body.readUtf8().contains("\"chapterIds\":[100,101]"))
        }

    @Test
    fun `markChaptersUnread posts to mark-multiple-unread`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200))

            chapter.markChaptersUnread("7", listOf("100"))

            val recorded = server.takeRequest()
            assertTrue(recorded.path?.endsWith("/api/Reader/mark-multiple-unread") == true)
        }

    @Test
    fun `markChaptersRead throws on non-200`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(500))

            assertFailsWith<KavitaChapterException> { chapter.markChaptersRead("7", listOf("100")) }
        }
}
