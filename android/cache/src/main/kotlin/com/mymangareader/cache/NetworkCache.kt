package com.mymangareader.cache

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

// Different shape from CacheStore on purpose — this isn't "read/write a value by key", it's
// "run this block at most once per key within ttlMs, and make concurrent callers share the same
// in-flight execution instead of firing their own redundant call." Generalizes the pattern
// M3Plugin.fetchAllManga already hand-rolls (Mutex + memoized result with a TTL window) and the
// race ActiveUrlSelector.getActiveUrl has today (no lock at all — concurrent callers each run a
// full health-check round when the TTL expires). Neither of those two call sites is migrated to
// use this yet — that's a separate, later change.
interface Network {
    suspend fun <T> run(key: String, ttlMs: Long = DEFAULT_TTL_MS, block: suspend () -> T): T
}

internal class NetworkHandle : Network {
    private data class Entry(val value: Any?, val cachedAtEpochMs: Long, val ttlMs: Long)

    // One Mutex per key, not a single global Mutex — two different keys must never block each
    // other. mapMutex only protects mutexesByKey itself (getOrPut is not atomic on a plain Map
    // under concurrent access), never held while running the caller's block.
    private val mapMutex = Mutex()
    private val mutexesByKey = mutableMapOf<String, Mutex>()
    private val entries = mutableMapOf<String, Entry>()

    override suspend fun <T> run(key: String, ttlMs: Long, block: suspend () -> T): T {
        val keyMutex = mapMutex.withLock { mutexesByKey.getOrPut(key) { Mutex() } }
        return keyMutex.withLock {
            val cached = entries[key]
            val stillFresh = cached != null && System.currentTimeMillis() - cached.cachedAtEpochMs < cached.ttlMs
            if (stillFresh) {
                @Suppress("UNCHECKED_CAST")
                return@withLock cached!!.value as T
            }
            val fresh = block()
            entries[key] = Entry(value = fresh, cachedAtEpochMs = System.currentTimeMillis(), ttlMs = ttlMs)
            fresh
        }
    }
}
