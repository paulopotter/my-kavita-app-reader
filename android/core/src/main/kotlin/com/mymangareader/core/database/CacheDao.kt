package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface CacheDao {

    @Query("SELECT * FROM cache WHERE `key` = :key")
    suspend fun getByKey(key: String): CacheEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: CacheEntity)

    @Query("DELETE FROM cache WHERE `key` = :key")
    suspend fun deleteByKey(key: String)

    @Query("DELETE FROM cache WHERE domain = :domain")
    suspend fun deleteByDomain(domain: String)

    @Query("SELECT * FROM cache WHERE expiresAtEpochMs <= :nowEpochMs")
    suspend fun getAllExpired(nowEpochMs: Long): List<CacheEntity>

    @Query("DELETE FROM cache WHERE `key` IN (:keys)")
    suspend fun deleteByKeys(keys: List<String>)
}
