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

private const val TEST_DB = "migration-test-14-15"

@RunWith(RobolectricTestRunner::class)
class Migration_14_15_Test {
    @get:Rule
    val helper: MigrationTestHelper =
        MigrationTestHelper(
            InstrumentationRegistry.getInstrumentation(),
            AppDatabase::class.java,
            emptyList(),
            FrameworkSQLiteOpenHelperFactory(),
        )

    @Test
    fun `migra de v14 para v15 criando as 3 tabelas vazias`() {
        helper.createDatabase(TEST_DB, 14).close()

        val db = helper.runMigrationsAndValidate(TEST_DB, 15, true, AppDatabase.MIGRATION_14_15)

        for (table in listOf("notification_group", "notification_url", "notification_history")) {
            val cursor = db.query("SELECT COUNT(*) FROM $table")
            cursor.moveToFirst()
            assertEquals(0, cursor.getInt(0))
            cursor.close()
        }
    }

    @Test
    fun `downgrade de v15 para v14 dropa as 3 tabelas`() {
        helper.createDatabase(TEST_DB, 14).close()
        helper.runMigrationsAndValidate(TEST_DB, 15, true, AppDatabase.MIGRATION_14_15).close()

        val db = helper.runMigrationsAndValidate(TEST_DB, 14, false, AppDatabase.MIGRATION_15_14)

        for (table in listOf("notification_group", "notification_url", "notification_history")) {
            val cursor = db.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = '$table'")
            assertEquals(0, cursor.count)
            cursor.close()
        }
    }
}
