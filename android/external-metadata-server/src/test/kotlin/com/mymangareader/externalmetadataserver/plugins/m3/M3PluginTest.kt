package com.mymangareader.externalmetadataserver.plugins.m3

import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataSeriesRef
import com.mymangareader.tools.network.RequestTool
import kotlin.test.assertFailsWith
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

class M3PluginTest {

    private lateinit var server: MockWebServer
    private lateinit var plugin: M3Plugin
    private lateinit var baseUrl: String

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        baseUrl = server.url("/").toString().trimEnd('/')
        plugin = M3Plugin(baseUrl, RequestTool(OkHttpClient()))
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    // ── identity ──────────────────────────────────────────────────────────

    @Test
    fun `exposes stable identity fields`() {
        assertEquals("m3", plugin.id)
        assertEquals("My Mangá Manager", plugin.displayName)
        assertEquals("1.0.0", plugin.version)
    }

    // ── auth (M3 has none — real no-op) ──────────────────────────────────

    @Test
    fun `auth authenticate is a no-op`() = runTest {
        plugin.auth.authenticate()
    }

    @Test
    fun `auth checkToken always returns null`() = runTest {
        assertNull(plugin.auth.checkToken())
    }

    @Test
    fun `auth reauthenticate is a no-op`() = runTest {
        plugin.auth.reauthenticate()
    }

    @Test
    fun `auth logout is a no-op`() = runTest {
        plugin.auth.logout()
    }

    @Test
    fun `getSession always returns null`() {
        assertNull(plugin.auth.getSession())
    }

    // ── fetchMatches ──────────────────────────────────────────────────────

    @Test
    fun `fetchMatches matches by kavitaId when present`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """
                [
                    {"title":"Some Manga","status":"ongoing","downloaded_chapters_count":3,
                     "known_chapters_total":10,"latest_chapter_number":"10","has_errors":false,"kavita_id":42}
                ]
                """.trimIndent(),
            ),
        )

        val matches = plugin.fetchMatches(listOf(ExternalMetadataSeriesRef(id = "42", name = "Different Name")))

        assertEquals(1, matches.size)
        assertEquals("42", matches.single()?.seriesId)
        assertEquals("ongoing", matches.single()?.status)
        assertEquals(3, matches.single()?.downloadedChapters)
    }

    @Test
    fun `fetchMatches falls back to normalized name match when kavitaId is absent`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """[{"title":"Attack on Titan!","status":"completed","has_errors":false}]""",
            ),
        )

        val matches = plugin.fetchMatches(listOf(ExternalMetadataSeriesRef(id = "1", name = "attack on titan")))

        assertEquals(1, matches.size)
        assertEquals("completed", matches.single()?.status)
    }

    @Test
    fun `fetchMatches returns a positional null for a series with no matching entry, never drops it`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""[]"""))

        val matches = plugin.fetchMatches(listOf(ExternalMetadataSeriesRef(id = "1", name = "Unmatched Series")))

        assertEquals(1, matches.size)
        assertNull(matches.single())
    }

    @Test
    fun `fetchMatches preserves order and correlation for a mix of matched and unmatched series`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """[{"title":"Some Manga","status":"ongoing","has_errors":false,"kavita_id":42}]""",
            ),
        )

        val matches = plugin.fetchMatches(
            listOf(
                ExternalMetadataSeriesRef(id = "1", name = "Unmatched Series"),
                ExternalMetadataSeriesRef(id = "42", name = "Different Name"),
            ),
        )

        assertEquals(2, matches.size)
        assertNull(matches[0])
        assertEquals("42", matches[1]?.seriesId)
    }

    @Test
    fun `fetchMatches throws on a non-200 response`() = runTest {
        server.enqueue(MockResponse().setResponseCode(500))

        assertFailsWith<M3PluginException> {
            plugin.fetchMatches(listOf(ExternalMetadataSeriesRef(id = "1", name = "X")))
        }
    }

    @Test
    fun `fetchMatches requests the manga path`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""[]"""))

        plugin.fetchMatches(emptyList())

        val recorded = server.takeRequest()
        assertEquals("/manga", recorded.path)
        assertEquals("GET", recorded.method)
    }

    // ── fetchMatch (singular) ────────────────────────────────────────────

    @Test
    fun `fetchMatch matches by kavitaId when present`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """[{"title":"Some Manga","status":"ongoing","has_errors":false,"kavita_id":42}]""",
            ),
        )

        val match = plugin.fetchMatch(ExternalMetadataSeriesRef(id = "42", name = "Different Name"))

        assertEquals("42", match?.seriesId)
        assertEquals("ongoing", match?.status)
    }

    @Test
    fun `fetchMatch returns null when nothing matches`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""[]"""))

        val match = plugin.fetchMatch(ExternalMetadataSeriesRef(id = "1", name = "Unmatched Series"))

        assertNull(match)
    }

    @Test
    fun `fetchMatch throws on a non-200 response`() = runTest {
        server.enqueue(MockResponse().setResponseCode(500))

        assertFailsWith<M3PluginException> {
            plugin.fetchMatch(ExternalMetadataSeriesRef(id = "1", name = "X"))
        }
    }

    // ── fetchMatch memoization (no single-series endpoint on M3 — see fetchAllManga's doc) ──

    @Test
    fun `fetchMatch reuses the same manga listing across calls within the protection window`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """[{"title":"Manga A","status":"ongoing","has_errors":false,"kavita_id":1}]""",
            ),
        )

        plugin.fetchMatch(ExternalMetadataSeriesRef(id = "1", name = "Manga A"))
        plugin.fetchMatch(ExternalMetadataSeriesRef(id = "1", name = "Manga A"))
        plugin.fetchMatch(ExternalMetadataSeriesRef(id = "1", name = "Manga A"))

        // only one HTTP call, even though fetchMatch was called 3 times — MockWebServer has just
        // one response enqueued, so a 2nd/3rd real request would fail this test outright.
        assertEquals(1, server.requestCount)
    }

    @Test
    fun `fetchMatches and fetchMatch share the same memoized listing`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """[{"title":"Manga A","status":"ongoing","has_errors":false,"kavita_id":1}]""",
            ),
        )

        plugin.fetchMatches(listOf(ExternalMetadataSeriesRef(id = "1", name = "Manga A")))
        plugin.fetchMatch(ExternalMetadataSeriesRef(id = "1", name = "Manga A"))

        assertEquals(1, server.requestCount)
    }
}
