package com.mymangareader.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

// Local-only — no remote sync
@Entity(tableName = "followed_series")
data class FollowedSeriesEntity(
    @PrimaryKey val seriesId: String,
    val followedAtMs: Long,
)
