package com.mymangareader.cache

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

interface MemoryKotlin : CacheStore

// In-process Map, never persisted — lives and dies with the Kotlin process. Same CacheStore
// contract as Persistent (including "expired entries aren't removed by get()") so callers that
// don't care which backend they're using can treat both identically; suspend on every method here
// only to match that shared contract, not because any of this actually does I/O.
internal class MemoryKotlinHandle : MemoryKotlin {
    private data class MapKey(
        val key: String,
        val variant: String,
    )

    private data class Entry(
        val value: String,
        val domain: String,
        val cachedAtEpochMs: Long,
        val ttlMs: Long,
        val expiresAtEpochMs: Long,
        val lastAccessedAtEpochMs: Long,
    )

    private val mutex = Mutex()
    private val entries = mutableMapOf<MapKey, Entry>()

    override suspend fun get(
        key: String,
        variant: String,
    ): CacheEntry? =
        mutex.withLock {
            val mapKey = MapKey(key, variant)
            val entry = entries[mapKey] ?: return@withLock null
            entries[mapKey] = entry.copy(lastAccessedAtEpochMs = System.currentTimeMillis())
            CacheEntry(
                value = entry.value,
                cachedAtEpochMs = entry.cachedAtEpochMs,
                ttlMs = entry.ttlMs,
                isExpired = System.currentTimeMillis() >= entry.expiresAtEpochMs,
            )
        }

    override suspend fun put(
        key: String,
        value: String,
        domain: String,
        variant: String,
        ttlMs: Long,
    ): CacheDescriptor {
        val now = System.currentTimeMillis()
        val expiresAtEpochMs = now + ttlMs
        mutex.withLock {
            entries[MapKey(key, variant)] =
                Entry(
                    value = value,
                    domain = domain,
                    cachedAtEpochMs = now,
                    ttlMs = ttlMs,
                    expiresAtEpochMs = expiresAtEpochMs,
                    lastAccessedAtEpochMs = now,
                )
        }
        return CacheDescriptor(
            key = key,
            variant = variant,
            domain = domain,
            mode = CacheMode.MEMORY_KOTLIN,
            cachedAtEpochMs = now,
            expiresAtEpochMs = expiresAtEpochMs,
        )
    }

    override suspend fun invalidate(
        key: String,
        variant: String,
    ): Unit =
        mutex.withLock {
            entries.remove(MapKey(key, variant))
            Unit
        }

    override suspend fun invalidateDomain(domain: String) =
        mutex.withLock {
            entries.keys.filter { entries[it]?.domain == domain }.forEach { entries.remove(it) }
        }

    override suspend fun invalidateVariant(
        domain: String,
        variant: String,
    ) = mutex.withLock {
        entries.keys.filter { it.variant == variant && entries[it]?.domain == domain }.forEach { entries.remove(it) }
    }

    override suspend fun purgeExpired() =
        mutex.withLock {
            val now = System.currentTimeMillis()
            entries.keys.filter { (entries[it]?.expiresAtEpochMs ?: Long.MAX_VALUE) <= now }.forEach { entries.remove(it) }
        }

    override suspend fun purgeOlderThan(cutoffEpochMs: Long) =
        mutex.withLock {
            entries.keys
                .filter { key ->
                    val entry = entries[key] ?: return@filter false
                    entry.cachedAtEpochMs < cutoffEpochMs && entry.lastAccessedAtEpochMs < cutoffEpochMs
                }.forEach { entries.remove(it) }
        }
}
