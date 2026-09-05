package com.mymangareader.core.database.migrations

import androidx.room.testing.MigrationTestHelper
import androidx.sqlite.db.framework.FrameworkSQLiteOpenHelperFactory
import androidx.test.platform.app.InstrumentationRegistry
import com.mymangareader.core.database.AppDatabase
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

private const val TEST_DB = "migration-test-15-16"

@RunWith(RobolectricTestRunner::class)
class Migration_15_16_Test {
    @get:Rule
    val helper: MigrationTestHelper =
        MigrationTestHelper(
            InstrumentationRegistry.getInstrumentation(),
            AppDatabase::class.java,
            emptyList(),
            FrameworkSQLiteOpenHelperFactory(),
        )

    @Test
    fun `migra de v15 para v16 adicionando linkedServerGroupId nulo por padrao`() {
        helper.createDatabase(TEST_DB, 15).apply {
            execSQL(
                "INSERT INTO notification_group (id, name, providerId, topic) VALUES ('g1', 'Home', 'ntfy', 'chapters')",
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(TEST_DB, 16, true, AppDatabase.MIGRATION_15_16)

        val cursor = db.query("SELECT linkedServerGroupId FROM notification_group WHERE id = 'g1'")
        cursor.moveToFirst()
        assertNull(cursor.getString(cursor.getColumnIndexOrThrow("linkedServerGroupId")))
        cursor.close()
    }

    @Test
    fun `downgrade de v16 para v15 preserva as colunas originais e descarta linkedServerGroupId`() {
        helper.createDatabase(TEST_DB, 15).close()
        helper.runMigrationsAndValidate(TEST_DB, 16, true, AppDatabase.MIGRATION_15_16).apply {
            execSQL(
                "INSERT INTO notification_group (id, name, providerId, topic, linkedServerGroupId) " +
                    "VALUES ('g1', 'Home', 'ntfy', 'chapters', 'server-1')",
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(TEST_DB, 15, false, AppDatabase.MIGRATION_16_15)

        val cursor = db.query("SELECT name, providerId, topic FROM notification_group WHERE id = 'g1'")
        cursor.moveToFirst()
        assertEquals("Home", cursor.getString(cursor.getColumnIndexOrThrow("name")))
        assertEquals("ntfy", cursor.getString(cursor.getColumnIndexOrThrow("providerId")))
        assertEquals("chapters", cursor.getString(cursor.getColumnIndexOrThrow("topic")))
        cursor.close()

        val schemaCursor = db.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'notification_group_old'")
        assertEquals(0, schemaCursor.count)
        schemaCursor.close()
    }
}
