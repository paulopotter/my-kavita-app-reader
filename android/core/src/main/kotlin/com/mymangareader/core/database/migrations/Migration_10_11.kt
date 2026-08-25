package com.mymangareader.core.database.migrations

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

// Task 023 — the single generic table backing Cache (Kotlin, :cache module)'s PERSISTENT mode.
// No data migration from the old per-domain cache tables (chapter_cache/page_cache/
// series_detail_cache) — those stay untouched until the RN side actually migrates to
// CacheManager (Task 023's own RN half, not yet built).
val Migration_10_11 = object : Migration(10, 11) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS cache (
                `key` TEXT NOT NULL PRIMARY KEY,
                value TEXT NOT NULL,
                domain TEXT NOT NULL,
                cachedAtEpochMs INTEGER NOT NULL,
                expiresAtEpochMs INTEGER NOT NULL
            )
            """.trimIndent(),
        )
    }
}

// Downgrade path: just drops the new table.
val Migration_11_10 = object : Migration(11, 10) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("DROP TABLE IF EXISTS cache")
    }
}
