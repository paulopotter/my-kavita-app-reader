package com.mymangareader.core.database

import androidx.room.Entity

@Entity(tableName = "page_cache", primaryKeys = ["chapterId", "pageIndex"])
data class PageCacheEntity(
    val chapterId: String,
    val pageIndex: Int,
    val url: String,
    val cachedAtEpochMs: Long,
)
