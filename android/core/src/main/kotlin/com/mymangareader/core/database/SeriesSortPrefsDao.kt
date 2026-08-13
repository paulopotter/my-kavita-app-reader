package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert

@Dao
interface SeriesSortPrefsDao {

    @Query("SELECT * FROM series_sort_prefs WHERE seriesId = :seriesId")
    suspend fun get(seriesId: String): SeriesSortPrefsEntity?

    @Upsert
    suspend fun upsert(entity: SeriesSortPrefsEntity)

    @Query("DELETE FROM series_sort_prefs WHERE seriesId = :seriesId")
    suspend fun delete(seriesId: String)
}
