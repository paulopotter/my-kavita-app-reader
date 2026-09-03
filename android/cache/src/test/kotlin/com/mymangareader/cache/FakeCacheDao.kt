package com.mymangareader.cache

import com.mymangareader.core.database.CacheDao
import com.mymangareader.core.database.CacheEntity

// In-memory stand-in for CacheDao — CacheDao's own SQL behavior is already covered by
// core's CacheDaoTest; PersistentHandle's own tests only need something that behaves like a
// Map<(key, variant), CacheEntity>.
internal class FakeCacheDao : CacheDao {
    private data class MapKey(val key: String, val variant: String)

    private val entities = mutableMapOf<MapKey, CacheEntity>()

    override suspend fun getByKey(key: String, variant: String): CacheEntity? = entities[MapKey(key, variant)]

    override suspend fun upsert(entity: CacheEntity) {
        entities[MapKey(entity.key, entity.variant)] = entity
    }

    override suspend fun queryFiltered(
        keys: List<String>,
        hasKeys: Int,
        domain: String?,
        variant: String?,
    ): List<CacheEntity> = entities.values.filter { e ->
        (hasKeys == 0 || e.key in keys) &&
            (domain == null || e.domain == domain) &&
            (variant == null || e.variant == variant)
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

    override suspend fun getAllExpired(nowEpochMs: Long): List<CacheEntity> =
        entities.values.filter { it.expiresAtEpochMs <= nowEpochMs }

    override suspend fun getOlderThan(cutoffEpochMs: Long): List<CacheEntity> =
        entities.values.filter { it.cachedAtEpochMs < cutoffEpochMs && it.lastAccessedAtEpochMs < cutoffEpochMs }

    override suspend fun deleteExpired(entries: List<CacheEntity>) {
        entries.forEach { entities.remove(MapKey(it.key, it.variant)) }
    }
}
