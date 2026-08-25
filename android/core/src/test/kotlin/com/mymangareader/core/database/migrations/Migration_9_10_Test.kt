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

private const val TEST_DB = "migration-test-9-10"

@RunWith(RobolectricTestRunner::class)
class Migration_9_10_Test {

    @get:Rule
    val helper: MigrationTestHelper = MigrationTestHelper(
        InstrumentationRegistry.getInstrumentation(),
        AppDatabase::class.java,
        emptyList(),
        FrameworkSQLiteOpenHelperFactory(),
    )

    @Test
    fun `migra de v9 para v10 copiando bff_server_config para um unico external_metadata_group com N external_metadata_url`() {
        helper.createDatabase(TEST_DB, 9).apply {
            execSQL(
                "INSERT INTO bff_server_config (id, url, priority, healthCheckPath, linkedKavitaServerConfigId) " +
                    "VALUES ('b1', 'http://lan.local:8080', 0, '/manga', NULL)",
            )
            execSQL(
                "INSERT INTO bff_server_config (id, url, priority, healthCheckPath, linkedKavitaServerConfigId) " +
                    "VALUES ('b2', 'https://external.example', 1, '/manga', NULL)",
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(TEST_DB, 10, true, AppDatabase.MIGRATION_9_10)

        val groupCursor = db.query(
            "SELECT id, name, providerId, credentialsJson, healthCheckPath, linkedServerGroupId FROM external_metadata_group",
        )
        groupCursor.moveToFirst()
        assertEquals("g-personalbff-1", groupCursor.getString(0))
        assertEquals("personalBff", groupCursor.getString(1))
        assertEquals("personalBff", groupCursor.getString(2))
        assertEquals("{}", groupCursor.getString(3))
        assertEquals("/manga", groupCursor.getString(4))
        assertEquals(true, groupCursor.isNull(5))
        assertEquals(1, groupCursor.count)
        groupCursor.close()

        val urlCursor = db.query(
            "SELECT id, groupId, url, timeoutMs, priority, linkedServerUrlId FROM external_metadata_url ORDER BY priority ASC",
        )
        urlCursor.moveToFirst()
        assertEquals("b1", urlCursor.getString(0))
        assertEquals("g-personalbff-1", urlCursor.getString(1))
        assertEquals("http://lan.local:8080", urlCursor.getString(2))
        assertEquals(3000, urlCursor.getInt(3))
        assertEquals(0, urlCursor.getInt(4))
        assertEquals(true, urlCursor.isNull(5))
        urlCursor.moveToNext()
        assertEquals("b2", urlCursor.getString(0))
        assertEquals("https://external.example", urlCursor.getString(2))
        assertEquals(2, urlCursor.count)
        urlCursor.close()
    }

    @Test
    fun `migra de v9 para v10 sem criar nada quando bff_server_config esta vazia`() {
        helper.createDatabase(TEST_DB, 9).close()

        val db = helper.runMigrationsAndValidate(TEST_DB, 10, true, AppDatabase.MIGRATION_9_10)

        val groupCursor = db.query("SELECT COUNT(*) FROM external_metadata_group")
        groupCursor.moveToFirst()
        assertEquals(0, groupCursor.getInt(0))
        groupCursor.close()

        val urlCursor = db.query("SELECT COUNT(*) FROM external_metadata_url")
        urlCursor.moveToFirst()
        assertEquals(0, urlCursor.getInt(0))
        urlCursor.close()
    }

    @Test
    fun `migra de v9 para v10 usando healthCheckPath da url de maior prioridade quando divergem`() {
        helper.createDatabase(TEST_DB, 9).apply {
            execSQL(
                "INSERT INTO bff_server_config (id, url, priority, healthCheckPath, linkedKavitaServerConfigId) " +
                    "VALUES ('b1', 'http://a', 0, '/first-priority-health', NULL)",
            )
            execSQL(
                "INSERT INTO bff_server_config (id, url, priority, healthCheckPath, linkedKavitaServerConfigId) " +
                    "VALUES ('b2', 'http://b', 1, '/second-priority-health', NULL)",
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(TEST_DB, 10, true, AppDatabase.MIGRATION_9_10)

        val cursor = db.query("SELECT healthCheckPath FROM external_metadata_group WHERE id = 'g-personalbff-1'")
        cursor.moveToFirst()
        assertEquals("/first-priority-health", cursor.getString(0))
        cursor.close()
    }

    @Test
    fun `downgrade de v10 para v9 remove external_metadata_group e external_metadata_url sem tocar bff_server_config`() {
        helper.createDatabase(TEST_DB, 9).apply {
            execSQL(
                "INSERT INTO bff_server_config (id, url, priority, healthCheckPath, linkedKavitaServerConfigId) " +
                    "VALUES ('b1', 'http://lan.local', 0, '/manga', NULL)",
            )
            close()
        }
        helper.runMigrationsAndValidate(TEST_DB, 10, true, AppDatabase.MIGRATION_9_10).close()

        val db = helper.runMigrationsAndValidate(TEST_DB, 9, false, AppDatabase.MIGRATION_10_9)

        val bffConfigCursor = db.query("SELECT COUNT(*) FROM bff_server_config")
        bffConfigCursor.moveToFirst()
        assertEquals(1, bffConfigCursor.getInt(0))
        bffConfigCursor.close()

        val tableCursor = db.query(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('external_metadata_group', 'external_metadata_url')",
        )
        assertEquals(0, tableCursor.count)
        tableCursor.close()
    }
}
