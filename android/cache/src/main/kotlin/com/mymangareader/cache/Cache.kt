package com.mymangareader.cache

import com.mymangareader.core.database.CacheDao
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Generic key-value cache — knows nothing about any domain (Page/Chapter/Series/...). Every
 * `domain`/`value` it stores is an opaque, caller-chosen string; Cache never parses or interprets
 * either.
 *
 * Three independent backends, chosen per call via [persistent]/[memoryKotlin]/[network] — never a
 * single `mode` parameter dispatching internally, same "own namespace per concern" shape
 * [com.mymangareader.server.Server] already uses for `groups`/`serials`/`serial(id)`:
 * - [persistent] — Room-backed, survives process/app restart.
 * - [memoryKotlin] — in-process Map, lives only as long as this Kotlin process does.
 * - [network] — not a value store at all; single-flight + TTL memoization for a suspend block,
 *   for protecting a network call from redundant concurrent execution.
 */
@Singleton
class Cache @Inject constructor(cacheDao: CacheDao) {
    val persistent: Persistent = PersistentHandle(cacheDao)
    val memoryKotlin: MemoryKotlin = MemoryKotlinHandle()
    val network: Network = NetworkHandle()

    // Resolves the right CacheStore for a CacheDescriptor.mode automatically — a caller holding a
    // descriptor (e.g. after a previous put()) never needs its own when(mode) branch to know
    // which of persistent/memoryKotlin to use next. network is deliberately not resolvable here —
    // it doesn't implement CacheStore (get/put), it has no "value written" concept to resolve.
    fun storeFor(mode: CacheMode): CacheStore = when (mode) {
        CacheMode.PERSISTENT -> persistent
        CacheMode.MEMORY_KOTLIN -> memoryKotlin
    }
}
