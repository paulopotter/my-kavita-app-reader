package com.mymangareader.cache

import com.mymangareader.core.database.CacheDao
import com.mymangareader.core.database.CacheEntity

// In-memory stand-in for CacheDao — CacheDao's own SQL behavior is already covered by
// core's CacheDaoTest; PersistentHandle's own tests only need something that behaves like a
// Map<key, CacheEntity>.
internal class FakeCacheDao : CacheDao {
    private val entities = mutableMapOf<String, CacheEntity>()

    override suspend fun getByKey(key: String): CacheEntity? = entities[key]

    override suspend fun upsert(entity: CacheEntity) {
        entities[entity.key] = entity
    }

    override suspend fun deleteByKey(key: String) {
        entities.remove(key)
    }

    override suspend fun deleteByDomain(domain: String) {
        entities.values.filter { it.domain == domain }.forEach { entities.remove(it.key) }
    }

    override suspend fun getAllExpired(nowEpochMs: Long): List<CacheEntity> =
        entities.values.filter { it.expiresAtEpochMs <= nowEpochMs }

    override suspend fun deleteByKeys(keys: List<String>) {
        keys.forEach { entities.remove(it) }
    }
}
