package com.mymangareader.cache

// 15min, same value ActiveUrlSelector.CACHE_TTL_MS already uses (:tools) — kept as this module's
// own constant since Cache never depends on :tools.
internal const val DEFAULT_TTL_MS = 15 * 60 * 1000L

// value/cachedAtEpochMs/ttlMs are always returned even when isExpired is true — get() never
// deletes an expired entry itself (see CacheStore.purgeExpired). The caller decides whether a
// stale value is still useful (e.g. show it while a fresh fetch is in flight) or should be
// ignored outright. ttlMs is the exact value this entry was originally written with — lets a
// caller refreshing a stale entry reuse that same TTL instead of falling back to
// DEFAULT_TTL_MS.
data class CacheEntry(
    val value: String,
    val cachedAtEpochMs: Long,
    val ttlMs: Long,
    val isExpired: Boolean,
)

// Shared shape between Cache.persistent (Room-backed) and Cache.memoryKotlin (in-process Map) —
// both a "read/write a value by key, opaque to Cache itself" store, differing only in where the
// data physically lives. Persistent/MemoryKotlin each extend this so they can grow their own
// extra methods independently without forcing the other to also implement them.
//
// variant/key together identify one entry — same convention as CacheEntity (:core): variant names
// which parameter(s) a payload's shape depends on (e.g. "full", or "full:external" for more than
// one, colon-separated — never the values), key carries the entity id plus that same parameter's
// value(s) in the same positional order (e.g. "c1:true"). A caller with no such parameter (e.g.
// Page) omits variant entirely — it defaults to "".
interface CacheStore {
    // A hit (entry found, expired or not) refreshes the entry's lastAccessedAtEpochMs to now —
    // see purgeOlderThan below for why this matters. A miss touches nothing.
    suspend fun get(key: String, variant: String = ""): CacheEntry?

    // Returns the CacheDescriptor this write just produced — the same object a domain contract's
    // `cache` field carries forward (see CacheDescriptor's own doc). Never Unit: a caller building
    // a digest needs this to attach provenance without re-deriving it.
    suspend fun put(key: String, value: String, domain: String, variant: String = "", ttlMs: Long = DEFAULT_TTL_MS): CacheDescriptor

    suspend fun invalidate(key: String, variant: String = "")
    suspend fun invalidateDomain(domain: String)

    // Every entry for this domain+variant, across all keys — e.g. every cached chapter with
    // variant="full", regardless of chapterId. variant alone isn't scoped by domain here since
    // callers always know both (they're the ones who chose them for put()).
    suspend fun invalidateVariant(domain: String, variant: String)

    // Removes every entry whose TTL has already elapsed. Called in a batch (e.g. once at app
    // startup) — never invoked implicitly by get().
    suspend fun purgeExpired()

    // Removes every entry written before cutoffEpochMs AND never read since (its
    // lastAccessedAtEpochMs also predates cutoffEpochMs) — e.g. a typo'd domain no caller ever
    // reads again stays safely identifiable this way, even though its TTL was never meant to
    // catch that case. An entry written long ago but read recently is never removed here,
    // regardless of how stale cachedAtEpochMs is. Called manually (e.g. a debug/settings screen),
    // never implicitly.
    suspend fun purgeOlderThan(cutoffEpochMs: Long)
}
