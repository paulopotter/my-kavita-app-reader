package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface PreferenceDao {

    @Query("SELECT * FROM preferences WHERE `key` = :key AND variant = :variant")
    suspend fun getByKey(key: String, variant: String): PreferenceEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: PreferenceEntity)

    @Query("DELETE FROM preferences WHERE `key` = :key AND variant = :variant")
    suspend fun deleteByKey(key: String, variant: String)

    @Query("DELETE FROM preferences WHERE domain = :domain")
    suspend fun deleteByDomain(domain: String)
}
