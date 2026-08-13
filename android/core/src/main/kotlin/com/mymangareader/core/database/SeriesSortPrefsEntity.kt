package com.mymangareader.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

// Local-only override — takes precedence over the global chapter sort
// preference (UiPreferencesEntity) for this specific series only.
@Entity(tableName = "series_sort_prefs")
data class SeriesSortPrefsEntity(
    @PrimaryKey val seriesId: String,
    val chapterSortMode: String,
    val chapterSortFixedThreshold: Double? = null,
    val chapterSortProgressPercent: Int = 50,
)
