package com.mymangareader.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

// One row per series (never per chapter — a batch of N new chapters for the same series
// collapses into one row, replacing the previous one on re-insert). id is a deterministic hash of
// seriesId (Task 005's dedup key), same value used as the native Android notification's id, so
// the tray and this history never disagree about "is there a pending notification for this
// series". chapterIdsJson/chapterNumbersJson follow the same "list as JSON column" convention
// already used by series_detail_cache.genresJson/tagsJson — null when the payload didn't carry
// them (see README's payload contract).
@Entity(tableName = "notification_history")
data class NotificationHistoryEntity(
    @PrimaryKey val id: String,
    val seriesId: String,
    val seriesName: String,
    val chapterIdsJson: String?,
    val chapterNumbersJson: String?,
    val detectedAtMs: Long,
    val read: Boolean,
    val createdAtLocalMs: Long,
)
