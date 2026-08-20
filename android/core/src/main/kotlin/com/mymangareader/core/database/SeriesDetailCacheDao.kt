package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert

@Dao
interface SeriesDetailCacheDao {
    @Query("SELECT * FROM series_detail_cache WHERE seriesId = :seriesId LIMIT 1")
    suspend fun get(seriesId: String): SeriesDetailCacheEntity?

    @Upsert
    suspend fun upsert(entity: SeriesDetailCacheEntity)
}
