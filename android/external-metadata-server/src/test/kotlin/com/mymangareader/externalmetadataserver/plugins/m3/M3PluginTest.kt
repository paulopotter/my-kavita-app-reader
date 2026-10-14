package com.mymangareader.externalmetadataserver.plugins.m3

import com.mymangareader.cache.Cache
import com.mymangareader.core.database.CacheDao
import com.mymangareader.core.database.CacheEntity
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataSeriesRef
import com.mymangareader.tools.network.RequestTool
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import kotlin.test.assertFailsWith

// In-memory CacheDao — just enough for a real Cache() to construct against; Cache.network's own
// behavior is already covered by :cache's own NetworkCacheTest, these tests only need
// fetchAllManga's single-flight/TTL memoization to work end to end through a real Cache instance.
private class FakeCacheDao : CacheDao {
    private data class MapKey(
        val key: String,
        val variant: String,
    )

    private val entities = mutableMapOf<MapKey, CacheEntity>()

    override suspend fun getByKey(
        key: String,
        variant: String,
    ): CacheEntity? = entities[MapKey(key, variant)]

    override suspend fun upsert(entity: CacheEntity) {
        entities[MapKey(entity.key, entity.variant)] = entity
    }

    override suspend fun touchLastAccessed(
        key: String,
        variant: String,
        lastAccessedAtEpochMs: Long,
    ) = Unit

    override suspend fun deleteByKey(
        key: String,
        variant: String,
    ) {
        entities.remove(MapKey(key, variant))
    }

    override suspend fun deleteByDomain(domain: String) {
        entities.values.filter { it.domain == domain }.forEach { entities.remove(MapKey(it.key, it.variant)) }
    }

    override suspend fun deleteByVariant(
        domain: String,
        variant: String,
    ) {
        entities.values.filter { it.domain == domain && it.variant == variant }.forEach { entities.remove(MapKey(it.key, it.variant)) }
    }

    override suspend fun getAllExpired(nowEpochMs: Long): List<CacheEntity> = entities.values.filter { it.expiresAtEpochMs <= nowEpochMs }

    override suspend fun getOlderThan(cutoffEpochMs: Long): List<CacheEntity> = entities.values.filter { it.cachedAtEpochMs < cutoffEpochMs && it.lastAccessedAtEpochMs < cutoffEpochMs }

    override suspend fun queryFiltered(
        keys: List<String>,
        hasKeys: Int,
        domain: String?,
        variant: String?,
    ): List<CacheEntity> =
        entities.values.filter { e ->
            (hasKeys == 0 || e.key in keys) &&
                (domain == null || e.domain == domain) &&
                (variant == null || e.variant == variant)
        }

    override suspend fun deleteExpired(entries: List<CacheEntity>) {
        entries.forEach { entities.remove(MapKey(it.key, it.variant)) }
    }
}

class M3PluginTest {
    private lateinit var server: MockWebServer
    private lateinit var plugin: M3Plugin
    private lateinit var baseUrl: String

    // path (with query) → response. Anything unregistered answers 404, like the real server. A
    // dispatcher rather than enqueue(): fetchMatches runs its lookups concurrently, so the order
    // responses are consumed in is not the order they were queued in.
    private val routes = mutableMapOf<String, MockResponse>()
    private val requested = java.util.Collections.synchronizedList(mutableListOf<String>())

