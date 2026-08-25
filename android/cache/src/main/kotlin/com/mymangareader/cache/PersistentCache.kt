package com.mymangareader.cache

import com.mymangareader.core.database.CacheDao
import com.mymangareader.core.database.CacheEntity

interface Persistent : CacheStore

// Room-backed — CacheDao/CacheEntity's single generic table (:core). Never opens `value` itself;
// it's whatever opaque string the caller serialized before calling put().
internal class PersistentHandle(private val cacheDao: CacheDao) : Persistent {

    override suspend fun get(key: String): CacheEntry? {
        val entity = cacheDao.getByKey(key) ?: return null
        return CacheEntry(
            value = entity.value,
            cachedAtEpochMs = entity.cachedAtEpochMs,
            isExpired = System.currentTimeMillis() >= entity.expiresAtEpochMs,
        )
    }

    override suspend fun put(key: String, value: String, domain: String, ttlMs: Long) {
        val now = System.currentTimeMillis()
        cacheDao.upsert(
            CacheEntity(
                key = key,
                value = value,
                domain = domain,
                cachedAtEpochMs = now,
                expiresAtEpochMs = now + ttlMs,
            ),
        )
    }

    override suspend fun invalidate(key: String) = cacheDao.deleteByKey(key)

    override suspend fun invalidateDomain(domain: String) = cacheDao.deleteByDomain(domain)

    override suspend fun purgeExpired() {
        val expired = cacheDao.getAllExpired(System.currentTimeMillis())
        if (expired.isNotEmpty()) cacheDao.deleteByKeys(expired.map { it.key })
    }
}
