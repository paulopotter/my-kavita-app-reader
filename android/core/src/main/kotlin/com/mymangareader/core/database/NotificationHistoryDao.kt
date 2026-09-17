package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface NotificationHistoryDao {
    // Always a new row — never collapses/overwrites an existing one for the same serial. See
    // NotificationHistoryEntity's own doc: one row per resolved event, always.
    @Insert
    suspend fun insert(entity: NotificationHistoryEntity)

    @Query("SELECT * FROM notification_history ORDER BY detectedAtMs DESC")
    fun observeAll(): Flow<List<NotificationHistoryEntity>>

    @Query("SELECT * FROM notification_history ORDER BY detectedAtMs DESC")
    suspend fun listAll(): List<NotificationHistoryEntity>

    @Query("SELECT * FROM notification_history WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): NotificationHistoryEntity?

    @Query("UPDATE notification_history SET read = 1 WHERE id = :id")
    suspend fun markRead(id: String)

    @Query("UPDATE notification_history SET read = 0 WHERE id = :id")
    suspend fun markUnread(id: String)

    // Correlation-based marking: the caller knows WHAT was consumed (a serial, a chapter), never
    // which row announced it — so the match happens here, in SQL, instead of listing every row
    // back to the caller just to filter it. Both only ever touch still-unread rows.

    // One chapter's own row(s). Never touches other chapters of the same serial: a batch of N
    // arrives as N granular rows (NotificationHistoryEntity's own doc), and each one waits for
    // its own chapter to actually be read.
    @Query("UPDATE notification_history SET read = 1 WHERE seriesId = :seriesId AND chapterId = :chapterId AND read = 0")
    suspend fun markReadByChapter(
        seriesId: String,
        chapterId: String,
    )

    // The serial's chapter-less rows — a "new serial" notification, or one whose publisher event
    // identified no chapter at all. Opening the serial IS consuming those. Rows that DO name a
    // chapter are deliberately left alone (see markReadByChapter).
    @Query("UPDATE notification_history SET read = 1 WHERE seriesId = :seriesId AND chapterId IS NULL AND read = 0")
    suspend fun markSerialRead(seriesId: String)

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
