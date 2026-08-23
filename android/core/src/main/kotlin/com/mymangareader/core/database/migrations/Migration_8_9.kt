package com.mymangareader.core.database.migrations

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

private const val KAVITA_GROUP_ID = "g-kavita-1"

// One-time snapshot copy from the old server_config/auth_config tables into the new
// server_group/server_url shape — not an ongoing sync. server_config/auth_config are left
// untouched (still read by the pre-plan-017 features/kavita/ code); the new tables are the
// :server module's own copy going forward. Safe to run even with zero rows in server_config (a
// fresh install, or a device that never configured a server yet) — the INSERT ... SELECT simply
// inserts nothing in that case.
val Migration_8_9 = object : Migration(8, 9) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS server_group (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL,
                providerId TEXT NOT NULL,
                credentialsJson TEXT NOT NULL,
                healthCheckPath TEXT NOT NULL
            )
            """.trimIndent(),
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS server_url (
                id TEXT NOT NULL PRIMARY KEY,
                groupId TEXT NOT NULL,
                url TEXT NOT NULL,
                timeoutMs INTEGER NOT NULL,
                priority INTEGER NOT NULL
            )
            """.trimIndent(),
        )

        // Only create the Kavita group if there's at least one server_config row to migrate —
        // and only if auth_config actually has an apiKey (it's nullable-in-spirit: the "auth"
        // row can exist with a blank apiKey before setup completes).
        // credentialsJson is built as a literal {"apiKey": "..."} blob — matches
        // KavitaServerPlugin.Credentials' shape (the only field Kavita's registration declares).
        // replace() escapes any embedded double-quote so the JSON stays well-formed.
        db.execSQL(
            """
            INSERT INTO server_group (id, name, providerId, credentialsJson, healthCheckPath)
            SELECT '$KAVITA_GROUP_ID', 'Kavita', 'kavita',
                   '{"apiKey":"' || replace(auth_config.apiKey, '"', '\"') || '"}',
                   server_config.healthCheckPath
            FROM auth_config
            JOIN server_config ON 1 = 1
            WHERE auth_config.id = 'auth' AND auth_config.apiKey != ''
            ORDER BY server_config.priority ASC
            LIMIT 1
            """.trimIndent(),
        )
        db.execSQL(
            """
            INSERT INTO server_url (id, groupId, url, timeoutMs, priority)
            SELECT server_config.id, '$KAVITA_GROUP_ID', server_config.url, server_config.timeoutMs, server_config.priority
            FROM server_config
            WHERE EXISTS (SELECT 1 FROM server_group WHERE id = '$KAVITA_GROUP_ID')
            """.trimIndent(),
        )
    }
}

// Downgrade path: just drops the two new tables — server_config/auth_config were never touched
// by Migration_8_9, so there's nothing to restore on that side.
val Migration_9_8 = object : Migration(9, 8) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("DROP TABLE IF EXISTS server_url")
        db.execSQL("DROP TABLE IF EXISTS server_group")
    }
}
