package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction

@Dao
interface PageCacheDao {
    @Query("SELECT * FROM page_cache WHERE chapterId = :chapterId ORDER BY pageIndex ASC")
    suspend fun getByChapterId(chapterId: String): List<PageCacheEntity>

    @Query("SELECT COUNT(*) FROM page_cache WHERE chapterId = :chapterId")
    suspend fun countByChapterId(chapterId: String): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(pages: List<PageCacheEntity>)

    @Query("DELETE FROM page_cache WHERE chapterId = :chapterId")
    suspend fun deleteByChapterId(chapterId: String)

    @Transaction
    suspend fun replaceForChapter(chapterId: String, pages: List<PageCacheEntity>) {
        deleteByChapterId(chapterId)
        insertAll(pages)
    }
}
