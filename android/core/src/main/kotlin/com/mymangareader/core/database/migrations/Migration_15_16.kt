package com.mymangareader.core.database.migrations

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

// Plan 008 Task 006 — notification_group gains an optional link to a Kavita server_group, same
// convention as external_metadata_group.linkedServerGroupId (plain string column, no @ForeignKey
// enforced — :notifications lives in a sibling Gradle module from :server, same reasoning). null
// means "applies to any active server group" — same semantics as the metadata table's own column.
val Migration_15_16 =
    object : Migration(15, 16) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL("ALTER TABLE notification_group ADD COLUMN linkedServerGroupId TEXT")
        }
    }

// Downgrade path: SQLite's own ADD COLUMN has no matching DROP COLUMN across the versions this
// app targets, so the portable way back is copy-drop-rename rather than a bare DROP COLUMN.
val Migration_16_15 =
    object : Migration(16, 15) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL(
                """
                CREATE TABLE notification_group_old (
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
                INSERT INTO notification_group_old (id, name, providerId, topic)
                SELECT id, name, providerId, topic FROM notification_group
                """.trimIndent(),
            )
            db.execSQL("DROP TABLE notification_group")
            db.execSQL("ALTER TABLE notification_group_old RENAME TO notification_group")
        }
    }