    @Before
    fun setUp() {
        server = MockWebServer()
        server.dispatcher =
            object : Dispatcher() {
                override fun dispatch(request: RecordedRequest): MockResponse {
                    requested += request.path.orEmpty()
                    return routes[request.path] ?: MockResponse().setResponseCode(404).setBody("""{"detail":"Not Found"}""")
                }
            }
        server.start()
        baseUrl = server.url("/").toString().trimEnd('/')
        plugin = M3Plugin(baseUrl, RequestTool(OkHttpClient()), Cache(FakeCacheDao()))
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    private fun route(
        path: String,
        body: String,
        status: Int = 200,
    ) {
        routes[path] = MockResponse().setResponseCode(status).setBody(body)
    }

    private fun ref(
        id: String = "116",
        name: String = "Some Manga",
        providerId: String = "kavita",
    ) = ExternalMetadataSeriesRef(id = id, providerId = providerId, name = name)

    private val detailBody =
        """
        {"id":1,"slug":"some-manga","title":"Some Manga","status":"ongoing","abandoned":false,
         "summary":"A summary.","genres":["Ação","Aventura"],"author":null,
         "alternative_title_items":[{"label":"romaji","value":"Sono Manga"}],
         "chapter_count":60,"accepted_chapter_count":65,"last_chapter_name":"65",
         "external_ids":[
            {"provider":"kavita","name":"Kavita (série)","external_id":"116","is_inferred":false,"url":"http://x"},
            {"provider":"nexus","name":"Nexus","external_id":"3741","is_inferred":false,"url":"http://y"}]}
        """.trimIndent()

    private fun searchBody(vararg slugToTitle: Pair<String, String>) =
        """{"items":[${slugToTitle.joinToString(",") { """{"slug":"${it.first}","title":"${it.second}"}""" }}],"has_more":false,"limit":20}"""

    // ── identity ──────────────────────────────────────────────────────────

    @Test
    fun `exposes stable identity fields`() {
        assertEquals("m3", plugin.id)
        assertEquals("My Mangá Manager", plugin.displayName)
        assertEquals("1.1.0", plugin.version)
    }

    @Test
    fun `health check path is the status route`() {
        assertEquals("/api/status", M3Plugin.defaultHealthCheckPath)
    }

    // ── auth (M3 has none — real no-op) ──────────────────────────────────

    @Test
    fun `auth authenticate is a no-op`() =
        runTest {
            plugin.auth.authenticate()
        }

    @Test
    fun `auth checkToken always returns null`() =
        runTest {
            assertNull(plugin.auth.checkToken())
        }

    @Test
    fun `auth reauthenticate is a no-op`() =
        runTest {
            plugin.auth.reauthenticate()
        }

    @Test
    fun `auth logout is a no-op`() =
        runTest {
            plugin.auth.logout()
        }

    @Test
    fun `getSession always returns null`() {
        assertNull(plugin.auth.getSession())
    }

    // ── fetchMatch — by-id route ─────────────────────────────────────────

    @Test
    fun `fetchMatch asks the provider-qualified v1 route`() =
        runTest {
            route("/api/v1/manga/by-id/kavita/116", detailBody)

            plugin.fetchMatch(ref())

            // by-id resolves the series; its slug then opens the full record.
            assertEquals(listOf("/api/v1/manga/by-id/kavita/116", "/api/v1/manga/some-manga"), requested)
        }

    @Test
    fun `fetchMatch takes the rich fields from the full record, since by-id answers with the card only`() =
        runTest {
            route("/api/v1/manga/by-id/kavita/116", """{"slug":"some-manga","title":"Some Manga","status":"ongoing","chapter_count":60}""")
            route("/api/v1/manga/some-manga", detailBody)

            val match = plugin.fetchMatch(ref())

            assertEquals("A summary.", match?.summary)
            assertEquals(3741, match?.externalIds?.nexusId)
            assertEquals("Sono Manga", match?.alternativeTitles?.single()?.value)
        }

    @Test
    fun `fetchMatch keeps the card when the full record is unavailable`() =
        runTest {
            route("/api/v1/manga/by-id/kavita/116", """{"slug":"some-manga","title":"Some Manga","status":"ongoing","chapter_count":60}""")

            val match = plugin.fetchMatch(ref())

            assertEquals("ongoing", match?.status)
            assertEquals(60, match?.downloadedChapters)
            assertNull(match?.summary)
        }

    @Test
    fun `fetchMatch uses the providerId it was given, not a hardcoded one`() =
        runTest {
            route("/api/v1/manga/by-id/someotherprovider/9", detailBody)

            plugin.fetchMatch(ref(id = "9", providerId = "someotherprovider"))

            assertEquals("/api/v1/manga/by-id/someotherprovider/9", requested.first())
        }

    @Test
    fun `fetchMatch maps the detail fields`() =
        runTest {
            route("/api/v1/manga/by-id/kavita/116", detailBody)

            val match = plugin.fetchMatch(ref())

            assertEquals("116", match?.seriesId)
            assertEquals("some-manga", match?.slug)
            assertEquals("ongoing", match?.status)
            assertEquals("A summary.", match?.summary)
            assertEquals(listOf("Ação", "Aventura"), match?.genres)
            assertNull(match?.author)
            assertEquals(false, match?.abandoned)
            assertEquals("romaji", match?.alternativeTitles?.single()?.label)
            assertEquals("Sono Manga", match?.alternativeTitles?.single()?.value)
            assertEquals("65", match?.latestChapterLabel)
        }

    @Test
    fun `fetchMatch maps chapter_count to downloaded and accepted_chapter_count to total`() =
        runTest {
            route("/api/v1/manga/by-id/kavita/116", detailBody)

            val match = plugin.fetchMatch(ref())

            assertEquals(60, match?.downloadedChapters)
            assertEquals(65, match?.totalChapters)
        }

    @Test
    fun `fetchMatch leaves total null when accepted_chapter_count is null`() =
        runTest {
            route("/api/v1/manga/by-id/kavita/116", """{"title":"X","chapter_count":10,"accepted_chapter_count":null}""")

            val match = plugin.fetchMatch(ref())

            assertEquals(10, match?.downloadedChapters)
            assertNull(match?.totalChapters)
        }

    @Test
    fun `fetchMatch maps external_ids by provider and ignores the ones it does not know`() =
        runTest {
            route("/api/v1/manga/by-id/kavita/116", detailBody)

            val ids = plugin.fetchMatch(ref())?.externalIds

            assertEquals(3741, ids?.nexusId)
            assertNull(ids?.malId)
            assertNull(ids?.anilistId)
            assertNull(ids?.onyxreaderId)
        }

    @Test
    fun `fetchMatch maps the mal, anilist and onyxreader ids`() =
        runTest {
            route(
                "/api/v1/manga/by-id/kavita/116",
                """{"title":"X","external_ids":[
                    {"provider":"mal","external_id":"11"},
                    {"provider":"anilist","external_id":"22"},
                    {"provider":"onyxreader","external_id":"33"},
                    {"provider":"nexus","external_id":"not-a-number"}]}""",
            )

            val ids = plugin.fetchMatch(ref())?.externalIds

            assertEquals(11, ids?.malId)
            assertEquals(22, ids?.anilistId)
            assertEquals(33, ids?.onyxreaderId)
            assertNull(ids?.nexusId)
        }

    @Test
    fun `fetchMatch has no externalIds when the detail lists none`() =
        runTest {
            route("/api/v1/manga/by-id/kavita/116", """{"title":"X","external_ids":[]}""")

            assertNull(plugin.fetchMatch(ref())?.externalIds)
        }

    @Test
    fun `fetchMatch carries abandoned when the provider states it`() =
        runTest {
            route("/api/v1/manga/by-id/kavita/7", """{"title":"Dropped","status":"ongoing","abandoned":true}""")

            assertEquals(true, plugin.fetchMatch(ref(id = "7", name = "Dropped"))?.abandoned)
        }

    @Test
    fun `hasErrors is always false because v1 exposes no such flag`() =
        runTest {
            route("/api/v1/manga/by-id/kavita/116", detailBody)

            assertEquals(false, plugin.fetchMatch(ref())?.hasErrors)
        }

    @Test
    fun `fetchMatch defaults status to unknown when the detail has none`() =
        runTest {
            route("/api/v1/manga/by-id/kavita/116", """{"title":"X"}""")

            assertEquals("unknown", plugin.fetchMatch(ref())?.status)
        }

    @Test
    fun `fetchMatch throws on a non-200, non-404 response`() =
        runTest {
            route("/api/v1/manga/by-id/kavita/116", "", status = 500)

            assertFailsWith<M3PluginException> { plugin.fetchMatch(ref()) }
        }

    // ── fetchMatch — title fallback ──────────────────────────────────────

    @Test
    fun `fetchMatch falls back to a title search when by-id answers 404`() =
        runTest {
            route("/api/v1/mangas?q=attack+on+titan&limit=20", searchBody("attack-on-titan" to "Attack on Titan!"))
            route("/api/v1/manga/attack-on-titan", """{"slug":"attack-on-titan","title":"Attack on Titan!","status":"completed"}""")

            val match = plugin.fetchMatch(ref(id = "1", name = "attack on titan"))

            assertEquals("completed", match?.status)
            assertEquals("1", match?.seriesId)
        }

    @Test
    fun `the title fallback encodes the query`() =
        runTest {
            route("/api/v1/mangas?q=Rock+%26+Roll&limit=20", searchBody())

            plugin.fetchMatch(ref(name = "Rock & Roll"))

            assertTrue(requested.any { it == "/api/v1/mangas?q=Rock+%26+Roll&limit=20" })
        }

    @Test
    fun `the fallback match carries the detail's rich fields`() =
        runTest {
            route("/api/v1/mangas?q=Some+Manga&limit=20", searchBody("some-manga" to "Some Manga"))
            route("/api/v1/manga/some-manga", detailBody)

            val match = plugin.fetchMatch(ref())

            assertEquals("A summary.", match?.summary)
        }

    @Test
    fun `fetchMatch returns null when the search finds nothing`() =
        runTest {
            route("/api/v1/mangas?q=Unmatched&limit=20", searchBody())

            assertNull(plugin.fetchMatch(ref(name = "Unmatched")))
        }

    @Test
    fun `fetchMatch returns null for several exact title matches, never guessing`() =
        runTest {
            route("/api/v1/mangas?q=Twin&limit=20", searchBody("twin-a" to "Twin", "twin-b" to "Twin"))

            assertNull(plugin.fetchMatch(ref(name = "Twin")))
        }

    @Test
    fun `fetchMatch matches through an alternative title when no card title is exact`() =
        runTest {
            route("/api/v1/mangas?q=Sono+Manga&limit=20", searchBody("some-manga" to "Some Manga", "other" to "Other"))
            route("/api/v1/manga/some-manga", detailBody)
            route("/api/v1/manga/other", """{"slug":"other","title":"Other","alternative_title_items":[]}""")

            val match = plugin.fetchMatch(ref(name = "Sono Manga"))

            assertEquals("some-manga", match?.slug)
        }

    @Test
    fun `fetchMatch returns null when no alternative title matches`() =
        runTest {
            route("/api/v1/mangas?q=Nope&limit=20", searchBody("some-manga" to "Some Manga"))
            route("/api/v1/manga/some-manga", detailBody)

            assertNull(plugin.fetchMatch(ref(name = "Nope")))
        }

    @Test
    fun `fetchMatch returns null when two candidates share the alternative title`() =
        runTest {
            route("/api/v1/mangas?q=Sono+Manga&limit=20", searchBody("a" to "A", "b" to "B"))
            route("/api/v1/manga/a", """{"slug":"a","title":"A","alternative_title_items":[{"label":"x","value":"Sono Manga"}]}""")
            route("/api/v1/manga/b", """{"slug":"b","title":"B","alternative_title_items":[{"label":"x","value":"Sono Manga"}]}""")

            assertNull(plugin.fetchMatch(ref(name = "Sono Manga")))
        }

    @Test
    fun `fetchMatch goes straight to the title when the providerId is blank`() =
        runTest {
            route("/api/v1/mangas?q=Some+Manga&limit=20", searchBody("some-manga" to "Some Manga"))
            route("/api/v1/manga/some-manga", detailBody)

            val match = plugin.fetchMatch(ref(providerId = ""))

            assertEquals("ongoing", match?.status)
            assertTrue(requested.none { it.contains("by-id") })
        }

    @Test
    fun `fetchMatch returns null without any request for a blank name when by-id is a miss`() =
        runTest {
            assertNull(plugin.fetchMatch(ref(name = "  ")))

            assertEquals(listOf("/api/v1/manga/by-id/kavita/116"), requested)
        }

    @Test
    fun `the search never downloads the catalog`() =
        runTest {
            route("/api/v1/mangas?q=Some+Manga&limit=20", searchBody())

            plugin.fetchMatch(ref())

            assertTrue(requested.none { it == "/api/v1/mangas" || it.contains("limit=1000") })
        }

    @Test
    fun `fetchMatch throws when the search fails`() =
        runTest {
            route("/api/v1/mangas?q=Some+Manga&limit=20", "", status = 500)

            assertFailsWith<M3PluginException> { plugin.fetchMatch(ref()) }
        }

    // ── fetchMatches ──────────────────────────────────────────────────────

    @Test
    fun `fetchMatches resolves each series by its own id`() =
        runTest {
            route("/api/v1/manga/by-id/kavita/1", """{"title":"One","status":"ongoing"}""")
            route("/api/v1/manga/by-id/kavita/2", """{"title":"Two","status":"completed"}""")

            val matches = plugin.fetchMatches(listOf(ref(id = "1", name = "One"), ref(id = "2", name = "Two")))

            assertEquals(listOf("ongoing", "completed"), matches.map { it?.status })
            assertEquals(listOf("1", "2"), matches.map { it?.seriesId })
        }

    @Test
    fun `fetchMatches returns a positional null for an unmatched series, never drops it`() =
        runTest {
            route("/api/v1/manga/by-id/kavita/2", """{"title":"Two","status":"completed"}""")
            route("/api/v1/mangas?q=Unmatched&limit=20", searchBody())

            val matches = plugin.fetchMatches(listOf(ref(id = "1", name = "Unmatched"), ref(id = "2", name = "Two")))

            assertEquals(2, matches.size)
            assertNull(matches[0])
            assertEquals("2", matches[1]?.seriesId)
        }

    @Test
    fun `fetchMatches of an empty list makes no request`() =
        runTest {
            assertEquals(emptyList<Any?>(), plugin.fetchMatches(emptyList()))
            assertEquals(0, server.requestCount)
        }

    @Test
    fun `fetchMatches throws on a failing response`() =
        runTest {
            route("/api/v1/manga/by-id/kavita/1", "", status = 500)

            assertFailsWith<M3PluginException> { plugin.fetchMatches(listOf(ref(id = "1"))) }
        }

    @Test
    fun `fetchMatches resolves more series than its concurrency limit`() =
        runTest {
            (1..10).forEach { route("/api/v1/manga/by-id/kavita/$it", """{"title":"S$it","status":"ongoing"}""") }

            val matches = plugin.fetchMatches((1..10).map { ref(id = "$it", name = "S$it") })

            assertEquals((1..10).map { "$it" }, matches.map { it?.seriesId })
        }

    // ── memoization ──────────────────────────────────────────────────────

    @Test
    fun `fetchMatch memoizes the per-series lookup across calls`() =
        runTest {
            route("/api/v1/manga/by-id/kavita/116", detailBody)

            repeat(3) { plugin.fetchMatch(ref()) }

            // by-id + the full record, once each.
            assertEquals(2, server.requestCount)
        }

    // A 404 is a real answer ("not indexed under this id"), so it is memoized too — otherwise
    // every repeated open of an unindexed series would re-ask the route AND re-run the search.
    @Test
    fun `fetchMatch memoizes a 404 and the title search instead of re-asking`() =
        runTest {
            route("/api/v1/mangas?q=Unmatched&limit=20", searchBody())

            repeat(2) { plugin.fetchMatch(ref(name = "Unmatched")) }

            assertEquals(2, server.requestCount)
        }

    @Test
    fun `the detail by slug is memoized across fallback calls`() =
        runTest {
            route("/api/v1/mangas?q=Some+Manga&limit=20", searchBody("some-manga" to "Some Manga"))
            route("/api/v1/manga/some-manga", detailBody)

            plugin.fetchMatch(ref())
            plugin.fetchMatch(ref(id = "999"))

            // by-id 116 (404) + search + slug, then by-id 999 (404); the search and slug are reused.
            assertEquals(4, server.requestCount)
        }
}
