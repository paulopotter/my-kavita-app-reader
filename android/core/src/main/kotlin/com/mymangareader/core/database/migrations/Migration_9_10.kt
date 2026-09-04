package com.mymangareader.core.database.migrations

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

private const val PERSONAL_BFF_GROUP_ID = "g-personalbff-1"

// One-time snapshot copy from the old bff_server_config table into the new
// external_metadata_group/external_metadata_url shape — not an ongoing sync, same convention as
// Migration_8_9. bff_server_config is left untouched (still read by today's BffFeature); the new
// tables are :external-metadata-server's own copy going forward. providerId is hardcoded to
// 'personalBff' (bff_server_config never had a provider concept) and credentialsJson to '{}'
// (personalBff has no auth today) — same "invent a fixed value for legacy data with no such
// concept" approach Migration_8_9 already used for providerId='kavita'. Safe to run with zero
// rows in bff_server_config.
val Migration_9_10 =
    object : Migration(9, 10) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS external_metadata_group (
                    id TEXT NOT NULL PRIMARY KEY,
                    name TEXT NOT NULL,
                    providerId TEXT NOT NULL,
                    credentialsJson TEXT NOT NULL,
                    healthCheckPath TEXT NOT NULL,
                    linkedServerGroupId TEXT
                )
                """.trimIndent(),
            )
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS external_metadata_url (
                    id TEXT NOT NULL PRIMARY KEY,
                    groupId TEXT NOT NULL,
                    url TEXT NOT NULL,
                    timeoutMs INTEGER NOT NULL,
                    priority INTEGER NOT NULL,
                    linkedServerUrlId TEXT
                )
                """.trimIndent(),
            )

            // Only create the personalBff group if there's at least one bff_server_config row to
            // migrate. linkedServerGroupId is left NULL here — bff_server_config's
            // linkedKavitaServerConfigId pointed at a server_config row (URL-level, pre-Task-014/017
            // shape), which has no direct equivalent server_group to link to automatically; the user
            // re-links at the group level manually if desired.
            db.execSQL(
                """
                INSERT INTO external_metadata_group (id, name, providerId, credentialsJson, healthCheckPath, linkedServerGroupId)
                SELECT '$PERSONAL_BFF_GROUP_ID', 'personalBff', 'personalBff', '{}', bff_server_config.healthCheckPath, NULL
                FROM bff_server_config
                ORDER BY bff_server_config.priority ASC
                LIMIT 1
                """.trimIndent(),
            )
            db.execSQL(
                """
                INSERT INTO external_metadata_url (id, groupId, url, timeoutMs, priority, linkedServerUrlId)
                SELECT bff_server_config.id, '$PERSONAL_BFF_GROUP_ID', bff_server_config.url, 3000, bff_server_config.priority, NULL
                FROM bff_server_config
                WHERE EXISTS (SELECT 1 FROM external_metadata_group WHERE id = '$PERSONAL_BFF_GROUP_ID')
                """.trimIndent(),
            )
        }
    }

// Downgrade path: just drops the two new tables — bff_server_config was never touched by
// Migration_9_10, so there's nothing to restore on that side.
val Migration_10_9 =
    object : Migration(10, 9) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL("DROP TABLE IF EXISTS external_metadata_url")
            db.execSQL("DROP TABLE IF EXISTS external_metadata_group")
        }
    }
