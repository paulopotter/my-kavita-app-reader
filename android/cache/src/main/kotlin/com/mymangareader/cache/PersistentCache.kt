package com.mymangareader.cache

import com.mymangareader.core.database.CacheDao
import com.mymangareader.core.database.CacheEntity

interface Persistent : CacheStore

// Room-backed — CacheDao/CacheEntity's single generic table (:core). Never opens `value` itself;
// it's whatever opaque string the caller serialized before calling put().
internal class PersistentHandle(private val cacheDao: CacheDao) : Persistent {

    override suspend fun get(key: String, variant: String): CacheEntry? {
        val entity = cacheDao.getByKey(key, variant) ?: return null
        cacheDao.touchLastAccessed(key, variant, System.currentTimeMillis())
        return CacheEntry(
            value = entity.value,
            cachedAtEpochMs = entity.cachedAtEpochMs,
            ttlMs = entity.ttlMs,
            isExpired = System.currentTimeMillis() >= entity.expiresAtEpochMs,
        )
    }

    override suspend fun put(key: String, value: String, domain: String, variant: String, ttlMs: Long): CacheDescriptor {
        val now = System.currentTimeMillis()
        val expiresAtEpochMs = now + ttlMs
        cacheDao.upsert(
            CacheEntity(
                key = key,
                variant = variant,
                value = value,
                domain = domain,
                cachedAtEpochMs = now,
                ttlMs = ttlMs,
                expiresAtEpochMs = expiresAtEpochMs,
                lastAccessedAtEpochMs = now,
            ),
        )
        return CacheDescriptor(
            key = key,
            variant = variant,
            domain = domain,
            mode = CacheMode.PERSISTENT,
            cachedAtEpochMs = now,
            expiresAtEpochMs = expiresAtEpochMs,
        )
    }

    override suspend fun invalidate(key: String, variant: String) = cacheDao.deleteByKey(key, variant)

    override suspend fun invalidateDomain(domain: String) = cacheDao.deleteByDomain(domain)

    override suspend fun invalidateVariant(domain: String, variant: String) = cacheDao.deleteByVariant(domain, variant)

    override suspend fun purgeExpired() {
        val expired = cacheDao.getAllExpired(System.currentTimeMillis())
        if (expired.isNotEmpty()) cacheDao.deleteExpired(expired)
    }

    override suspend fun purgeOlderThan(cutoffEpochMs: Long) {
        val old = cacheDao.getOlderThan(cutoffEpochMs)
        if (old.isNotEmpty()) cacheDao.deleteExpired(old)
    }
}
