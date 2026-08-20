package com.mymangareader.core.database.migrations

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

val Migration_7_8 = object : Migration(7, 8) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS series_detail_cache (
                seriesId TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL,
                coverImageUrl TEXT NOT NULL,
                summary TEXT,
                genresJson TEXT NOT NULL,
                tagsJson TEXT NOT NULL,
                updatedAtLocalMs INTEGER NOT NULL
            )
            """.trimIndent(),
        )
    }
}
