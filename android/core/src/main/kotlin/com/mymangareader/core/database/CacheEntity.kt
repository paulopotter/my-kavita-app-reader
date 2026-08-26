package com.mymangareader.core.database

import androidx.room.Entity

// The single generic table backing Cache (Kotlin, :cache module)'s PERSISTENT mode — value is an
// opaque, caller-serialized string (Cache itself never parses it). domain is likewise opaque to
// Cache — a caller-chosen label ("page"/"chapter"/"series"/...) that only exists to make
// invalidateByDomain possible without Cache understanding what's inside value.
//
// variant/key together identify one entry: variant names which parameter(s) a payload's shape
// depends on (e.g. "full", or "full:external" for more than one, colon-separated — never the
// values), while key carries the entity id plus that same parameter's value(s) in the same
// positional order (e.g. "c1:true", or "s1:true:false"). A domain with no such parameter (e.g.
// Page) uses variant = "" and key = the bare id. Primary key is (key, variant) together — key
// alone ("c1") is not unique once two variants of the same entity ("c1:true" vs "c1:false") can
// coexist.
@Entity(tableName = "cache", primaryKeys = ["key", "variant"])
data class CacheEntity(
    val key: String,
    val variant: String,
    val value: String,
    val domain: String,
    val cachedAtEpochMs: Long,
    // Stored explicitly (not just derived as expiresAtEpochMs - cachedAtEpochMs) so a caller
    // reading this entry back (e.g. to refresh a stale value in the background) can reuse the
    // exact TTL this entry was written with, without re-deriving it via subtraction.
    val ttlMs: Long,
    val expiresAtEpochMs: Long,
    // Refreshed to "now" every time get() finds this entry (a real hit, expired or not) — never
    // touched by put() beyond its initial value (same as cachedAtEpochMs at write time). Exists
    // only to support purgeOlderThan: an entry with a typo'd domain that's never read again keeps
    // this frozen at its write time, making it safely identifiable even if its TTL was never
    // meant to catch that case.
    val lastAccessedAtEpochMs: Long,
)
