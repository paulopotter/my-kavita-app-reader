package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction

@Dao
interface CacheDao {

    @Query("SELECT * FROM cache WHERE `key` = :key AND variant = :variant")
    suspend fun getByKey(key: String, variant: String): CacheEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: CacheEntity)

    // Batch read for CacheStore.patchAll: one query for many rows instead of one getByKey per key.
    // Each arg is optional and AND-ed; `hasKeys` (0/1) disambiguates "no key filter" from "empty
    // key list" so an empty IN(...) never happens. The :cache module wraps this with a CacheFilter
    // object; :core keeps it primitive so nothing here needs to depend on that type.
    @Query(
        """
        SELECT * FROM cache
        WHERE (:hasKeys = 0 OR `key` IN (:keys))
          AND (:domain IS NULL OR domain = :domain)
          AND (:variant IS NULL OR variant = :variant)
        """,
    )
    suspend fun queryFiltered(keys: List<String>, hasKeys: Int, domain: String?, variant: String?): List<CacheEntity>

    // Batch upsert in ONE transaction (one commit / fsync, not one per row — that difference is
    // the whole point). Lenient: a row that somehow fails to upsert is skipped, the rest still go
    // in, and the count of successful writes is returned. A malformed CacheEntity can't really
    // occur (all fields non-null primitives/String), so this only matters if the DB itself is
    // broken — in which case the outer @Transaction rolls the whole thing back anyway.
    @Transaction
    suspend fun upsertAllLenient(entities: List<CacheEntity>): Int {
        var written = 0
        for (e in entities) {
            try {
                upsert(e)
                written++
            } catch (_: Exception) {
                // skip this row, keep going
            }
        }
        return written
    }

    @Query("UPDATE cache SET lastAccessedAtEpochMs = :lastAccessedAtEpochMs WHERE `key` = :key AND variant = :variant")
    suspend fun touchLastAccessed(key: String, variant: String, lastAccessedAtEpochMs: Long)

    @Query("DELETE FROM cache WHERE `key` = :key AND variant = :variant")
    suspend fun deleteByKey(key: String, variant: String)

    @Query("DELETE FROM cache WHERE domain = :domain")
    suspend fun deleteByDomain(domain: String)

    // Scoped by domain AND variant together — variant alone ("full") is not globally unique, two
    // unrelated domains could coincidentally use the same variant name.
    @Query("DELETE FROM cache WHERE domain = :domain AND variant = :variant")
    suspend fun deleteByVariant(domain: String, variant: String)

    @Query("SELECT * FROM cache WHERE expiresAtEpochMs <= :nowEpochMs")
    suspend fun getAllExpired(nowEpochMs: Long): List<CacheEntity>

    // Both conditions must hold — an entry written long ago but read recently (lastAccessedAtEpochMs
    // still fresh) is never returned here, regardless of how old cachedAtEpochMs is.
    @Query("SELECT * FROM cache WHERE cachedAtEpochMs < :cutoffEpochMs AND lastAccessedAtEpochMs < :cutoffEpochMs")
    suspend fun getOlderThan(cutoffEpochMs: Long): List<CacheEntity>

    @Transaction
    suspend fun deleteExpired(entries: List<CacheEntity>) {
        entries.forEach { deleteByKey(it.key, it.variant) }
    }
}
