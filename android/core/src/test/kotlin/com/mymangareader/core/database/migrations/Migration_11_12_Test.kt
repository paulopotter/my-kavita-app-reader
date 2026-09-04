package com.mymangareader.core.database.migrations

import androidx.room.testing.MigrationTestHelper
import androidx.sqlite.db.framework.FrameworkSQLiteOpenHelperFactory
import androidx.test.platform.app.InstrumentationRegistry
import com.mymangareader.core.database.AppDatabase
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

private const val TEST_DB = "migration-test-11-12"

@RunWith(RobolectricTestRunner::class)
class Migration_11_12_Test {
    @get:Rule
    val helper: MigrationTestHelper =
        MigrationTestHelper(
            InstrumentationRegistry.getInstrumentation(),
            AppDatabase::class.java,
            emptyList(),
            FrameworkSQLiteOpenHelperFactory(),
        )

    @Test
    fun `migra de v11 para v12 criando a tabela preferences com as colunas e PK esperadas`() {
        helper.createDatabase(TEST_DB, 11).close()

        val db = helper.runMigrationsAndValidate(TEST_DB, 12, true, AppDatabase.MIGRATION_11_12)

        db.execSQL(
            "INSERT INTO preferences (`key`, variant, value, domain, updatedAtEpochMs) " +
                "VALUES ('global', '', '{}', 'chapterSortPrefs', 1000)",
        )

        val cursor = db.query("SELECT `key`, variant, value, domain FROM preferences WHERE `key` = 'global'")
        cursor.moveToFirst()
        assertEquals("global", cursor.getString(0))
        assertEquals("", cursor.getString(1))
        assertEquals("{}", cursor.getString(2))
        assertEquals("chapterSortPrefs", cursor.getString(3))
        cursor.close()
    }

    @Test
    fun `migra de v11 para v12 rejeitando key+variant duplicados (PK composta)`() {
        helper.createDatabase(TEST_DB, 11).close()
        val db = helper.runMigrationsAndValidate(TEST_DB, 12, true, AppDatabase.MIGRATION_11_12)
        db.execSQL(
            "INSERT INTO preferences (`key`, variant, value, domain, updatedAtEpochMs) " +
                "VALUES ('global', '', '{}', 'chapterSortPrefs', 1000)",
        )

        var threw = false
        try {
            db.execSQL(
                "INSERT INTO preferences (`key`, variant, value, domain, updatedAtEpochMs) " +
                    "VALUES ('global', '', '{}', 'chapterSortPrefs', 2000)",
            )
        } catch (e: android.database.sqlite.SQLiteConstraintException) {
            threw = true
        }
        assertTrue(threw)
    }

    @Test
    fun `downgrade de v12 para v11 dropa a tabela preferences`() {
        helper.createDatabase(TEST_DB, 11).close()
        helper.runMigrationsAndValidate(TEST_DB, 12, true, AppDatabase.MIGRATION_11_12).close()

        val db = helper.runMigrationsAndValidate(TEST_DB, 11, false, AppDatabase.MIGRATION_12_11)

        val tableCursor = db.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'preferences'")
        assertEquals(0, tableCursor.count)
        tableCursor.close()
    }
}
