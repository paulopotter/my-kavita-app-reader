package com.mymangareader.core.database

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [
        ServerConfigEntity::class,
        AuthConfigEntity::class,
        UiPreferencesEntity::class,
    ],
    version = 1,
    exportSchema = true,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun serverConfigDao(): ServerConfigDao
    abstract fun authConfigDao(): AuthConfigDao
    abstract fun uiPreferencesDao(): UiPreferencesDao
}
