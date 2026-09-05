package com.mymangareader.core.database.migrations

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

// Plan 008 — notification_url gains an optional link to a specific server_url, same convention
// as external_metadata_url.linkedServerUrlId (plain string column, no @ForeignKey enforced). null
// means "applies to any URL within the owning group's linked server group (or any server at all,
// if the group itself is unlinked)" — same semantics as the metadata table's own column.
val Migration_16_17 =
    object : Migration(16, 17) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL("ALTER TABLE notification_url ADD COLUMN linkedServerUrlId TEXT")
        }
    }

// Downgrade path: SQLite's own ADD COLUMN has no matching DROP COLUMN across the versions this
// app targets, so the portable way back is copy-drop-rename rather than a bare DROP COLUMN.
val Migration_17_16 =
    object : Migration(17, 16) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL(
                """
                CREATE TABLE notification_url_old (
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
                INSERT INTO notification_url_old (id, groupId, url, timeoutMs, priority)
                SELECT id, groupId, url, timeoutMs, priority FROM notification_url
                """.trimIndent(),
            )
            db.execSQL("DROP TABLE notification_url")
            db.execSQL("ALTER TABLE notification_url_old RENAME TO notification_url")
        }
    }
