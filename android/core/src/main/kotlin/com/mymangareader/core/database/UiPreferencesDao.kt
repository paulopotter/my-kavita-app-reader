package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface UiPreferencesDao {
    @Upsert
    suspend fun upsert(entity: UiPreferencesEntity)

    @Query("SELECT * FROM ui_preferences WHERE id = 'prefs' LIMIT 1")
    fun observe(): Flow<UiPreferencesEntity?>

    @Query("SELECT * FROM ui_preferences WHERE id = 'prefs' LIMIT 1")
    suspend fun get(): UiPreferencesEntity?

    @Query("SELECT keepScreenOnDuringReading FROM ui_preferences WHERE id = 'prefs' LIMIT 1")
    suspend fun getKeepScreenOnDuringReading(): Boolean?

    @Query("SELECT immersiveModeDuringReading FROM ui_preferences WHERE id = 'prefs' LIMIT 1")
    suspend fun getImmersiveModeDuringReading(): Boolean?
}
