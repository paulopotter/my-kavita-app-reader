package com.mymangareader.core.database.migrations

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

// Task 039 — ui_preferences is retired. Every preference it ever held has moved: the 2 reading
// toggles (keepScreenOnDuringReading / immersiveModeDuringReading) to `preferences`
// (domain='readerPrefs', RN-side ReaderPrefs); chapterSort* already went to `preferences` in
// Migration_12_13; language to the OS per-app locale; library* to `preferences`
// (domain='libraryLayout'); lastSuccessfulSyncAtMs never had a reader. No data migration — the 2
// toggles reset to their defaults once (user's call, same as library.prefs.ts did for the layout).
val Migration_13_14 =
    object : Migration(13, 14) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL("DROP TABLE IF EXISTS ui_preferences")
        }
    }

// Downgrade path: recreates ui_preferences empty with the v13 schema (copied verbatim from
// schemas/AppDatabase/13.json) — no attempt to reverse the (non-existent) data copy, same
// asymmetry Migration_13_12 / Migration_12_11 already accepted for their own tables.
val Migration_14_13 =
    object : Migration(14, 13) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS `ui_preferences` (
                    `id` TEXT NOT NULL,
                    `keepScreenOnDuringReading` INTEGER NOT NULL,
                    `immersiveModeDuringReading` INTEGER NOT NULL,
                    `chapterSortMode` TEXT NOT NULL,
                    `chapterSortFixedThreshold` REAL,
                    `chapterSortProgressPercent` INTEGER NOT NULL,
                    `language` TEXT NOT NULL,
                    `lastSuccessfulSyncAtMs` INTEGER,
                    `libraryViewMode` TEXT NOT NULL,
                    `librarySortMode` TEXT NOT NULL,
                    PRIMARY KEY(`id`)
                )
                """.trimIndent(),
            )
        }
    }
