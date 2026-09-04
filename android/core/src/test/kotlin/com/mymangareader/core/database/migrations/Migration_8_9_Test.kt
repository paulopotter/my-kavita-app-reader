package com.mymangareader.core.database.migrations

import androidx.room.testing.MigrationTestHelper
import androidx.sqlite.db.framework.FrameworkSQLiteOpenHelperFactory
import androidx.test.platform.app.InstrumentationRegistry
import com.mymangareader.core.database.AppDatabase
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

private const val TEST_DB = "migration-test-8-9"

@RunWith(RobolectricTestRunner::class)
class Migration_8_9_Test {
    @get:Rule
    val helper: MigrationTestHelper =
        MigrationTestHelper(
            InstrumentationRegistry.getInstrumentation(),
            AppDatabase::class.java,
            emptyList(),
            FrameworkSQLiteOpenHelperFactory(),
        )

    @Test
    fun `migra de v8 para v9 copiando server_config+auth_config para um unico server_group com N server_url`() {
        helper.createDatabase(TEST_DB, 8).apply {
            execSQL("INSERT INTO auth_config (id, apiKey, jwt) VALUES ('auth', 'my-api-key', NULL)")
            execSQL(
                "INSERT INTO server_config (id, url, timeoutMs, priority, healthCheckPath) " +
                    "VALUES ('s1', 'http://lan.local', 5000, 0, '/api/Health')",
            )
            execSQL(
                "INSERT INTO server_config (id, url, timeoutMs, priority, healthCheckPath) " +
                    "VALUES ('s2', 'https://external.example', 8000, 1, '/api/Health')",
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(TEST_DB, 9, true, AppDatabase.MIGRATION_8_9)

        val groupCursor = db.query("SELECT id, name, providerId, credentialsJson, healthCheckPath FROM server_group")
        groupCursor.moveToFirst()
        assertEquals("g-kavita-1", groupCursor.getString(0))
        assertEquals("Kavita", groupCursor.getString(1))
        assertEquals("kavita", groupCursor.getString(2))
        assertEquals("""{"apiKey":"my-api-key"}""", groupCursor.getString(3))
        assertEquals("/api/Health", groupCursor.getString(4))
        assertEquals(1, groupCursor.count)
        groupCursor.close()

        val urlCursor = db.query("SELECT id, groupId, url, timeoutMs, priority FROM server_url ORDER BY priority ASC")
        urlCursor.moveToFirst()
        assertEquals("s1", urlCursor.getString(0))
        assertEquals("g-kavita-1", urlCursor.getString(1))
        assertEquals("http://lan.local", urlCursor.getString(2))
        assertEquals(5000, urlCursor.getInt(3))
        assertEquals(0, urlCursor.getInt(4))
        urlCursor.moveToNext()
        assertEquals("s2", urlCursor.getString(0))
        assertEquals("https://external.example", urlCursor.getString(2))
        assertEquals(2, urlCursor.count)
        urlCursor.close()
    }

    @Test
    fun `migra de v8 para v9 sem criar nada quando server_config esta vazia`() {
        helper.createDatabase(TEST_DB, 8).apply {
            execSQL("INSERT INTO auth_config (id, apiKey, jwt) VALUES ('auth', 'my-api-key', NULL)")
            close()
        }

        val db = helper.runMigrationsAndValidate(TEST_DB, 9, true, AppDatabase.MIGRATION_8_9)

        val groupCursor = db.query("SELECT COUNT(*) FROM server_group")
        groupCursor.moveToFirst()
        assertEquals(0, groupCursor.getInt(0))
        groupCursor.close()

        val urlCursor = db.query("SELECT COUNT(*) FROM server_url")
        urlCursor.moveToFirst()
        assertEquals(0, urlCursor.getInt(0))
        urlCursor.close()
    }

    @Test
    fun `migra de v8 para v9 sem criar grupo quando apiKey esta vazia (setup nao concluido)`() {
        helper.createDatabase(TEST_DB, 8).apply {
            execSQL("INSERT INTO auth_config (id, apiKey, jwt) VALUES ('auth', '', NULL)")
            execSQL(
                "INSERT INTO server_config (id, url, timeoutMs, priority, healthCheckPath) " +
                    "VALUES ('s1', 'http://lan.local', 5000, 0, '/api/Health')",
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(TEST_DB, 9, true, AppDatabase.MIGRATION_8_9)

        val groupCursor = db.query("SELECT COUNT(*) FROM server_group")
        groupCursor.moveToFirst()
        assertEquals(0, groupCursor.getInt(0))
        groupCursor.close()

        val urlCursor = db.query("SELECT COUNT(*) FROM server_url")
        urlCursor.moveToFirst()
        assertEquals(0, urlCursor.getInt(0))
        urlCursor.close()
    }

    @Test
    fun `migra de v8 para v9 usando healthCheckPath da url de maior prioridade quando divergem`() {
        helper.createDatabase(TEST_DB, 8).apply {
            execSQL("INSERT INTO auth_config (id, apiKey, jwt) VALUES ('auth', 'key', NULL)")
            execSQL(
                "INSERT INTO server_config (id, url, timeoutMs, priority, healthCheckPath) " +
                    "VALUES ('s1', 'http://a', 5000, 0, '/first-priority-health')",
            )
            execSQL(
                "INSERT INTO server_config (id, url, timeoutMs, priority, healthCheckPath) " +
                    "VALUES ('s2', 'http://b', 5000, 1, '/second-priority-health')",
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(TEST_DB, 9, true, AppDatabase.MIGRATION_8_9)

        val cursor = db.query("SELECT healthCheckPath FROM server_group WHERE id = 'g-kavita-1'")
        cursor.moveToFirst()
        assertEquals("/first-priority-health", cursor.getString(0))
        cursor.close()
    }

    @Test
    fun `downgrade de v9 para v8 remove server_group e server_url sem tocar server_config`() {
        helper.createDatabase(TEST_DB, 8).apply {
            execSQL("INSERT INTO auth_config (id, apiKey, jwt) VALUES ('auth', 'my-api-key', NULL)")
            execSQL(
                "INSERT INTO server_config (id, url, timeoutMs, priority, healthCheckPath) " +
                    "VALUES ('s1', 'http://lan.local', 5000, 0, '/api/Health')",
            )
            close()
        }
        helper.runMigrationsAndValidate(TEST_DB, 9, true, AppDatabase.MIGRATION_8_9).close()

        val db = helper.runMigrationsAndValidate(TEST_DB, 8, false, AppDatabase.MIGRATION_9_8)

        val serverConfigCursor = db.query("SELECT COUNT(*) FROM server_config")
        serverConfigCursor.moveToFirst()
        assertEquals(1, serverConfigCursor.getInt(0))
        serverConfigCursor.close()

        val tableCursor =
            db.query(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('server_group', 'server_url')",
            )
        assertEquals(0, tableCursor.count)
        tableCursor.close()
    }
}
