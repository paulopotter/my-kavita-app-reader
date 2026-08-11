package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction

@Dao
interface FollowedSeriesDao {

    @Query("SELECT seriesId FROM followed_series")
    suspend fun getAllIds(): List<String>

    @Query("SELECT EXISTS(SELECT 1 FROM followed_series WHERE seriesId = :seriesId)")
    suspend fun isFollowed(seriesId: String): Boolean

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun follow(entity: FollowedSeriesEntity)

    @Query("DELETE FROM followed_series WHERE seriesId = :seriesId")
    suspend fun unfollow(seriesId: String)

    @Transaction
    suspend fun toggle(seriesId: String) {
        if (isFollowed(seriesId)) unfollow(seriesId)
        else follow(FollowedSeriesEntity(seriesId = seriesId, followedAtMs = System.currentTimeMillis()))
    }
}
