package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface NotificationUrlDao {
    @Upsert
    suspend fun upsert(entity: NotificationUrlEntity)

    @Delete
    suspend fun delete(entity: NotificationUrlEntity)

    @Query("SELECT * FROM notification_url WHERE groupId = :groupId ORDER BY priority ASC")
    fun observeByGroupId(groupId: String): Flow<List<NotificationUrlEntity>>

    @Query("SELECT * FROM notification_url WHERE groupId = :groupId ORDER BY priority ASC")
    suspend fun getByGroupId(groupId: String): List<NotificationUrlEntity>

    @Query("SELECT * FROM notification_url WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): NotificationUrlEntity?

    @Query("DELETE FROM notification_url WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM notification_url WHERE groupId = :groupId")
    suspend fun deleteByGroupId(groupId: String)
}
