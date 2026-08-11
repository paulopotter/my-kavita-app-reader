package com.mymangareader.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "bff_match")
data class BffMatchEntity(
    @PrimaryKey val seriesId: String,
    val slug: String?,
    val status: String,
    val downloadedChapters: Int?,
    val totalChapters: Int?,
    val latestChapterLabel: String?,
    val hasErrors: Boolean,
    val updatedAtLocalMs: Long,
)
