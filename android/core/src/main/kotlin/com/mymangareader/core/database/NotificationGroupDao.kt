package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface NotificationGroupDao {
    @Upsert
    suspend fun upsert(entity: NotificationGroupEntity)

    @Delete
    suspend fun delete(entity: NotificationGroupEntity)

    @Query("SELECT * FROM notification_group")
    fun observeAll(): Flow<List<NotificationGroupEntity>>

    @Query("SELECT * FROM notification_group")
    suspend fun getAll(): List<NotificationGroupEntity>

    @Query("SELECT * FROM notification_group WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): NotificationGroupEntity?

    @Query("DELETE FROM notification_group WHERE id = :id")
    suspend fun deleteById(id: String)
}
