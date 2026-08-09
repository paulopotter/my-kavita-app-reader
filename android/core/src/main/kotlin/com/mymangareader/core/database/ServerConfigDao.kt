package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface ServerConfigDao {
    @Upsert
    suspend fun upsert(entity: ServerConfigEntity)

    @Delete
    suspend fun delete(entity: ServerConfigEntity)

    @Query("SELECT * FROM server_config ORDER BY priority ASC")
    fun observeAll(): Flow<List<ServerConfigEntity>>

    @Query("SELECT * FROM server_config ORDER BY priority ASC")
    suspend fun getAll(): List<ServerConfigEntity>

    @Query("DELETE FROM server_config WHERE id = :id")
    suspend fun deleteById(id: String)
}
