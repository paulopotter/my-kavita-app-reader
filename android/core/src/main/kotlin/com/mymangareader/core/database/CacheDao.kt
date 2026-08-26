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
