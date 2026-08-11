package com.mymangareader.core.database.migrations

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

val Migration_3_4 = object : Migration(3, 4) {
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
