package com.mymangareader.server.plugins.kavita.series

import com.mymangareader.tools.network.RequestTool
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class KavitaSeriesTest {

    private lateinit var server: MockWebServer
    private lateinit var series: KavitaSeries

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        val baseUrl = server.url("/").toString().trimEnd('/')
        series = KavitaSeries(baseUrl, "jwt-token", RequestTool(OkHttpClient()))
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `listSeries returns full raw dto list`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """[{"id":1,"name":"Series A","pages":100,"pagesRead":40,"libraryId":2,"libraryName":"Manga","aniListId":55,"primaryColor":"#fff"}]""",
            ),
        )

        val result = series.listSeries()

        assertTrue(result.isSuccess)
        val dto = result.getOrThrow().single()
        assertEquals(1, dto.id)
        assertEquals("Series A", dto.name)
        assertEquals(100, dto.pages)
        assertEquals(40, dto.pagesRead)
        assertEquals(2, dto.libraryId)
        assertEquals("Manga", dto.libraryName)
        assertEquals(55, dto.aniListId)
        assertEquals("#fff", dto.primaryColor)
    }

    @Test
    fun `listSeries returns failure on non-200`() = runTest {
        server.enqueue(MockResponse().setResponseCode(500))

        val result = series.listSeries()

        assertTrue(result.isFailure)
    }

    @Test
    fun `getSeries returns raw dto`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200)
                .setBody("""{"id":7,"name":"Series B","sortName":"series b","originalName":"シリーズB"}"""),
        )

        val result = series.getSeries("7")

        assertTrue(result.isSuccess)
        assertEquals("Series B", result.getOrThrow().name)
        assertEquals("series b", result.getOrThrow().sortName)
        assertEquals("シリーズB", result.getOrThrow().originalName)
    }

    @Test
    fun `getSeries returns failure on non-200`() = runTest {
        server.enqueue(MockResponse().setResponseCode(404))

        val result = series.getSeries("missing")

        assertTrue(result.isFailure)
    }

    @Test
    fun `getSeriesMetadata returns genres and tags with ids`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"seriesId":7,"summary":"A great story","genres":[{"id":1,"title":"Action"}],"tags":[{"id":2,"title":"Isekai"}],"publicationStatus":"OnGoing","releaseYear":2020,"language":"en"}""",
            ),
        )

        val result = series.getSeriesMetadata("7")

        assertTrue(result.isSuccess)
        val dto = result.getOrThrow()
        assertEquals("A great story", dto.summary)
        assertEquals(1, dto.genres.single().id)
        assertEquals("Action", dto.genres.single().title)
        assertEquals(2, dto.tags.single().id)
        assertEquals("OnGoing", dto.publicationStatus)
        assertEquals(2020, dto.releaseYear)
    }

    @Test
    fun `getSeriesMetadata returns failure on non-200`() = runTest {
        server.enqueue(MockResponse().setResponseCode(500))

        val result = series.getSeriesMetadata("7")

        assertTrue(result.isFailure)
    }
}
