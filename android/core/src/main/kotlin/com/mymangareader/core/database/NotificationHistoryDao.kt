package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface NotificationHistoryDao {
    // A new batch for the same series (same deterministic id) replaces the previous row instead
    // of stacking — see NotificationHistoryEntity's own doc.
    @Upsert
    suspend fun insertOrReplace(entity: NotificationHistoryEntity)

    @Query("SELECT * FROM notification_history ORDER BY detectedAtMs DESC")
    fun observeAll(): Flow<List<NotificationHistoryEntity>>

    @Query("SELECT * FROM notification_history ORDER BY detectedAtMs DESC")
    suspend fun listAll(): List<NotificationHistoryEntity>

    @Query("SELECT * FROM notification_history WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): NotificationHistoryEntity?

    @Query("UPDATE notification_history SET read = 1 WHERE id = :id")
    suspend fun markRead(id: String)

    @Query("UPDATE notification_history SET read = 1")
    suspend fun markAllRead()

    @Query("DELETE FROM notification_history WHERE id = :id")
    suspend fun delete(id: String)

    // Strictly older than epochMs — a row exactly at the boundary is kept.
    @Query("DELETE FROM notification_history WHERE createdAtLocalMs < :epochMs")
    suspend fun deleteOlderThan(epochMs: Long)

    @Query("SELECT COUNT(*) FROM notification_history WHERE read = 0")
    suspend fun countUnread(): Int
}
