package com.mymangareader.server.plugins.kavita

import com.mymangareader.server.plugins.PluginBookInfo
import com.mymangareader.server.plugins.PluginBookTocItem
import com.mymangareader.server.plugins.kavita.book.KavitaBookException
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
    fun `auth authenticate succeeds on 200`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200).setBody("""{"username":"u","token":"t"}"""))

            plugin.auth.authenticate()
        }

    @Test
    fun `auth checkToken returns expiry`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200).setBody("""{"expiresAt":"2027-01-01T00:00:00Z"}"""))

            val expiry = plugin.auth.checkToken()

            assertEquals("2027-01-01T00:00:00Z", expiry)
        }

    @Test
    fun `auth logout succeeds as a no-op`() =
        runTest {
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
    fun `authenticate updates the session returned by getSession`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200).setBody("""{"username":"u","token":"fresh-jwt"}"""))

            plugin.auth.authenticate()

            assertEquals("""{"jwt":"fresh-jwt"}""", plugin.auth.getSession())
        }

    @Test
    fun `logout clears the held session`() =
        runTest {
            plugin.auth.logout()

            assertNull(plugin.auth.getSession())
        }

    @Test
    fun `an operation lazily authenticates when no jwt was supplied`() =
        runTest {
            val fresh = KavitaServerPlugin(baseUrl, initialJwt = null, "api-key-123", RequestTool(OkHttpClient()))
            server.enqueue(MockResponse().setResponseCode(200).setBody("""{"username":"u","token":"lazy-jwt"}"""))
            server.enqueue(MockResponse().setResponseCode(200).setBody("""[]"""))

            fresh.serials.list()

            assertEquals("""{"jwt":"lazy-jwt"}""", fresh.auth.getSession())
            val authRequest = server.takeRequest()
            assertTrue(authRequest.path?.contains("/api/Plugin/authenticate") == true)
        }

    @Test
    fun `an operation throws when lazy authentication fails`() =
        runTest {
            val fresh = KavitaServerPlugin(baseUrl, initialJwt = null, "bad-api-key", RequestTool(OkHttpClient()))
            server.enqueue(MockResponse().setResponseCode(401))

            assertFailsWith<Throwable> { fresh.serials.list() }
            assertNull(fresh.auth.getSession())
        }

    @Test
    fun `an operation reuses an already-held jwt without re-authenticating`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200).setBody("""[]"""))

            plugin.serials.list()

            // only one request was made — the series list itself, no authenticate call in between
            assertEquals(1, server.requestCount)
        }

    // ── auth reauthenticate ──────────────────────────────────────────────

    @Test
    fun `auth reauthenticate fails when never authenticated`() =
        runTest {
            val fresh = KavitaServerPlugin(baseUrl, initialJwt = null, "api-key-123", RequestTool(OkHttpClient()))

            assertFailsWith<KavitaServerPluginException> { fresh.auth.reauthenticate() }
        }

    @Test
    fun `auth reauthenticate fails when authenticated without a refreshToken`() =
        runTest {
            // plugin was constructed with an initialJwt directly (no refreshToken ever received)
            assertFailsWith<KavitaServerPluginException> { plugin.auth.reauthenticate() }
        }

    @Test
    fun `auth reauthenticate renews jwt and refreshToken using the ones held`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody("""{"username":"u","token":"first-jwt","refreshToken":"first-refresh"}"""),
            )
            server.enqueue(MockResponse().setResponseCode(200).setBody("""{"token":"renewed-jwt","refreshToken":"renewed-refresh"}"""))

            plugin.auth.authenticate()
            plugin.auth.reauthenticate()

            assertEquals("""{"jwt":"renewed-jwt"}""", plugin.auth.getSession())
            val recorded = server.takeRequest() // authenticate
            server.takeRequest() // reauthenticate
            assertTrue(recorded.path?.contains("/api/Plugin/authenticate") == true)
        }

    @Test
    fun `auth reauthenticate throws on non-200 from Kavita`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody("""{"username":"u","token":"first-jwt","refreshToken":"first-refresh"}"""),
            )
            server.enqueue(MockResponse().setResponseCode(401))

            plugin.auth.authenticate()

            assertFailsWith<Throwable> { plugin.auth.reauthenticate() }
        }

    // ── serials (group) ──────────────────────────────────────────────────

    @Test
    fun `serials list maps dtos without metadata`() =
        runTest {
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
            assertEquals("$baseUrl/api/Image/series-cover?seriesId=1&apiKey=api-key-123", serial.coverUrl)
        }

    @Test
    fun `serials list maps the library creation date as an ISO UTC string`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"id":1,"name":"Serial A","pages":1,"pagesRead":0,"created":"2026-01-01T00:00:00.1234567"}]""",
                ),
            )

            val serial = plugin.serials.list().single()

            assertEquals("2026-01-01T00:00:00.123Z", serial.createdUtc)
        }

    @Test
    fun `serials list maps the series' file format`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"id":1,"name":"A","pages":1,"pagesRead":0,"format":3},{"id":2,"name":"B","pages":1,"pagesRead":0,"format":1},{"id":3,"name":"C","pages":1,"pagesRead":0,"format":4}]""",
                ),
            )

            val formats = plugin.serials.list().map { it.fileFormat }

            assertEquals(listOf("epub", "archive", "pdf"), formats)
        }

    // ── categories ───────────────────────────────────────────────────────

    private val genresBody = """[{"id":113,"title":"Hentai"},{"id":128,"title":"Ecchi"},{"id":2,"title":"Ação"}]"""
    private val tagsBody = """[{"id":7,"title":"Gore"},{"id":8,"title":"ecchi"}]"""

    @Test
    fun `categories list merges genres and tags into distinct sorted names`() =
        runTest {
            server.enqueue(pathResponse("/api/Metadata/genres", genresBody))
            server.enqueue(pathResponse("/api/Metadata/tags", tagsBody))

            assertEquals(listOf("Ação", "Ecchi", "Gore", "Hentai"), plugin.categories!!.list())
        }

    @Test
    fun `categories serialIds resolves names to ids case-insensitively and filters in one request`() =
        runTest {
            server.enqueue(pathResponse("/api/Metadata/genres", genresBody))
            server.enqueue(pathResponse("/api/Metadata/tags", tagsBody))
            server.enqueue(MockResponse().setResponseCode(200).setBody("""[{"id":593,"name":"A"},{"id":12,"name":"B"}]"""))

            val ids = plugin.categories!!.serialIds(listOf("hentai", "ECCHI"))

            assertEquals(listOf("593", "12"), ids)
            server.takeRequest()
            server.takeRequest()
            val body = server.takeRequest().body.readUtf8()
            // genres 113 + 128 in one statement, the tag called "ecchi" (id 8) in the other, OR-ed
            assertTrue(body.contains(""""field":18,"value":"113,128""""))
            assertTrue(body.contains(""""field":6,"value":"8""""))
            assertTrue(body.contains(""""combination":0"""))
        }

    @Test
    fun `categories serialIds sends no request for an empty or unknown selection`() =
        runTest {
            assertEquals(emptyList<String>(), plugin.categories!!.serialIds(emptyList()))
            assertEquals(0, server.requestCount)

            server.enqueue(pathResponse("/api/Metadata/genres", genresBody))
            server.enqueue(pathResponse("/api/Metadata/tags", tagsBody))
            assertEquals(emptyList<String>(), plugin.categories!!.serialIds(listOf("Nonexistent")))
            assertEquals(2, server.requestCount) // table only, no all-v2
        }

    @Test
    fun `categories reuse the name table until a name is missing from it`() =
        runTest {
            server.enqueue(pathResponse("/api/Metadata/genres", genresBody))
            server.enqueue(pathResponse("/api/Metadata/tags", tagsBody))
            server.enqueue(MockResponse().setResponseCode(200).setBody("[]"))
            plugin.categories!!.serialIds(listOf("Hentai"))
            assertEquals(3, server.requestCount)

            server.enqueue(MockResponse().setResponseCode(200).setBody("[]"))
            plugin.categories!!.serialIds(listOf("Hentai")) // known → only the filtered query
            assertEquals(4, server.requestCount)

            server.enqueue(pathResponse("/api/Metadata/genres", """[{"id":113,"title":"Hentai"},{"id":300,"title":"Novo"}]"""))
            server.enqueue(pathResponse("/api/Metadata/tags", "[]"))
            server.enqueue(MockResponse().setResponseCode(200).setBody("[]"))
            plugin.categories!!.serialIds(listOf("Novo")) // unknown → table reloaded first
            assertEquals(7, server.requestCount)
        }

    @Test
    fun `categories fail loudly when the filtered query is rejected`() =
        runTest {
            server.enqueue(pathResponse("/api/Metadata/genres", genresBody))
            server.enqueue(pathResponse("/api/Metadata/tags", tagsBody))
            server.enqueue(MockResponse().setResponseCode(500))

            assertFailsWith<Exception> { plugin.categories!!.serialIds(listOf("Hentai")) }
        }

    private fun pathResponse(
        @Suppress("UNUSED_PARAMETER") path: String,
        body: String,
    ) = MockResponse().setResponseCode(200).setBody(body)

    // ── serial(id).get() / getMetadata() — two separate network calls ──

    @Test
    fun `serial get maps SeriesDto fields without a second call`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200).setBody("""{"id":7,"name":"Serial B","pages":50,"pagesRead":10}"""))

            val serial = plugin.serial("7").get()

            assertEquals("Serial B", serial.name)
            assertEquals(1, server.requestCount)
        }

    @Test
    fun `serial getMetadata maps SeriesMetadataDto fields via its own call`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """{"seriesId":7,"summary":"A great story","genres":[{"id":1,"title":"Action"}],"tags":[{"id":2,"title":"Isekai"}],"publicationStatus":0,"ageRating":8,"releaseYear":2020,"language":"en"}""",
                ),
            )

            val metadata = plugin.serial("7").getMetadata()

            assertEquals("A great story", metadata.description)
            assertEquals(listOf("1" to "Action"), metadata.genres.map { it.id to it.name })
            assertEquals(listOf("2" to "Isekai"), metadata.tags.map { it.id to it.name })
            assertEquals("OnGoing", metadata.publicationStatus)
            assertEquals("Teen", metadata.ageRating?.rating)
            assertEquals("Kavita", metadata.ageRating?.system)
            assertEquals(2020, metadata.releaseYear)
            assertEquals("en", metadata.language)
        }

    @Test
    fun `serial getCoverUrl builds a series cover url`() {
        val url = plugin.serial("7").getCoverUrl()

        assertEquals("$baseUrl/api/Image/series-cover?seriesId=7&apiKey=api-key-123", url)
    }

    @Test
    fun `serial get throws when series fetch fails`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(500))

            assertFailsWith<Throwable> { plugin.serial("7").get() }
        }

    @Test
    fun `serial getMetadata throws when metadata fetch fails`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(500))

            assertFailsWith<Throwable> { plugin.serial("7").getMetadata() }
        }

    // ── serial(id).chapters (group) ─────────────────────────────────────

    @Test
    fun `chapters list flattens volumes into a single chapter list`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"id":10,"seriesId":7,"chapters":[{"id":100,"title":"Ch 1"},{"id":101,"title":"Ch 2"}]},{"id":11,"seriesId":7,"chapters":[{"id":102,"title":"Ch 3"}]}]""",
                ),
            )

            val titles =
                plugin
                    .serial("7")
                    .chapters
                    .list()
                    .map { it.title }

            assertEquals(listOf("Ch 1", "Ch 2", "Ch 3"), titles)
        }

    @Test
    fun `chapters list maps decimalNumber specialLabel createdUtc and fileFormat`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"id":10,"seriesId":7,"chapters":[
                    |{"id":100,"title":"Ch 1","range":"1","sortOrder":1.0,"createdUtc":"2026-01-01T00:00:00Z","format":3}
                    |]}]
                    """.trimMargin(),
                ),
            )

            val chapter =
                plugin
                    .serial("7")
                    .chapters
                    .list()
                    .single()

            assertEquals(1.0, chapter.decimalNumber)
            assertEquals("1", chapter.specialLabel)
            assertEquals("2026-01-01T00:00:00Z", chapter.createdUtc)
            assertEquals("epub", chapter.fileFormat)
        }

    @Test
    fun `a loose chapter takes its number from the volume and its title from titleName`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[
                    |{"id":10,"seriesId":7,"name":"1.2","minNumber":1.2,"chapters":[{"id":100,"title":"-100000","number":"-100000","sortOrder":-100000.0,"titleName":"Capítulo 1.2","format":3}]},
                    |{"id":11,"seriesId":7,"name":"4","minNumber":4.0,"chapters":[{"id":101,"title":"-100000","number":"-100000","sortOrder":-100000.0,"titleName":"Capítulo 4","format":3}]}
                    |]""".trimMargin(),
                ),
            )

            val chapters = plugin.serial("7").chapters.list()

            assertEquals(listOf(1.2, 4.0), chapters.map { it.decimalNumber })
            assertEquals(listOf("1.2", "4"), chapters.map { it.number })
            assertEquals(listOf("Capítulo 1.2", "Capítulo 4"), chapters.map { it.title })
        }

    @Test
    fun `a loose chapter without a titleName gets an empty title, not the marker`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"id":10,"seriesId":7,"name":"3","minNumber":3.0,"chapters":[{"id":100,"title":"-100000","number":"-100000","sortOrder":-100000.0}]}]""",
                ),
            )

            val chapter = plugin.serial("7").chapters.list().single()

            assertEquals("", chapter.title)
            assertEquals(3.0, chapter.decimalNumber)
        }

    @Test
    fun `a chapter with a real number is left alone even inside a numbered volume`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"id":10,"seriesId":7,"name":"2","minNumber":2.0,"chapters":[{"id":100,"title":"Ch 9","number":"9","sortOrder":9.0,"titleName":"Nine"}]}]""",
                ),
            )

            val chapter = plugin.serial("7").chapters.list().single()

            assertEquals(9.0, chapter.decimalNumber)
            assertEquals("9", chapter.number)
            assertEquals("Ch 9", chapter.title)
        }

    @Test
    fun `a loose chapter in a volume without a number keeps its own values`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"id":10,"seriesId":7,"name":"-100000","minNumber":-100000.0,"chapters":[{"id":100,"title":"-100000","number":"-100000","sortOrder":-100000.0,"titleName":"x"}]}]""",
                ),
            )

            val chapter = plugin.serial("7").chapters.list().single()

            assertEquals(-100000.0, chapter.decimalNumber)
            assertEquals("-100000", chapter.title)
        }

    @Test
    fun `chapter get applies the same volume rule as the list`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"id":10,"seriesId":7,"name":"6","minNumber":6.0,"chapters":[{"id":100,"title":"-100000","number":"-100000","sortOrder":-100000.0,"titleName":"Capítulo 6"}]}]""",
                ),
            )

            val chapter = plugin.serial("7").chapter("100").get()

            assertEquals(6.0, chapter.decimalNumber)
            assertEquals("Capítulo 6", chapter.title)
        }

    // ── book (the EPUB capability) ────────────────────────────────────────

    @Test
    fun `book info maps the title and the page count`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200).setBody("""{"bookTitle":"Capítulo 1","chapterTitle":null,"pages":3,"seriesId":7}"""))

            val info = plugin.book.info("100")

            assertEquals(PluginBookInfo(title = "Capítulo 1", pageCount = 3), info)
            val request = server.takeRequest()
            assertEquals("/api/Book/100/book-info", request.path)
            assertEquals("Bearer jwt-token", request.getHeader("Authorization"))
        }

    @Test
    fun `book info falls back to chapterTitle and treats a blank title as none`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200).setBody("""{"bookTitle":null,"chapterTitle":"  From chapter ","pages":1}"""))
            server.enqueue(MockResponse().setResponseCode(200).setBody("""{"bookTitle":"   ","pages":1}"""))

            assertEquals("From chapter", plugin.book.info("100").title)
            assertNull(plugin.book.info("100").title)
        }

    @Test
    fun `book page returns the html fragment untouched and asks for that page`() =
        runTest {
            val html = "<div class=\" \"><style>.book-content p{margin:0}</style><h1>Capítulo 1</h1><p>Olá</p></div>"
            server.enqueue(MockResponse().setResponseCode(200).setHeader("Content-Type", "text/plain; charset=utf-8").setBody(html))

            val page = plugin.book.page("100", 2)

            assertEquals(html, page)
            assertEquals("/api/Book/100/book-page?page=2", server.takeRequest().path)
        }

    @Test
    fun `book toc maps nested items`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"title":"Obra","part":"","page":0,"children":[{"title":" Capítulo 1 ","part":"","page":0,"children":[]},{"title":null,"page":2}]}]""",
                ),
            )

            val toc = plugin.book.toc("100")

            assertEquals(
                listOf(
                    PluginBookTocItem(
                        "Obra",
                        0,
                        listOf(PluginBookTocItem("Capítulo 1", 0, emptyList()), PluginBookTocItem("", 2, emptyList())),
                    ),
                ),
                toc,
            )
            assertEquals("/api/Book/100/chapters", server.takeRequest().path)
        }

    @Test
    fun `book calls refuse a chapter id that is not a number`() =
        runTest {
            assertFailsWith<KavitaBookException> { plugin.book.page("1/../../admin", 0) }
            assertFailsWith<KavitaBookException> { plugin.book.info("abc") }
            assertEquals(0, server.requestCount)
        }

    @Test
    fun `book calls fail on an HTTP error instead of returning the error body`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(404).setBody("not found"))

            assertFailsWith<KavitaBookException> { plugin.book.page("100", 0) }
        }

    @Test
    fun `chapters list maps every MangaFormat value`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"id":10,"seriesId":7,"chapters":[
                    |{"id":100,"format":0},
                    |{"id":101,"format":1},
                    |{"id":102,"format":2},
                    |{"id":103,"format":3},
                    |{"id":104,"format":4}
                    |]}]
                    """.trimMargin(),
                ),
            )

            val formats =
                plugin
                    .serial("7")
                    .chapters
                    .list()
                    .map { it.fileFormat }

            assertEquals(listOf("image", "archive", "unknown", "epub", "pdf"), formats)
        }

    @Test
    fun `chapter get maps decimalNumber specialLabel createdUtc and fileFormat`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"id":10,"seriesId":7,"chapters":[
                    |{"id":100,"title":"Ch 1","range":"Special","sortOrder":2.5,"createdUtc":"2026-02-02T00:00:00Z","format":1}
                    |]}]
                    """.trimMargin(),
                ),
            )

            val chapter = plugin.serial("7").chapter("100").get()

            assertEquals(2.5, chapter.decimalNumber)
            assertEquals("Special", chapter.specialLabel)
            assertEquals("2026-02-02T00:00:00Z", chapter.createdUtc)
            assertEquals("archive", chapter.fileFormat)
        }

    @Test
    fun `chapter getCoverUrl builds a chapter cover url`() {
        val url = plugin.serial("7").chapter("100").getCoverUrl()

        assertEquals("$baseUrl/api/Image/chapter-cover?chapterId=100&apiKey=api-key-123", url)
    }

    @Test
    fun `chapters setRead true marks as read for the batch`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200))

            plugin.serial("7").chapters.setRead(true, listOf("100", "101"))

            val recorded = server.takeRequest()
            assertTrue(recorded.path?.endsWith("/api/Reader/mark-multiple-read") == true)
        }

    @Test
    fun `chapters setRead false marks as unread for the batch`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200))

            plugin.serial("7").chapters.setRead(false, listOf("100"))

            val recorded = server.takeRequest()
            assertTrue(recorded.path?.endsWith("/api/Reader/mark-multiple-unread") == true)
        }

    @Test
    fun `chapters list and chapter get on the same Serial share one request`() =
        runTest {
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
    fun `a fresh serial(id) call does not reuse the previous instance's memoized volumes`() =
        runTest {
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
    fun `chapters setRead invalidates the memoized volumes so the next list refetches`() =
        runTest {
            server.enqueue(
                MockResponse()
                    .setResponseCode(
                        200,
                    ).setBody("""[{"id":10,"seriesId":7,"chapters":[{"id":100,"title":"Ch 1","pagesRead":0}]}]"""),
            )
            server.enqueue(MockResponse().setResponseCode(200)) // mark-multiple-read
            server.enqueue(
                MockResponse()
                    .setResponseCode(
                        200,
                    ).setBody("""[{"id":10,"seriesId":7,"chapters":[{"id":100,"title":"Ch 1","pagesRead":20}]}]"""),
            )

            val serial = plugin.serial("7")
            serial.chapters.list()
            serial.chapters.setRead(true, listOf("100"))
            val afterWrite = serial.chapters.list().single()

            assertEquals(20, afterWrite.pagesRead)
            assertEquals(3, server.requestCount)
        }

    @Test
    fun `chapter setRead invalidates the owning Serial's memoized volumes`() =
        runTest {
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
    fun `chapter setProgress invalidates the owning Serial's memoized volumes`() =
        runTest {
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
    fun `chapter get filters the matching chapter from the series listing`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"id":10,"seriesId":7,"chapters":[{"id":100,"title":"Ch 1"},{"id":101,"title":"Ch 2"}]}]""",
                ),
            )

            val chapter = plugin.serial("7").chapter("101").get()

            assertEquals("Ch 2", chapter.title)
        }

    @Test
    fun `chapter get throws when chapter is not in the series`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200).setBody("""[]"""))

            assertFailsWith<KavitaServerPluginException> { plugin.serial("7").chapter("999").get() }
        }

    @Test
    fun `chapter setRead true marks this single chapter as read`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200))

            plugin.serial("7").chapter("100").setRead(true)

            val recorded = server.takeRequest()
            assertTrue(recorded.body.readUtf8().contains("\"chapterIds\":[100]"))
        }

    @Test
    fun `chapter getProgress maps dto including bookScrollId source fields`() =
        runTest {
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
    fun `chapter getProgress returns null when there is no saved progress`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(404))

            assertNull(plugin.serial("7").chapter("100").getProgress())
        }

    @Test
    fun `chapter setProgress looks up volume and saves`() =
        runTest {
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
    fun `page getDimensions returns the dimension at that index`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """{"pageDimensions":[{"width":800,"height":1100,"pageNumber":0},{"width":800,"height":1200,"pageNumber":1}]}""",
                ),
            )

            val dimension =
                plugin
                    .serial("7")
                    .chapter("100")
                    .page(1)
                    .getDimensions()

            assertEquals(800, dimension.width)
            assertEquals(1200, dimension.height)
        }

    @Test
    fun `page getDimensions throws when index is out of range`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200).setBody("""{"pageDimensions":[]}"""))

            assertFailsWith<KavitaServerPluginException> {
                plugin
                    .serial("7")
                    .chapter("100")
                    .page(5)
                    .getDimensions()
            }
        }

    @Test
    fun `page getUrl builds a single page url`() {
        val url =
            plugin
                .serial("7")
                .chapter("100")
                .page(2)
                .getUrl()

        assertEquals("$baseUrl/api/reader/image?chapterId=100&page=2&apiKey=api-key-123", url)
    }
}
