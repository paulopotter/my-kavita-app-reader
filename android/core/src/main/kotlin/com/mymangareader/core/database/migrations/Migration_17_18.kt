package com.mymangareader.core.database.migrations

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

// notification_history moves from "one row per publisher event, chapterIdsJson/chapterNumbersJson
// holding whatever list that event carried" to "one row per CHAPTER, always" — the explode step
// now lives upstream (NotificationResolver, `:notifications`) before a row is ever inserted, so
// there is no longer a list column to hold: chapterId/chapterNumber are plain, singular columns.
// No data preserved on either direction — pre-release, no installed base to migrate (same call as
// every other destructive-but-explicit migration in this file when there's nothing to carry over).
val Migration_17_18 =
    object : Migration(17, 18) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL("DROP TABLE IF EXISTS notification_history")
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS `notification_history` (
                    `id` TEXT NOT NULL,
                    `seriesId` TEXT NOT NULL,
                    `seriesName` TEXT NOT NULL,
                    `chapterId` TEXT,
                    `chapterNumber` TEXT,
                    `detectedAtMs` INTEGER NOT NULL,
                    `read` INTEGER NOT NULL,
                    `createdAtLocalMs` INTEGER NOT NULL,
                    PRIMARY KEY(`id`)
                )
                """.trimIndent(),
            )
        }
    }

val Migration_18_17 =
    object : Migration(18, 17) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL("DROP TABLE IF EXISTS notification_history")
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS `notification_history` (
                    `id` TEXT NOT NULL,
                    `seriesId` TEXT NOT NULL,
                    `seriesName` TEXT NOT NULL,
                    `chapterIdsJson` TEXT,
                    `chapterNumbersJson` TEXT,
                    `detectedAtMs` INTEGER NOT NULL,
                    `read` INTEGER NOT NULL,
                    `createdAtLocalMs` INTEGER NOT NULL,
                    PRIMARY KEY(`id`)
                )
                """.trimIndent(),
            )
        }
    }
