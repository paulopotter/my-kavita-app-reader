package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface ServerUrlDao {
    @Upsert
    suspend fun upsert(entity: ServerUrlEntity)

    @Delete
    suspend fun delete(entity: ServerUrlEntity)

    @Query("SELECT * FROM server_url WHERE groupId = :groupId ORDER BY priority ASC")
    fun observeByGroupId(groupId: String): Flow<List<ServerUrlEntity>>

    @Query("SELECT * FROM server_url WHERE groupId = :groupId ORDER BY priority ASC")
    suspend fun getByGroupId(groupId: String): List<ServerUrlEntity>

    @Query("SELECT * FROM server_url WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): ServerUrlEntity?

    @Query("DELETE FROM server_url WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM server_url WHERE groupId = :groupId")
    suspend fun deleteByGroupId(groupId: String)
}
