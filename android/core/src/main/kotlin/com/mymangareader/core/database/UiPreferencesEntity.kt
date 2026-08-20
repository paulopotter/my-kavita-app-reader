package com.mymangareader.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "ui_preferences")
data class UiPreferencesEntity(
    @PrimaryKey val id: String = "prefs",
    val keepScreenOnDuringReading: Boolean = true,
    val immersiveModeDuringReading: Boolean = false,
    val chapterSortMode: String = "ASCENDING",
    val chapterSortFixedThreshold: Double? = null,
    val chapterSortProgressPercent: Int = 50,
    val language: String = "pt-BR",
    val lastSuccessfulSyncAtMs: Long? = null,
    val libraryViewMode: String = "GRID",
    val librarySortMode: String = "RECENTLY_UPDATED",
)
