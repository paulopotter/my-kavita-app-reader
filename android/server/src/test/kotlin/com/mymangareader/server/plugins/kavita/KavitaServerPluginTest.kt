package com.mymangareader.server.plugins.kavita

import com.mymangareader.tools.network.RequestTool
import kotlin.test.assertFailsWith
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class KavitaServerPluginTest {

    private lateinit var server: MockWebServer
    private lateinit var plugin: KavitaServerPlugin
    private lateinit var baseUrl: String

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        baseUrl = server.url("/").toString().trimEnd('/')
        plugin = KavitaServerPlugin(baseUrl, "jwt-token", "api-key-123", RequestTool(OkHttpClient()))
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    // ── identity ──────────────────────────────────────────────────────────

    @Test
    fun `exposes stable identity fields`() {
        assertEquals("kavita", plugin.id)
        assertEquals("Kavita", plugin.displayName)
        assertEquals("1.0.0", plugin.version)
    }

    // ── auth ──────────────────────────────────────────────────────────────

    @Test
    fun `auth authenticate succeeds on 200`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"username":"u","token":"t"}"""))

        plugin.auth.authenticate()
    }

    @Test
    fun `auth checkToken returns expiry`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"expiresAt":"2027-01-01T00:00:00Z"}"""))

        val expiry = plugin.auth.checkToken()

        assertEquals("2027-01-01T00:00:00Z", expiry)
    }

    @Test
    fun `auth logout succeeds as a no-op`() = runTest {
        plugin.auth.logout()
    }

    @Test
    fun `getSession returns null before any authentication`() {
        val fresh = KavitaServerPlugin(baseUrl, initialJwt = null, "api-key-123", RequestTool(OkHttpClient()))

        assertNull(fresh.auth.getSession())
    }

    @Test
    fun `getSession returns the initial jwt when one was supplied`() {
        assertEquals("""{"jwt":"jwt-token"}""", plugin.auth.getSession())
    }

    @Test
    fun `authenticate updates the session returned by getSession`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"username":"u","token":"fresh-jwt"}"""))

        plugin.auth.authenticate()

        assertEquals("""{"jwt":"fresh-jwt"}""", plugin.auth.getSession())
    }

    @Test
    fun `logout clears the held session`() = runTest {
        plugin.auth.logout()

        assertNull(plugin.auth.getSession())
    }

    @Test
    fun `an operation lazily authenticates when no jwt was supplied`() = runTest {
        val fresh = KavitaServerPlugin(baseUrl, initialJwt = null, "api-key-123", RequestTool(OkHttpClient()))
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"username":"u","token":"lazy-jwt"}"""))
        server.enqueue(MockResponse().setResponseCode(200).setBody("""[]"""))

        fresh.serials.list()

        assertEquals("""{"jwt":"lazy-jwt"}""", fresh.auth.getSession())
        val authRequest = server.takeRequest()
        assertTrue(authRequest.path?.contains("/api/Plugin/authenticate") == true)
    }

    @Test
    fun `an operation throws when lazy authentication fails`() = runTest {
        val fresh = KavitaServerPlugin(baseUrl, initialJwt = null, "bad-api-key", RequestTool(OkHttpClient()))
        server.enqueue(MockResponse().setResponseCode(401))

        assertFailsWith<Throwable> { fresh.serials.list() }
        assertNull(fresh.auth.getSession())
    }

    @Test
    fun `an operation reuses an already-held jwt without re-authenticating`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""[]"""))

        plugin.serials.list()

        // only one request was made — the series list itself, no authenticate call in between
        assertEquals(1, server.requestCount)
    }

    // ── auth reauthenticate ──────────────────────────────────────────────

    @Test
    fun `auth reauthenticate fails when never authenticated`() = runTest {
        val fresh = KavitaServerPlugin(baseUrl, initialJwt = null, "api-key-123", RequestTool(OkHttpClient()))

        assertFailsWith<KavitaServerPluginException> { fresh.auth.reauthenticate() }
    }

    @Test
    fun `auth reauthenticate fails when authenticated without a refreshToken`() = runTest {
        // plugin was constructed with an initialJwt directly (no refreshToken ever received)
        assertFailsWith<KavitaServerPluginException> { plugin.auth.reauthenticate() }
    }

    @Test
    fun `auth reauthenticate renews jwt and refreshToken using the ones held`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"username":"u","token":"first-jwt","refreshToken":"first-refresh"}"""))
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"token":"renewed-jwt","refreshToken":"renewed-refresh"}"""))

        plugin.auth.authenticate()
        plugin.auth.reauthenticate()

        assertEquals("""{"jwt":"renewed-jwt"}""", plugin.auth.getSession())
        val recorded = server.takeRequest() // authenticate
        server.takeRequest() // reauthenticate
        assertTrue(recorded.path?.contains("/api/Plugin/authenticate") == true)
    }

    @Test
    fun `auth reauthenticate throws on non-200 from Kavita`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"username":"u","token":"first-jwt","refreshToken":"first-refresh"}"""))
        server.enqueue(MockResponse().setResponseCode(401))

        plugin.auth.authenticate()

        assertFailsWith<Throwable> { plugin.auth.reauthenticate() }
    }

    // ── serials (group) ──────────────────────────────────────────────────

    @Test
    fun `serials list maps dtos without metadata`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """[{"id":1,"name":"Serial A","pages":100,"pagesRead":40,"lastChapterAddedUtc":"2026-01-01"}]""",
            ),
        )

        val serial = plugin.serials.list().single()

        assertEquals("1", serial.id)
        assertEquals("Serial A", serial.name)
        assertEquals(40, serial.pagesRead)
        assertEquals(100, serial.totalPages)
        assertNull(serial.summary)
        assertTrue(serial.genres.isEmpty())
    }

    // ── serial(id).get() — parallel fetch + merge ───────────────────────

    @Test
    fun `serial get merges series and metadata fetched in parallel`() = runTest {
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse =
                if (request.path?.contains("/metadata") == true) {
                    MockResponse().setResponseCode(200).setBody(
                        """{"seriesId":7,"summary":"A great story","genres":[{"id":1,"title":"Action"}],"tags":[{"id":2,"title":"Isekai"}]}""",
                    )
                } else {
                    MockResponse().setResponseCode(200).setBody("""{"id":7,"name":"Serial B","pages":50,"pagesRead":10}""")
                }
        }

        val serial = plugin.serial("7").get()

        assertEquals("Serial B", serial.name)
        assertEquals("A great story", serial.summary)
        assertEquals(listOf("Action"), serial.genres)
        assertEquals(listOf("Isekai"), serial.tags)
    }

    @Test
    fun `serial get throws when series fetch fails`() = runTest {
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse =
                if (request.path?.contains("/metadata") == true) {
                    MockResponse().setResponseCode(200).setBody("""{"seriesId":7}""")
                } else {
                    MockResponse().setResponseCode(500)
                }
        }

        assertFailsWith<Throwable> { plugin.serial("7").get() }
    }

    @Test
    fun `serial get throws when metadata fetch fails`() = runTest {
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse =
                if (request.path?.contains("/metadata") == true) {
                    MockResponse().setResponseCode(500)
                } else {
                    MockResponse().setResponseCode(200).setBody("""{"id":7,"name":"Serial B"}""")
                }
        }

        assertFailsWith<Throwable> { plugin.serial("7").get() }
    }

    // ── serial(id).chapters (group) ─────────────────────────────────────

    @Test
    fun `chapters list flattens volumes into a single chapter list`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """[{"id":10,"seriesId":7,"chapters":[{"id":100,"title":"Ch 1"},{"id":101,"title":"Ch 2"}]},{"id":11,"seriesId":7,"chapters":[{"id":102,"title":"Ch 3"}]}]""",
            ),
        )

        val titles = plugin.serial("7").chapters.list().map { it.title }

        assertEquals(listOf("Ch 1", "Ch 2", "Ch 3"), titles)
    }

    @Test
    fun `chapters setRead true marks as read for the batch`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200))

        plugin.serial("7").chapters.setRead(true, listOf("100", "101"))

        val recorded = server.takeRequest()
        assertTrue(recorded.path?.endsWith("/api/Reader/mark-multiple-read") == true)
    }

    @Test
    fun `chapters setRead false marks as unread for the batch`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200))

        plugin.serial("7").chapters.setRead(false, listOf("100"))

        val recorded = server.takeRequest()
        assertTrue(recorded.path?.endsWith("/api/Reader/mark-multiple-unread") == true)
    }

    @Test
    fun `chapters list and chapter get on the same Serial share one request`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """[{"id":10,"seriesId":7,"chapters":[{"id":100,"title":"Ch 1"},{"id":101,"title":"Ch 2"}]}]""",
            ),
        )

        val serial = plugin.serial("7")
        serial.chapters.list()
        val chapter = serial.chapter("101").get()

        assertEquals("Ch 2", chapter.title)
        assertEquals(1, server.requestCount)
    }

    @Test
    fun `a fresh serial(id) call does not reuse the previous instance's memoized volumes`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody("""[{"id":10,"seriesId":7,"chapters":[{"id":100,"title":"Ch 1"}]}]"""),
        )
        server.enqueue(
            MockResponse().setResponseCode(200).setBody("""[{"id":10,"seriesId":7,"chapters":[{"id":100,"title":"Ch 1"}]}]"""),
        )

        plugin.serial("7").chapters.list()
        plugin.serial("7").chapters.list()

        assertEquals(2, server.requestCount)
    }

    @Test
    fun `chapters setRead invalidates the memoized volumes so the next list refetches`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody("""[{"id":10,"seriesId":7,"chapters":[{"id":100,"title":"Ch 1","pagesRead":0}]}]"""),
        )
        server.enqueue(MockResponse().setResponseCode(200)) // mark-multiple-read
        server.enqueue(
            MockResponse().setResponseCode(200).setBody("""[{"id":10,"seriesId":7,"chapters":[{"id":100,"title":"Ch 1","pagesRead":20}]}]"""),
        )

        val serial = plugin.serial("7")
        serial.chapters.list()
        serial.chapters.setRead(true, listOf("100"))
        val afterWrite = serial.chapters.list().single()

        assertEquals(20, afterWrite.pagesRead)
        assertEquals(3, server.requestCount)
    }

    @Test
    fun `chapter setRead invalidates the owning Serial's memoized volumes`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody("""[{"id":10,"seriesId":7,"chapters":[{"id":100,"title":"Ch 1"}]}]"""),
        )
        server.enqueue(MockResponse().setResponseCode(200)) // mark-multiple-read
        server.enqueue(
            MockResponse().setResponseCode(200).setBody("""[{"id":10,"seriesId":7,"chapters":[{"id":100,"title":"Ch 1"}]}]"""),
        )

        val serial = plugin.serial("7")
        serial.chapters.list()
        serial.chapter("100").setRead(true)
        serial.chapters.list()

        assertEquals(3, server.requestCount)
    }

    @Test
    fun `chapter setProgress invalidates the owning Serial's memoized volumes`() = runTest {
        // 1: serial.chapters.list() — memoized volumes lookup
        server.enqueue(
            MockResponse().setResponseCode(200).setBody("""[{"id":10,"seriesId":7,"chapters":[{"id":100,"volumeId":10}]}]"""),
        )
        // 2: setProgress's own internal volumes lookup (to resolve volumeId — separate from the memoized one, saveProgress doesn't go through KavitaSerial)
        server.enqueue(
            MockResponse().setResponseCode(200).setBody("""[{"id":10,"seriesId":7,"chapters":[{"id":100,"volumeId":10}]}]"""),
        )
        // 3: the actual save-progress POST
        server.enqueue(MockResponse().setResponseCode(200))
        // 4: serial.chapters.list() again — memoized volumes must have been invalidated, so this refetches
        server.enqueue(
            MockResponse().setResponseCode(200).setBody("""[{"id":10,"seriesId":7,"chapters":[{"id":100,"volumeId":10}]}]"""),
        )

        val serial = plugin.serial("7")
        serial.chapters.list()
        serial.chapter("100").setProgress(5)
        serial.chapters.list()

        assertEquals(4, server.requestCount)
    }

    // Protection-window expiry (real wall-clock time, via System.currentTimeMillis()) isn't
    // covered by an automated test — kotlinx.coroutines.test's virtual clock only advances
    // delay()/withTimeout(), not System.currentTimeMillis(), and introducing an injectable Clock
    // just to test this one timing edge isn't worth the added complexity here.

    // ── serial(id).chapter(id) ───────────────────────────────────────────

    @Test
    fun `chapter get filters the matching chapter from the series listing`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """[{"id":10,"seriesId":7,"chapters":[{"id":100,"title":"Ch 1"},{"id":101,"title":"Ch 2"}]}]""",
            ),
        )

        val chapter = plugin.serial("7").chapter("101").get()

        assertEquals("Ch 2", chapter.title)
    }

    @Test
    fun `chapter get throws when chapter is not in the series`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""[]"""))

        assertFailsWith<KavitaServerPluginException> { plugin.serial("7").chapter("999").get() }
    }

    @Test
    fun `chapter setRead true marks this single chapter as read`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200))

        plugin.serial("7").chapter("100").setRead(true)

        val recorded = server.takeRequest()
        assertTrue(recorded.body.readUtf8().contains("\"chapterIds\":[100]"))
    }

    @Test
    fun `chapter getProgress maps dto including bookScrollId source fields`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"volumeId":10,"chapterId":100,"pageNum":5,"seriesId":7,"lastModifiedUtc":"2026-01-01T00:00:00Z"}""",
            ),
        )

        val progress = plugin.serial("7").chapter("100").getProgress()

        assertEquals(5, progress?.pageIndex)
        assertEquals("2026-01-01T00:00:00Z", progress?.updatedAtUtc)
    }

    @Test
    fun `chapter getProgress returns null when there is no saved progress`() = runTest {
        server.enqueue(MockResponse().setResponseCode(404))

        assertNull(plugin.serial("7").chapter("100").getProgress())
    }

    @Test
    fun `chapter setProgress looks up volume and saves`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """[{"id":10,"seriesId":7,"chapters":[{"id":100,"volumeId":10}]}]""",
            ),
        )
        server.enqueue(MockResponse().setResponseCode(200))

        plugin.serial("7").chapter("100").setProgress(3)

        server.takeRequest()
        val recorded = server.takeRequest()
        assertTrue(recorded.path?.endsWith("/api/Reader/progress") == true)
    }

    // ── serial(id).chapter(id).page(index) ──────────────────────────────

    @Test
    fun `page getDimensions returns the dimension at that index`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"pageDimensions":[{"width":800,"height":1100,"pageNumber":0},{"width":800,"height":1200,"pageNumber":1}]}""",
            ),
        )

        val dimension = plugin.serial("7").chapter("100").page(1).getDimensions()

        assertEquals(800, dimension.width)
        assertEquals(1200, dimension.height)
    }

    @Test
    fun `page getDimensions throws when index is out of range`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"pageDimensions":[]}"""))

        assertFailsWith<KavitaServerPluginException> { plugin.serial("7").chapter("100").page(5).getDimensions() }
    }

    @Test
    fun `page getUrl builds a single page url`() {
        val url = plugin.serial("7").chapter("100").page(2).getUrl()

        assertEquals("$baseUrl/api/reader/image?chapterId=100&page=2&apiKey=api-key-123", url)
    }
}
