package com.mymangareader.externalmetadataserver.plugins.m3

import com.mymangareader.cache.Cache
import com.mymangareader.core.database.CacheDao
import com.mymangareader.core.database.CacheEntity
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataSeriesRef
import com.mymangareader.tools.network.RequestTool
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
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

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        baseUrl = server.url("/").toString().trimEnd('/')
        plugin = M3Plugin(baseUrl, RequestTool(OkHttpClient()), Cache(FakeCacheDao()))
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

    // ── fetchMatches ──────────────────────────────────────────────────────

    @Test
    fun `fetchMatches matches by kavitaId when present`() =
        runTest {
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

            val matches = plugin.fetchMatches(listOf(ExternalMetadataSeriesRef(id = "42", providerId = "kavita", name = "Different Name")))

            assertEquals(1, matches.size)
            assertEquals("42", matches.single()?.seriesId)
            assertEquals("ongoing", matches.single()?.status)
            assertEquals(3, matches.single()?.downloadedChapters)
        }

    @Test
    fun `fetchMatches falls back to normalized name match when kavitaId is absent`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"title":"Attack on Titan!","status":"completed","has_errors":false}]""",
                ),
            )

            val matches = plugin.fetchMatches(listOf(ExternalMetadataSeriesRef(id = "1", providerId = "kavita", name = "attack on titan")))

            assertEquals(1, matches.size)
            assertEquals("completed", matches.single()?.status)
        }

    @Test
    fun `fetchMatches returns a positional null for a series with no matching entry, never drops it`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200).setBody("""[]"""))

            val matches = plugin.fetchMatches(listOf(ExternalMetadataSeriesRef(id = "1", providerId = "kavita", name = "Unmatched Series")))

            assertEquals(1, matches.size)
            assertNull(matches.single())
        }

    @Test
    fun `fetchMatches preserves order and correlation for a mix of matched and unmatched series`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"title":"Some Manga","status":"ongoing","has_errors":false,"kavita_id":42}]""",
                ),
            )

            val matches =
                plugin.fetchMatches(
                    listOf(
                        ExternalMetadataSeriesRef(id = "1", providerId = "kavita", name = "Unmatched Series"),
                        ExternalMetadataSeriesRef(id = "42", providerId = "kavita", name = "Different Name"),
                    ),
                )

            assertEquals(2, matches.size)
            assertNull(matches[0])
            assertEquals("42", matches[1]?.seriesId)
        }

    @Test
    fun `fetchMatches throws on a non-200 response`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(500))

            assertFailsWith<M3PluginException> {
                plugin.fetchMatches(listOf(ExternalMetadataSeriesRef(id = "1", providerId = "kavita", name = "X")))
            }
        }

    @Test
    fun `fetchMatches requests the manga path`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200).setBody("""[]"""))

            plugin.fetchMatches(emptyList())

            val recorded = server.takeRequest()
            assertEquals("/manga", recorded.path)
            assertEquals("GET", recorded.method)
        }

    // ── fetchMatch (singular) — provider-qualified route ─────────────────

    // The rich payload the per-series route answers with; the listing carries none of the
    // descriptive fields.
    private val detailBody =
        """
        {"slug":"some-manga","title":"Some Manga","status":"ongoing","abandoned":false,
         "summary":"A summary.","genres":["Ação","Aventura"],"author":null,
         "alternative_titles":[{"label":"romaji","value":"Sono Manga"}],
         "known_chapters_total":65,"downloaded_chapters_count":60,"has_errors":false,
         "external_ids":{"mal_id":null,"anilist_id":null,"nexus_id":3741,"kavita_series_id":116}}
        """.trimIndent()

    @Test
    fun `fetchMatch requests the provider-qualified path`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200).setBody(detailBody))

            plugin.fetchMatch(ExternalMetadataSeriesRef(id = "116", providerId = "kavita", name = "Some Manga"))

            val recorded = server.takeRequest()
            assertEquals("/manga/by-id/kavita/116", recorded.path)
            assertEquals("GET", recorded.method)
        }

    @Test
    fun `fetchMatch maps the rich fields the per-series route carries`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200).setBody(detailBody))

            val match = plugin.fetchMatch(ExternalMetadataSeriesRef(id = "116", providerId = "kavita", name = "Some Manga"))

            assertEquals("116", match?.seriesId)
            assertEquals("some-manga", match?.slug)
            assertEquals("ongoing", match?.status)
            assertEquals("A summary.", match?.summary)
            assertEquals(listOf("Ação", "Aventura"), match?.genres)
            assertNull(match?.author)
            assertEquals(false, match?.abandoned)
            assertEquals(1, match?.alternativeTitles?.size)
            assertEquals("romaji", match?.alternativeTitles?.single()?.label)
            assertEquals("Sono Manga", match?.alternativeTitles?.single()?.value)
            assertEquals(3741, match?.externalIds?.nexusId)
            assertNull(match?.externalIds?.malId)
            assertEquals(65, match?.totalChapters)
            assertEquals(60, match?.downloadedChapters)
        }

    @Test
    fun `fetchMatch carries abandoned when the provider states it`() =
        runTest {
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """{"title":"Dropped","status":"ongoing","abandoned":true,"has_errors":false}""",
                ),
            )

            val match = plugin.fetchMatch(ExternalMetadataSeriesRef(id = "7", providerId = "kavita", name = "Dropped"))

            assertEquals(true, match?.abandoned)
        }

    @Test
    fun `fetchMatch uses the providerId it was given, not a hardcoded one`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200).setBody(detailBody))

            plugin.fetchMatch(ExternalMetadataSeriesRef(id = "9", providerId = "someotherprovider", name = "X"))

            assertEquals("/manga/by-id/someotherprovider/9", server.takeRequest().path)
        }

    // ── fetchMatch — 404 fallback to the listing ─────────────────────────

    @Test
    fun `fetchMatch falls back to a normalized title match on the listing when the route answers 404`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(404))
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"title":"Attack on Titan!","status":"completed","has_errors":false}]""",
                ),
            )

            val match = plugin.fetchMatch(ExternalMetadataSeriesRef(id = "1", providerId = "kavita", name = "attack on titan"))

            assertEquals("completed", match?.status)
            assertEquals("1", match?.seriesId)
            assertEquals(2, server.requestCount)
        }

    @Test
    fun `a match from the listing fallback carries no descriptive fields`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(404))
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"title":"Some Manga","status":"ongoing","has_errors":false}]""",
                ),
            )

            val match = plugin.fetchMatch(ExternalMetadataSeriesRef(id = "1", providerId = "kavita", name = "Some Manga"))

            assertNull(match?.summary)
            assertEquals(emptyList<String>(), match?.genres)
        }

    @Test
    fun `fetchMatch returns null when neither the route nor the listing knows the series`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(404))
            server.enqueue(MockResponse().setResponseCode(200).setBody("""[]"""))

            val match = plugin.fetchMatch(ExternalMetadataSeriesRef(id = "1", providerId = "kavita", name = "Unmatched Series"))

            assertNull(match)
        }

    // A blank providerId is what the bridge sends when no content group has been resolved yet in
    // this process — the lookup simply finds nothing and the title fallback takes over.
    @Test
    fun `fetchMatch still resolves through the listing when the providerId is blank`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(404))
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"title":"Some Manga","status":"ongoing","has_errors":false}]""",
                ),
            )

            val match = plugin.fetchMatch(ExternalMetadataSeriesRef(id = "1", providerId = "", name = "Some Manga"))

            assertEquals("ongoing", match?.status)
        }

    @Test
    fun `fetchMatch throws on a non-200, non-404 response`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(500))

            assertFailsWith<M3PluginException> {
                plugin.fetchMatch(ExternalMetadataSeriesRef(id = "1", providerId = "kavita", name = "X"))
            }
        }

    // ── memoization ──────────────────────────────────────────────────────

    @Test
    fun `fetchMatch memoizes the per-series lookup across calls`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200).setBody(detailBody))

            plugin.fetchMatch(ExternalMetadataSeriesRef(id = "116", providerId = "kavita", name = "Some Manga"))
            plugin.fetchMatch(ExternalMetadataSeriesRef(id = "116", providerId = "kavita", name = "Some Manga"))
            plugin.fetchMatch(ExternalMetadataSeriesRef(id = "116", providerId = "kavita", name = "Some Manga"))

            // Only one HTTP call — a 2nd real request would find no enqueued response and fail.
            assertEquals(1, server.requestCount)
        }

    // A 404 is a real answer ("not indexed under this id"), so it is memoized too — otherwise
    // every repeated open of an unindexed series would re-ask the route AND re-scan the listing.
    @Test
    fun `fetchMatch memoizes a 404 instead of re-asking the route`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(404))
            server.enqueue(MockResponse().setResponseCode(200).setBody("""[]"""))

            plugin.fetchMatch(ExternalMetadataSeriesRef(id = "1", providerId = "kavita", name = "Unmatched"))
            plugin.fetchMatch(ExternalMetadataSeriesRef(id = "1", providerId = "kavita", name = "Unmatched"))

            // One 404 + one listing, both memoized — not four requests.
            assertEquals(2, server.requestCount)
        }

    @Test
    fun `a per-series lookup and the listing are memoized under separate keys`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(200).setBody(detailBody))
            server.enqueue(
                MockResponse().setResponseCode(200).setBody(
                    """[{"title":"Some Manga","status":"ongoing","has_errors":false,"kavita_id":116}]""",
                ),
            )

            plugin.fetchMatch(ExternalMetadataSeriesRef(id = "116", providerId = "kavita", name = "Some Manga"))
            plugin.fetchMatches(listOf(ExternalMetadataSeriesRef(id = "116", providerId = "kavita", name = "Some Manga")))

            // The per-series route does not satisfy a listing call, nor the other way round.
            assertEquals(2, server.requestCount)
        }
}
