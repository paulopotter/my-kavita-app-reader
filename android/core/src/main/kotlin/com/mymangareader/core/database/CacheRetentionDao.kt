package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Transaction

// One row of the generic `cache` table, WITHOUT its (potentially large) value: just enough to decide
// whether it is still worth keeping. [seriesIdHint]/[urlHint] are short snippets cut out of the JSON
// value by SQL — the text right after `"seriesId":"` and, for page rows, right after `"url":"` —
// so the sweep never loads a chapter digest's full page list into memory. Both are raw tails (they
// run past the closing quote); the caller trims them.
data class CacheRetentionRow(
    val key: String,
    val variant: String,
    val domain: String,
    val lastAccessedAtEpochMs: Long,
    val seriesIdHint: String?,
    val urlHint: String?,
)

// Separate from CacheDao on purpose: it is app-specific (it knows the digests' field names) while
// CacheDao stays a generic key/variant store, and adding a method there would force every test fake
// of CacheDao to implement it. No schema change — only a new query over the existing table.
@Dao
interface CacheRetentionDao {
    @Query(
        """
        SELECT `key`, variant, domain, lastAccessedAtEpochMs,
          CASE WHEN instr(value, '"seriesId":"') > 0
               THEN substr(value, instr(value, '"seriesId":"') + 12, 40) END AS seriesIdHint,
          CASE WHEN domain = 'page' AND instr(value, '"url":"') > 0
               THEN substr(value, instr(value, '"url":"') + 7, 1500) END AS urlHint
        FROM cache
        WHERE lastAccessedAtEpochMs < :cutoffEpochMs
        """,
    )
    suspend fun rowsLastAccessedBefore(cutoffEpochMs: Long): List<CacheRetentionRow>

    @Query("DELETE FROM cache WHERE `key` = :key AND variant = :variant")
    suspend fun delete(
        key: String,
        variant: String,
    )

    // One transaction (one commit) for the whole batch, not one per row.
    @Transaction
    suspend fun deleteAll(rows: List<CacheRetentionRow>) {
        for (row in rows) delete(row.key, row.variant)
    }
}
