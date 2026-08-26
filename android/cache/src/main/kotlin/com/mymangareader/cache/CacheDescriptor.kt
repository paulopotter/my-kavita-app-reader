package com.mymangareader.cache

import kotlinx.serialization.Serializable

// PERSISTENT/MEMORY_KOTLIN only — the two CacheStore backends that actually produce a
// CacheDescriptor via put(). MEMORY (RN-side in-memory cache) and NETWORK (single-flight/TTL
// wrapper around a suspend block, not a value store) never construct one — MEMORY never crosses
// the bridge into Kotlin at all, and NETWORK has no "value written" concept to describe.
@Serializable
enum class CacheMode { PERSISTENT, MEMORY_KOTLIN }

// What CacheStore.put() hands back after a successful write — the same object a domain contract's
// own `cache` field (e.g. :content-digest's PageDigest.Success.cache, once it stops being always
// null) carries forward. Created here, at Layer 2, exactly once per write — never re-assembled by
// a caller. No `value` field: this describes provenance/where-and-how, not the payload itself
// (that's CacheEntry's job, on the read side).
@Serializable
data class CacheDescriptor(
    val key: String,
    val variant: String,
    val domain: String,
    val mode: CacheMode,
    val cachedAtEpochMs: Long,
    val expiresAtEpochMs: Long,
)
