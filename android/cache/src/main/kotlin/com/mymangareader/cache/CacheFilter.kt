package com.mymangareader.cache

import com.mymangareader.core.database.CacheDao
import com.mymangareader.core.database.CacheEntity

// SQLite binds at most 999 host params per statement. Only `keys IN (...)` spends one per key, so
// a caller with more keys than this chunks the read itself — CacheFilter never truncates.
const val CACHE_FILTER_MAX_KEYS = 900

// A read filter for the `cache` table: whichever fields are set are AND-ed together (all null →
// every row). Used by CacheStore.patchAll's batch read so a caller decides how wide the
// pre-merge read is — exactly the keys it's about to write (keys = ...), or a whole domain, or a
// domain+variant slice. Lives in :cache (not :core) because it's :cache-level sugar over
// CacheDao.queryFiltered's primitive params.
data class CacheFilter(
    val keys: List<String>? = null,
    val domain: String? = null,
    val variant: String? = null,
) {
    init {
        require(keys == null || keys.size <= CACHE_FILTER_MAX_KEYS) {
            "CacheFilter.keys has ${keys!!.size} entries; SQLite caps host params near " +
                "$CACHE_FILTER_MAX_KEYS — chunk the read at the call site."
        }
    }
}

// A wide read is one query; when it throws because ONE row is too big to read, the slice is read
// again row by row and the unreadable rows are deleted (they are only a cache) so the others still
// come back and the slice heals instead of staying broken.
internal suspend fun CacheDao.query(filter: CacheFilter): List<CacheEntity> {
    val keys = filter.keys ?: emptyList()
    val hasKeys = if (filter.keys == null) 0 else 1
    return try {
        queryFiltered(keys = keys, hasKeys = hasKeys, domain = filter.domain, variant = filter.variant)
    } catch (e: Exception) {
        if (!e.isCacheRowTooBig()) throw e
        keyRefsFiltered(keys = keys, hasKeys = hasKeys, domain = filter.domain, variant = filter.variant)
            .mapNotNull { ref -> readOrDropOversized(ref.key, ref.variant) }
    }
}

// The row at (key, variant), or null when it is missing or too big to read — in which case it is
// deleted so it cannot break the next read either.
internal suspend fun CacheDao.readOrDropOversized(
    key: String,
    variant: String,
): CacheEntity? =
    try {
        getByKey(key, variant)
    } catch (e: Exception) {
        if (!e.isCacheRowTooBig()) throw e
        deleteByKey(key, variant)
        null
    }
