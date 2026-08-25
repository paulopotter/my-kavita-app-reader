package com.mymangareader.cache

// 15min, same value ActiveUrlSelector.CACHE_TTL_MS already uses (:tools) — kept as this module's
// own constant since Cache never depends on :tools.
internal const val DEFAULT_TTL_MS = 15 * 60 * 1000L

// value/cachedAtEpochMs are always returned even when isExpired is true — get() never deletes an
// expired entry itself (see CacheStore.purgeExpired). The caller decides whether a stale value is
// still useful (e.g. show it while a fresh fetch is in flight) or should be ignored outright.
data class CacheEntry(
    val value: String,
    val cachedAtEpochMs: Long,
    val isExpired: Boolean,
)

// Shared shape between Cache.persistent (Room-backed) and Cache.memoryKotlin (in-process Map) —
// both a "read/write a value by key, opaque to Cache itself" store, differing only in where the
// data physically lives. Persistent/MemoryKotlin each extend this so they can grow their own
// extra methods independently without forcing the other to also implement them.
interface CacheStore {
    suspend fun get(key: String): CacheEntry?
    suspend fun put(key: String, value: String, domain: String, ttlMs: Long = DEFAULT_TTL_MS)
    suspend fun invalidate(key: String)
    suspend fun invalidateDomain(domain: String)

    // Removes every entry whose TTL has already elapsed. Called in a batch (e.g. once at app
    // startup) — never invoked implicitly by get().
    suspend fun purgeExpired()
}
