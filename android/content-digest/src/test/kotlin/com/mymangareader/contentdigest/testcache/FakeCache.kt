package com.mymangareader.contentdigest.testcache

import com.mymangareader.cache.Cache
import com.mymangareader.core.database.CacheDao
import com.mymangareader.core.database.CacheEntity

// In-memory CacheDao — same shape as :cache's own FakeCacheDao (internal to that module, not
// reusable from here), just for content-digest's own tests to build a real Cache() against
// without touching Room/Robolectric.
private class InMemoryCacheDao : CacheDao {
    private data class MapKey(val key: String, val variant: String)

    private val entities = mutableMapOf<MapKey, CacheEntity>()

    override suspend fun getByKey(key: String, variant: String): CacheEntity? = entities[MapKey(key, variant)]

    override suspend fun upsert(entity: CacheEntity) {
        entities[MapKey(entity.key, entity.variant)] = entity
    }

    override suspend fun touchLastAccessed(key: String, variant: String, lastAccessedAtEpochMs: Long) {
        val mapKey = MapKey(key, variant)
        entities[mapKey]?.let { entities[mapKey] = it.copy(lastAccessedAtEpochMs = lastAccessedAtEpochMs) }
    }

    override suspend fun deleteByKey(key: String, variant: String) {
        entities.remove(MapKey(key, variant))
    }

    override suspend fun deleteByDomain(domain: String) {
        entities.values.filter { it.domain == domain }.forEach { entities.remove(MapKey(it.key, it.variant)) }
    }

    override suspend fun deleteByVariant(domain: String, variant: String) {
        entities.values.filter { it.domain == domain && it.variant == variant }.forEach { entities.remove(MapKey(it.key, it.variant)) }
    }

    override suspend fun getAllExpired(nowEpochMs: Long): List<CacheEntity> = entities.values.filter { it.expiresAtEpochMs <= nowEpochMs }

    override suspend fun getOlderThan(cutoffEpochMs: Long): List<CacheEntity> =
        entities.values.filter { it.cachedAtEpochMs < cutoffEpochMs && it.lastAccessedAtEpochMs < cutoffEpochMs }

    override suspend fun deleteExpired(entries: List<CacheEntity>) {
        entries.forEach { entities.remove(MapKey(it.key, it.variant)) }
    }
}

// A real Cache() backed by an in-memory CacheDao — every digest builder test that doesn't care
// about caching behavior itself just needs *a* Cache instance to satisfy the required parameter;
// tests that DO care about cache behavior (hit/miss/stale) construct their own via this same
// helper and inspect it directly.
fun fakeCache(): Cache = Cache(InMemoryCacheDao())
