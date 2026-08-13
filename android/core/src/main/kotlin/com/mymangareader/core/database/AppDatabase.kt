package com.mymangareader.core.database

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [
        ServerConfigEntity::class,
        AuthConfigEntity::class,
        UiPreferencesEntity::class,
        ChapterCacheEntity::class,
        ReadingProgressEntity::class,
        BffMatchEntity::class,
        BffServerConfigEntity::class,
        FollowedSeriesEntity::class,
        SeriesSortPrefsEntity::class,
    ],
    version = 5,
    exportSchema = true,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun serverConfigDao(): ServerConfigDao
    abstract fun authConfigDao(): AuthConfigDao
    abstract fun uiPreferencesDao(): UiPreferencesDao
    abstract fun chapterCacheDao(): ChapterCacheDao
    abstract fun readingProgressDao(): ReadingProgressDao
    abstract fun bffMatchDao(): BffMatchDao
    abstract fun bffServerConfigDao(): BffServerConfigDao
    abstract fun followedSeriesDao(): FollowedSeriesDao
    abstract fun seriesSortPrefsDao(): SeriesSortPrefsDao

    companion object {
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS chapter_cache (
                        id TEXT NOT NULL PRIMARY KEY,
                        seriesId TEXT NOT NULL,
                        title TEXT NOT NULL,
                        number TEXT NOT NULL,
                        pageCount INTEGER NOT NULL,
                        sortOrder REAL NOT NULL,
                        readStatus TEXT NOT NULL,
                        pagesRead INTEGER NOT NULL,
                        updatedAtLocalMs INTEGER
                    )
                    """.trimIndent(),
                )
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS reading_progress (
                        chapterId TEXT NOT NULL PRIMARY KEY,
                        seriesId TEXT NOT NULL,
                        page INTEGER NOT NULL,
                        updatedAtLocalMs INTEGER NOT NULL
                    )
                    """.trimIndent(),
                )
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS bff_match (
                        seriesId TEXT NOT NULL PRIMARY KEY,
                        slug TEXT,
                        status TEXT NOT NULL,
                        downloadedChapters INTEGER,
                        totalChapters INTEGER,
                        latestChapterLabel TEXT,
                        hasErrors INTEGER NOT NULL,
                        updatedAtLocalMs INTEGER NOT NULL
                    )
                    """.trimIndent(),
                )
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS bff_server_config (
                        id TEXT NOT NULL PRIMARY KEY,
                        url TEXT NOT NULL,
                        priority INTEGER NOT NULL,
                        linkedKavitaServerConfigId TEXT
                    )
                    """.trimIndent(),
                )
                db.execSQL("ALTER TABLE ui_preferences ADD COLUMN language TEXT NOT NULL DEFAULT 'pt-BR'")
                db.execSQL("ALTER TABLE ui_preferences ADD COLUMN lastSuccessfulSyncAtMs INTEGER")
            }
        }

        val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE bff_server_config ADD COLUMN healthCheckPath TEXT NOT NULL DEFAULT '/manga'")
            }
        }

        val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS followed_series (
                        seriesId TEXT NOT NULL PRIMARY KEY,
                        followedAtMs INTEGER NOT NULL
                    )
                    """.trimIndent(),
                )
                db.execSQL("ALTER TABLE ui_preferences ADD COLUMN libraryViewMode TEXT NOT NULL DEFAULT 'GRID'")
                db.execSQL("ALTER TABLE ui_preferences ADD COLUMN librarySortMode TEXT NOT NULL DEFAULT 'RECENTLY_UPDATED'")
            }
        }

        val MIGRATION_4_5 = com.mymangareader.core.database.migrations.Migration_4_5
    }
}
