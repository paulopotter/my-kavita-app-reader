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

internal suspend fun CacheDao.query(filter: CacheFilter): List<CacheEntity> = queryFiltered(
    keys = filter.keys ?: emptyList(),
    hasKeys = if (filter.keys == null) 0 else 1,
    domain = filter.domain,
    variant = filter.variant,
)
