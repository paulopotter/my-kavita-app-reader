package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface ServerGroupDao {
    @Upsert
    suspend fun upsert(entity: ServerGroupEntity)

    @Delete
    suspend fun delete(entity: ServerGroupEntity)

    @Query("SELECT * FROM server_group")
    fun observeAll(): Flow<List<ServerGroupEntity>>

    @Query("SELECT * FROM server_group")
    suspend fun getAll(): List<ServerGroupEntity>

    @Query("SELECT * FROM server_group WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): ServerGroupEntity?

    @Query("DELETE FROM server_group WHERE id = :id")
    suspend fun deleteById(id: String)
}
