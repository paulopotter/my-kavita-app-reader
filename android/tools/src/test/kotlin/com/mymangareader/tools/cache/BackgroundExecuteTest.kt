package com.mymangareader.tools.cache

import com.mymangareader.cache.Cache
import com.mymangareader.core.database.CacheDao
import com.mymangareader.core.database.CacheEntity
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

private data class FakeCacheKey(val key: String, val variant: String)

private class FakeCacheDao : CacheDao {
    val entities = mutableMapOf<FakeCacheKey, CacheEntity>()

    override suspend fun getByKey(key: String, variant: String): CacheEntity? = entities[FakeCacheKey(key, variant)]

    override suspend fun upsert(entity: CacheEntity) {
        entities[FakeCacheKey(entity.key, entity.variant)] = entity
    }

    override suspend fun touchLastAccessed(key: String, variant: String, lastAccessedAtEpochMs: Long) = Unit

    override suspend fun deleteByKey(key: String, variant: String) {
        entities.remove(FakeCacheKey(key, variant))
    }

    override suspend fun deleteByDomain(domain: String) {
        entities.values.filter { it.domain == domain }.forEach { entities.remove(FakeCacheKey(it.key, it.variant)) }
    }

    override suspend fun deleteByVariant(domain: String, variant: String) {
        entities.values.filter { it.domain == domain && it.variant == variant }.forEach { entities.remove(FakeCacheKey(it.key, it.variant)) }
    }

    override suspend fun getAllExpired(nowEpochMs: Long): List<CacheEntity> = entities.values.filter { it.expiresAtEpochMs <= nowEpochMs }

    override suspend fun getOlderThan(cutoffEpochMs: Long): List<CacheEntity> =
        entities.values.filter { it.cachedAtEpochMs < cutoffEpochMs && it.lastAccessedAtEpochMs < cutoffEpochMs }

    override suspend fun deleteExpired(entries: List<CacheEntity>) {
        entries.forEach { entities.remove(FakeCacheKey(it.key, it.variant)) }
    }
}

class BackgroundExecuteTest {

    @Test
    fun `launch executa fetchFn e nao grava nada no cache`() {
        val dao = FakeCacheDao()
        val cache = Cache(dao)
        val backgroundExecute = BackgroundExecute(cache)
        val calls = AtomicInteger(0)

        val job = backgroundExecute.launch { calls.incrementAndGet(); "fresh-value" }
        runBlocking { job.join() }

        assertEquals(1, calls.get())
        assertEquals(0, dao.entities.size)
    }

    @Test
    fun `launchWithStore executa fetchFn e grava o resultado no store indicado pelo mode do descriptor`() {
        val dao = FakeCacheDao()
        val cache = Cache(dao)
        val backgroundExecute = BackgroundExecute(cache)

        val descriptor = runBlocking {
            cache.persistent.put("c1", "old-value", domain = "chapter", variant = "full", ttlMs = 60_000L)
        }

        val job = backgroundExecute.launchWithStore(fetchFn = { "fresh-value" }, descriptor = descriptor)
        runBlocking { job.join() }

        val stored = runBlocking { cache.persistent.get("c1", "full") }
        assertEquals("fresh-value", stored?.value)
    }

    @Test
    fun `launchWithStore com descriptor MEMORY_KOTLIN grava no memoryKotlin, nao no persistent`() {
        val dao = FakeCacheDao()
        val cache = Cache(dao)
        val backgroundExecute = BackgroundExecute(cache)

        val descriptor = runBlocking {
            cache.memoryKotlin.put("c1", "old-value", domain = "chapter", ttlMs = 60_000L)
        }

        val job = backgroundExecute.launchWithStore(fetchFn = { "fresh-value" }, descriptor = descriptor)
        runBlocking { job.join() }

        assertEquals("fresh-value", runBlocking { cache.memoryKotlin.get("c1")?.value })
        assertNull(runBlocking { cache.persistent.get("c1") })
    }
}
