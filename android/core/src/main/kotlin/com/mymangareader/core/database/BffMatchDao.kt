package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction

@Dao
interface BffMatchDao {

    @Query("SELECT * FROM bff_match")
    suspend fun getAll(): List<BffMatchEntity>

    @Query("SELECT * FROM bff_match WHERE seriesId = :seriesId")
    suspend fun getBySeriesId(seriesId: String): BffMatchEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(matches: List<BffMatchEntity>)

    @Query("DELETE FROM bff_match")
    suspend fun deleteAll()

    @Transaction
    suspend fun replaceAll(matches: List<BffMatchEntity>) {
        deleteAll()
        insertAll(matches)
    }
}
