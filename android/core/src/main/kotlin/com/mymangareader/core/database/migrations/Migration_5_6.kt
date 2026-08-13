package com.mymangareader.core.database.migrations

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

val Migration_5_6 = object : Migration(5, 6) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE reading_progress ADD COLUMN scrollFraction REAL NOT NULL DEFAULT 0.0")
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS page_cache (
                chapterId TEXT NOT NULL,
                pageIndex INTEGER NOT NULL,
                url TEXT NOT NULL,
                cachedAtEpochMs INTEGER NOT NULL,
                PRIMARY KEY(chapterId, pageIndex)
            )
            """.trimIndent(),
        )
    }
}
