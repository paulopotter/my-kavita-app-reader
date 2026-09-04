package com.mymangareader.core.database.migrations

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

// The single generic table backing Preferences (Kotlin, :preferences module) — same shape as
// Migration_10_11's cache table minus the TTL/expiration columns, since a preference is a source
// of truth (never recomputed from elsewhere), not a cache. No data migration from any existing
// per-feature preference table (e.g. series_sort_prefs) — those stay untouched until the RN side
// actually migrates to PreferencesManager.
val Migration_11_12 =
    object : Migration(11, 12) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS preferences (
                    `key` TEXT NOT NULL,
                    variant TEXT NOT NULL,
                    value TEXT NOT NULL,
                    domain TEXT NOT NULL,
                    updatedAtEpochMs INTEGER NOT NULL,
                    PRIMARY KEY(`key`, variant)
                )
                """.trimIndent(),
            )
        }
    }

// Downgrade path: just drops the new table.
val Migration_12_11 =
    object : Migration(12, 11) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL("DROP TABLE IF EXISTS preferences")
        }
    }
