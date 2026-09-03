package com.mymangareader.cache


// 15min, same value ActiveUrlSelector.CACHE_TTL_MS already uses (:tools) — kept as this module's
// own constant since Cache never depends on :tools.
internal const val DEFAULT_TTL_MS = 15 * 60 * 1000L

// One entry to patch in a patchAll batch: same trio put()/patch() take, minus the domain/variant
// (those are batch-wide — every item in one patchAll call shares them).
data class PatchItem(val key: String, val value: String, val ttlMs: Long = DEFAULT_TTL_MS)

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

    // Like put(), but keeps the fields already stored under (key, variant) that `value` doesn't
    // mention. Both sides are treated as MAYBE-JSON: if the stored value and `value` both parse as
    // JSON objects, the stored entry is merged with `value` — top-level keys from `value` win,
    // keys only in the stored value are preserved. `deep` controls only how a key present on both
    // sides is combined: false (default) replaces it wholesale; true recurses into objects (see
    // jsonMerge). Either side not a JSON object, or no existing entry → patch behaves exactly like
    // put(value). Always rewrites cachedAtEpochMs/expiresAtEpochMs and returns the fresh
    // descriptor. Lets a caller refresh the "list" fields of a per-series digest without a manual
    // get()+copy()+put() and without clobbering the richer chapters/metadata a prior single-series
    // fetch wrote. A default impl (get → merge → put) covers both backends; an implementation can
    // override for a single-round-trip version.
    suspend fun patch(key: String, value: String, domain: String, variant: String = "", ttlMs: Long = DEFAULT_TTL_MS, deep: Boolean = false): CacheDescriptor {
        val existing = get(key, variant)?.value
        val toWrite = if (existing != null) jsonMerge(existing, value, deep) else value
        return put(key, toWrite, domain, variant, ttlMs)
    }

    // Batch patch: merge-and-write [items] under one (domain, variant), reading the existing
    // entries ONCE and writing them ONCE. `readFilter` picks how wide that pre-merge read is;
    // null → read exactly the keys in [items] for this variant (chunked past
    // CACHE_FILTER_MAX_KEYS). A caller with a whole-domain refresh (e.g. buildSerialsDigest, ~all
    // series at once) passes CacheFilter(domain = ..., variant = ...) to skip the IN-list and its
    // limit entirely. Merge semantics per item are exactly patch()'s (shallow unless deep). Order
    // of the returned descriptors matches [items].
    //
    // The default here is the slow path — one patch() per item — so a store that can't batch
    // still works. PersistentHandle overrides it with the real single-read / single-transaction
    // version; MemoryKotlinHandle overrides it with a lock-once loop.
    suspend fun patchAll(
        items: List<PatchItem>,
        domain: String,
        variant: String = "",
        deep: Boolean = false,
        readFilter: CacheFilter? = null,
    ): List<CacheDescriptor> = items.map { patch(it.key, it.value, domain, variant, it.ttlMs, deep) }

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
