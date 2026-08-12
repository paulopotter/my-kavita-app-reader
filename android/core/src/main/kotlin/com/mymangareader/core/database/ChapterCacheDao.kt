package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction

@Dao
interface ChapterCacheDao {

    @Query("SELECT * FROM chapter_cache WHERE seriesId = :seriesId")
    suspend fun getBySeriesId(seriesId: String): List<ChapterCacheEntity>

    @Query(
        "UPDATE chapter_cache SET readStatus = :readStatus, pagesRead = :pagesRead, updatedAtLocalMs = :updatedAtLocalMs WHERE id = :chapterId",
    )
    suspend fun updateReadStatus(
        chapterId: String,
        readStatus: String,
        pagesRead: Int,
        updatedAtLocalMs: Long,
    )

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(chapters: List<ChapterCacheEntity>)

    @Query("DELETE FROM chapter_cache WHERE seriesId = :seriesId")
    suspend fun deleteBySeriesId(seriesId: String)

    @Transaction
    suspend fun replaceForSeries(seriesId: String, chapters: List<ChapterCacheEntity>) {
        deleteBySeriesId(seriesId)
        insertAll(chapters)
    }
}
