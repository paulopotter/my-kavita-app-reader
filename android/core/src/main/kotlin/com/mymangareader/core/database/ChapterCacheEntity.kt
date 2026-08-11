package com.mymangareader.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "chapter_cache")
data class ChapterCacheEntity(
    @PrimaryKey val id: String,
    val seriesId: String,
    val title: String,
    val number: String,
    val pageCount: Int,
    val sortOrder: Double,
    val readStatus: String,
    val pagesRead: Int,
    val updatedAtLocalMs: Long?,
)
