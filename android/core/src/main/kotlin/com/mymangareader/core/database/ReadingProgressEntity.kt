package com.mymangareader.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "reading_progress")
data class ReadingProgressEntity(
    @PrimaryKey val chapterId: String,
    val seriesId: String,
    val page: Int,
    val updatedAtLocalMs: Long,
)
