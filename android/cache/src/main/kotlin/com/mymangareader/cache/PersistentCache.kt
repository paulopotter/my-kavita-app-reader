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

    // Batch version: one read (via CacheFilter) + one transactional write, instead of the default's
    // one get()+put() per item. `readFilter` null → read exactly the batch's keys for this
    // variant, chunked so no single IN-list exceeds SQLite's host-param cap.
    override suspend fun patchAll(
        items: List<PatchItem>,
        domain: String,
        variant: String,
        deep: Boolean,
        readFilter: CacheFilter?,
    ): List<CacheDescriptor> {
        if (items.isEmpty()) return emptyList()

        // 1. Read existing entries once, into a (key,variant) -> value map.
        val existingByKey = HashMap<String, String>(items.size * 2)
        if (readFilter != null) {
            cacheDao.query(readFilter).forEach { if (it.variant == variant) existingByKey[it.key] = it.value }
        } else {
            items.map { it.key }.distinct().chunked(CACHE_FILTER_MAX_KEYS).forEach { chunk ->
                cacheDao.query(CacheFilter(keys = chunk, variant = variant))
                    .forEach { existingByKey[it.key] = it.value }
            }
        }

        // 2. Merge each item in memory (no I/O), build the rows to write.
        val now = System.currentTimeMillis()
        val entities = ArrayList<CacheEntity>(items.size)
        val descriptors = ArrayList<CacheDescriptor>(items.size)
        for (item in items) {
            val existing = existingByKey[item.key]
            val toWrite = if (existing != null) jsonMerge(existing, item.value, deep) else item.value
            val expiresAtEpochMs = now + item.ttlMs
            entities.add(
                CacheEntity(
                    key = item.key,
                    variant = variant,
                    value = toWrite,
                    domain = domain,
                    cachedAtEpochMs = now,
                    ttlMs = item.ttlMs,
                    expiresAtEpochMs = expiresAtEpochMs,
                    lastAccessedAtEpochMs = now,
                ),
            )
            descriptors.add(
                CacheDescriptor(
                    key = item.key,
                    variant = variant,
                    domain = domain,
                    mode = CacheMode.PERSISTENT,
                    cachedAtEpochMs = now,
                    expiresAtEpochMs = expiresAtEpochMs,
                ),
            )
        }

        // 3. One transactional, lenient write.
        cacheDao.upsertAllLenient(entities)
        return descriptors
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
