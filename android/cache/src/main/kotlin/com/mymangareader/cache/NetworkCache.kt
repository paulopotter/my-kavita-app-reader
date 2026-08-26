package com.mymangareader.cache

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

// Different shape from CacheStore's get/put on purpose — run() isn't "read/write a value by
// key," it's "run this block at most once per key within ttlMs, and make concurrent callers
// share the same in-flight execution instead of firing their own redundant call." Generalizes
// the single-flight pattern M3Plugin.fetchAllManga used to hand-roll (now migrated) and the race
// ActiveUrlSelector.getActiveUrl still has (no lock at all — concurrent callers each run a full
// health-check round when the TTL expires; not migrated yet).
//
// invalidate/purgeExpired/purgeOlderThan mirror CacheStore's own methods of the same name — same
// paritY intent (any of the three backends should support "get rid of this," "clean up what
// expired," "clean up what's gone stale and unread") even though run()'s own shape (no
// value/domain/variant, just a key + a suspend block) differs from get/put.
interface Network {
    suspend fun <T> run(key: String, ttlMs: Long = DEFAULT_TTL_MS, block: suspend () -> T): T

    // Forces the next run() for this key to re-execute block, ignoring whatever was memoized —
    // e.g. ActiveUrlSelector.invalidateAndReselect's own "ignore the cache, pick fresh" need.
    suspend fun invalidate(key: String)

    // Removes every entry whose TTL has already elapsed. Called in a batch, never implicitly by
    // run() — same convention as CacheStore.purgeExpired.
    suspend fun purgeExpired()

    // Removes every entry memoized before cutoffEpochMs AND never read (via a run() hit) since —
    // same semantics as CacheStore.purgeOlderThan, applied to this in-memory map instead of Room.
    suspend fun purgeOlderThan(cutoffEpochMs: Long)
}

internal class NetworkHandle : Network {
    private data class Entry(val value: Any?, val cachedAtEpochMs: Long, val ttlMs: Long, val lastAccessedAtEpochMs: Long)

    // One Mutex per key, not a single global Mutex — two different keys must never block each
    // other. mapMutex only protects mutexesByKey/entries themselves (concurrent access to a plain
    // Map is not safe), never held while running the caller's block.
    private val mapMutex = Mutex()
    private val mutexesByKey = mutableMapOf<String, Mutex>()
    private val entries = mutableMapOf<String, Entry>()

    override suspend fun <T> run(key: String, ttlMs: Long, block: suspend () -> T): T {
        val keyMutex = mapMutex.withLock { mutexesByKey.getOrPut(key) { Mutex() } }
        return keyMutex.withLock {
            val cached = mapMutex.withLock { entries[key] }
            val stillFresh = cached != null && System.currentTimeMillis() - cached.cachedAtEpochMs < cached.ttlMs
            if (stillFresh) {
                mapMutex.withLock { entries[key] = cached!!.copy(lastAccessedAtEpochMs = System.currentTimeMillis()) }
                @Suppress("UNCHECKED_CAST")
                return@withLock cached!!.value as T
            }
            val fresh = block()
            val now = System.currentTimeMillis()
            mapMutex.withLock { entries[key] = Entry(value = fresh, cachedAtEpochMs = now, ttlMs = ttlMs, lastAccessedAtEpochMs = now) }
            fresh
        }
    }

    override suspend fun invalidate(key: String) {
        mapMutex.withLock { entries.remove(key) }
    }

    override suspend fun purgeExpired() {
        val now = System.currentTimeMillis()
        mapMutex.withLock {
            entries.keys.filter { (entries[it]?.let { e -> e.cachedAtEpochMs + e.ttlMs } ?: Long.MAX_VALUE) <= now }
                .forEach { entries.remove(it) }
        }
    }

    override suspend fun purgeOlderThan(cutoffEpochMs: Long) {
        mapMutex.withLock {
            entries.keys.filter { key ->
                val entry = entries[key] ?: return@filter false
                entry.cachedAtEpochMs < cutoffEpochMs && entry.lastAccessedAtEpochMs < cutoffEpochMs
            }.forEach { entries.remove(it) }
        }
    }
}
