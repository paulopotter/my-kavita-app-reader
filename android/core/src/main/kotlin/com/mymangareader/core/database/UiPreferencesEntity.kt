package com.mymangareader.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "ui_preferences")
data class UiPreferencesEntity(
    @PrimaryKey val id: String = "prefs",
    val keepScreenOnDuringReading: Boolean = true,
    val chapterSortMode: String = "ASCENDING",
    val chapterSortFixedThreshold: Double? = null,
    val chapterSortProgressPercent: Int = 50,
)
