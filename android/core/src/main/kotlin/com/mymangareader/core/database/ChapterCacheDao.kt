package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction

@Dao
interface ChapterCacheDao {
    @Query("SELECT * FROM chapter_cache WHERE seriesId = :seriesId ORDER BY sortOrder ASC")
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
    suspend fun replaceForSeries(
        seriesId: String,
        chapters: List<ChapterCacheEntity>,
    ) {
        deleteBySeriesId(seriesId)
        insertAll(chapters)
    }

    // Bulk mark-as-read/unread (e.g. "mark all read" on a series) was calling updateReadStatus
    // once per chapter, each one its own individual SQLite commit — N sequential disk writes for
    // one logical operation. Wrapping the same per-id updates in one @Transaction makes Room
    // commit them together as a single write.
    @Transaction
    suspend fun updateReadStatusForChapters(updates: List<ChapterReadStatusUpdate>) {
        updates.forEach {
            updateReadStatus(
                chapterId = it.chapterId,
                readStatus = it.readStatus,
                pagesRead = it.pagesRead,
                updatedAtLocalMs = it.updatedAtLocalMs,
            )
        }
    }
}

data class ChapterReadStatusUpdate(
    val chapterId: String,
    val readStatus: String,
    val pagesRead: Int,
    val updatedAtLocalMs: Long,
)
