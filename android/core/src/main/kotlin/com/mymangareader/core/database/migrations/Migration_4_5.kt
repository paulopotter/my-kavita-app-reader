package com.mymangareader.core.database.migrations

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

val Migration_4_5 = object : Migration(4, 5) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS series_sort_prefs (
                seriesId TEXT NOT NULL PRIMARY KEY,
                chapterSortMode TEXT NOT NULL,
                chapterSortFixedThreshold REAL,
                chapterSortProgressPercent INTEGER NOT NULL DEFAULT 50
            )
            """.trimIndent(),
        )
    }
}
