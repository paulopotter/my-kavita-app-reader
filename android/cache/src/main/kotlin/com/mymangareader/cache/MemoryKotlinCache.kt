package com.mymangareader.cache

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

interface MemoryKotlin : CacheStore

// In-process Map, never persisted — lives and dies with the Kotlin process. Same CacheStore
// contract as Persistent (including "expired entries aren't removed by get()") so callers that
// don't care which backend they're using can treat both identically; suspend on every method here
// only to match that shared contract, not because any of this actually does I/O.
internal class MemoryKotlinHandle : MemoryKotlin {
    private data class Entry(val value: String, val domain: String, val cachedAtEpochMs: Long, val expiresAtEpochMs: Long)

    private val mutex = Mutex()
    private val entries = mutableMapOf<String, Entry>()

    override suspend fun get(key: String): CacheEntry? = mutex.withLock {
        val entry = entries[key] ?: return@withLock null
        CacheEntry(
            value = entry.value,
            cachedAtEpochMs = entry.cachedAtEpochMs,
            isExpired = System.currentTimeMillis() >= entry.expiresAtEpochMs,
        )
    }

    override suspend fun put(key: String, value: String, domain: String, ttlMs: Long) {
        val now = System.currentTimeMillis()
        mutex.withLock {
            entries[key] = Entry(value = value, domain = domain, cachedAtEpochMs = now, expiresAtEpochMs = now + ttlMs)
        }
    }

    override suspend fun invalidate(key: String): Unit = mutex.withLock { entries.remove(key); Unit }

    override suspend fun invalidateDomain(domain: String) = mutex.withLock {
        entries.keys.filter { entries[it]?.domain == domain }.forEach { entries.remove(it) }
    }

    override suspend fun purgeExpired() = mutex.withLock {
        val now = System.currentTimeMillis()
        entries.keys.filter { (entries[it]?.expiresAtEpochMs ?: Long.MAX_VALUE) <= now }.forEach { entries.remove(it) }
    }
}
