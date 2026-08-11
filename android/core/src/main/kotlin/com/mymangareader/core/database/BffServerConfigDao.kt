package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface BffServerConfigDao {

    @Query("SELECT * FROM bff_server_config ORDER BY priority ASC")
    suspend fun getAll(): List<BffServerConfigEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: BffServerConfigEntity)

    @Query("DELETE FROM bff_server_config WHERE id = :id")
    suspend fun deleteById(id: String)
}
