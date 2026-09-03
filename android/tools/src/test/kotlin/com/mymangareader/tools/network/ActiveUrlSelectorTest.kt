package com.mymangareader.tools.network

import com.mymangareader.cache.Cache
import com.mymangareader.core.database.CacheDao
import com.mymangareader.core.database.CacheEntity
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.SocketPolicy
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

// In-memory CacheDao — just enough for a real Cache() to construct against; ActiveUrlSelector
// only ever exercises Cache.network, whose own behavior is already covered by :cache's own
// NetworkCacheTest.
private class FakeCacheDao : CacheDao {
    private data class MapKey(val key: String, val variant: String)

    private val entities = mutableMapOf<MapKey, CacheEntity>()

    override suspend fun getByKey(key: String, variant: String): CacheEntity? = entities[MapKey(key, variant)]
    override suspend fun upsert(entity: CacheEntity) { entities[MapKey(entity.key, entity.variant)] = entity }
    override suspend fun touchLastAccessed(key: String, variant: String, lastAccessedAtEpochMs: Long) = Unit
    override suspend fun deleteByKey(key: String, variant: String) { entities.remove(MapKey(key, variant)) }
    override suspend fun deleteByDomain(domain: String) {
        entities.values.filter { it.domain == domain }.forEach { entities.remove(MapKey(it.key, it.variant)) }
    }
    override suspend fun deleteByVariant(domain: String, variant: String) {
        entities.values.filter { it.domain == domain && it.variant == variant }.forEach { entities.remove(MapKey(it.key, it.variant)) }
    }
    override suspend fun getAllExpired(nowEpochMs: Long): List<CacheEntity> = entities.values.filter { it.expiresAtEpochMs <= nowEpochMs }
    override suspend fun getOlderThan(cutoffEpochMs: Long): List<CacheEntity> =
        entities.values.filter { it.cachedAtEpochMs < cutoffEpochMs && it.lastAccessedAtEpochMs < cutoffEpochMs }
    override suspend fun queryFiltered(keys: List<String>, hasKeys: Int, domain: String?, variant: String?): List<CacheEntity> =
        entities.values.filter { e -> (hasKeys == 0 || e.key in keys) && (domain == null || e.domain == domain) && (variant == null || e.variant == variant) }

    override suspend fun deleteExpired(entries: List<CacheEntity>) {
        entries.forEach { entities.remove(MapKey(it.key, it.variant)) }
    }
}

class ActiveUrlSelectorTest {

    private lateinit var server1: MockWebServer
    private lateinit var server2: MockWebServer
    private lateinit var selector: ActiveUrlSelector

    @Before
    fun setUp() {
        server1 = MockWebServer()
        server2 = MockWebServer()
        server1.start()
        server2.start()
        selector = ActiveUrlSelector(OkHttpClient(), Cache(FakeCacheDao()))
    }

    @After
    fun tearDown() {
        runCatching { server1.shutdown() }
        runCatching { server2.shutdown() }
    }

    private fun candidate(
        server: MockWebServer,
        id: String = "s",
        priority: Int = 0,
        path: String = "/health",
        timeoutMs: Int = 2000,
    ) = UrlCandidate(
        id = id,
        url = server.url("/").toString().trimEnd('/'),
        timeoutMs = timeoutMs,
        priority = priority,
        healthCheckPath = path,
    )

    @Test
    fun `returns the single healthy candidate`() = runTest {
        server1.enqueue(MockResponse().setResponseCode(200))

        val result = selector.getActiveUrl(listOf(candidate(server1)))

        assertTrue(result.isSuccess)
        assertTrue(result.getOrThrow().startsWith("http://"))
    }

    @Test
    fun `returns failure when no candidate responds`() = runTest {
        server1.shutdown()
        server2.shutdown()

        val result = selector.getActiveUrl(
            listOf(
                candidate(server1, "a", timeoutMs = 200),
                candidate(server2, "b", timeoutMs = 200),
            )
        )

        assertTrue(result.isFailure)
    }

    @Test
    fun `returns failure on empty candidate list`() = runTest {
        val result = selector.getActiveUrl(emptyList())

        assertTrue(result.isFailure)
    }

    @Test
    fun `cached result is returned without new health check`() = runTest {
        server1.enqueue(MockResponse().setResponseCode(200))

        selector.getActiveUrl(listOf(candidate(server1)))
        server1.shutdown()

        val cached = selector.getActiveUrl(listOf(candidate(server1)))
        assertTrue(cached.isSuccess)
    }

    @Test
    fun `invalidateAndReselect re-probes after cache is cleared`() = runTest {
        server1.enqueue(MockResponse().setResponseCode(200))
        server2.enqueue(MockResponse().setResponseCode(200))

        selector.getActiveUrl(listOf(candidate(server1, "a", priority = 0)))
        server1.shutdown()

        val second = selector.invalidateAndReselect(
            listOf(
                candidate(server2, "b", priority = 0),
            )
        )
        assertTrue(second.isSuccess)
    }

    @Test
    fun `getLastKnownUrl is null before any probe`() {
        assertEquals(null, selector.getLastKnownUrl())
    }

    @Test
    fun `getLastKnownUrl returns cached url after successful probe`() = runTest {
        server1.enqueue(MockResponse().setResponseCode(200))

        selector.getActiveUrl(listOf(candidate(server1)))

        assertTrue(selector.getLastKnownUrl()?.startsWith("http://") == true)
    }

    // Simulates the real-world hang this watchdog exists for: a socket that accepts the
    // connection but never sends a response — plain `withTimeoutOrNull` around a blocking
    // execute() doesn't reliably fire in that case (see the class-level comment), so this
    // verifies the Timer-based watchdog actually cancels the stuck call and the selector still
    // resolves (with failure, since this is the only candidate and it never answers), instead of
    // hanging.
    @Test
    fun `a candidate that never responds is treated as unhealthy, not left hanging`() = runTest {
        server1.enqueue(MockResponse().setSocketPolicy(SocketPolicy.NO_RESPONSE))

        val result = selector.getActiveUrl(listOf(candidate(server1, timeoutMs = 200)))

        assertTrue(result.isFailure)
    }

    @Test
    fun `a slower never-responding candidate does not block a healthy one from winning`() = runTest {
        server1.enqueue(MockResponse().setSocketPolicy(SocketPolicy.NO_RESPONSE))
        server2.enqueue(MockResponse().setResponseCode(200))

        val result = selector.getActiveUrl(
            listOf(
                candidate(server1, "a", priority = 0, timeoutMs = 200),
                candidate(server2, "b", priority = 1, timeoutMs = 2000),
            )
        )

        assertTrue(result.isSuccess)
    }
}
