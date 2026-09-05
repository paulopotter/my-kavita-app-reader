package com.mymangareader.core.database.migrations

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

// Plan 008 Task 001 — creates the :notifications module's schema: connection groups (mirrors
// server_group), their candidate URLs (mirrors server_url), and the local notification history
// (one row per series, replaced on a new batch for the same series — see
// NotificationHistoryEntity's own doc).
val Migration_14_15 =
    object : Migration(14, 15) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS `notification_group` (
                    `id` TEXT NOT NULL,
                    `name` TEXT NOT NULL,
                    `providerId` TEXT NOT NULL,
                    `topic` TEXT NOT NULL,
                    PRIMARY KEY(`id`)
                )
                """.trimIndent(),
            )
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS `notification_url` (
                    `id` TEXT NOT NULL,
                    `groupId` TEXT NOT NULL,
                    `url` TEXT NOT NULL,
                    `timeoutMs` INTEGER NOT NULL,
                    `priority` INTEGER NOT NULL,
                    PRIMARY KEY(`id`)
                )
                """.trimIndent(),
            )
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

// Downgrade path: drops all three tables — no data-preservation attempt, same asymmetry already
// accepted by Migration_13_12/Migration_12_11 for their own tables.
val Migration_15_14 =
    object : Migration(15, 14) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL("DROP TABLE IF EXISTS notification_history")
            db.execSQL("DROP TABLE IF EXISTS notification_url")
            db.execSQL("DROP TABLE IF EXISTS notification_group")
        }
    }
