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

private const val TEST_DB = "migration-test-10-11"

@RunWith(RobolectricTestRunner::class)
class Migration_10_11_Test {
    @get:Rule
    val helper: MigrationTestHelper =
        MigrationTestHelper(
            InstrumentationRegistry.getInstrumentation(),
            AppDatabase::class.java,
            emptyList(),
            FrameworkSQLiteOpenHelperFactory(),
        )

    @Test
    fun `migra de v10 para v11 criando a tabela cache com as colunas e PK esperadas`() {
        helper.createDatabase(TEST_DB, 10).close()

        val db = helper.runMigrationsAndValidate(TEST_DB, 11, true, AppDatabase.MIGRATION_10_11)

        db.execSQL(
            "INSERT INTO cache (`key`, variant, value, domain, cachedAtEpochMs, ttlMs, expiresAtEpochMs, lastAccessedAtEpochMs) " +
                "VALUES ('c1', 'full', '{}', 'chapter', 1000, 900000, 901000, 1000)",
        )

        val cursor = db.query("SELECT `key`, variant, value, domain FROM cache WHERE `key` = 'c1'")
        cursor.moveToFirst()
        assertEquals("c1", cursor.getString(0))
        assertEquals("full", cursor.getString(1))
        assertEquals("{}", cursor.getString(2))
        assertEquals("chapter", cursor.getString(3))
        cursor.close()
    }

    @Test
    fun `migra de v10 para v11 rejeitando key+variant duplicados (PK composta)`() {
        helper.createDatabase(TEST_DB, 10).close()
        val db = helper.runMigrationsAndValidate(TEST_DB, 11, true, AppDatabase.MIGRATION_10_11)
        db.execSQL(
            "INSERT INTO cache (`key`, variant, value, domain, cachedAtEpochMs, ttlMs, expiresAtEpochMs, lastAccessedAtEpochMs) " +
                "VALUES ('c1', 'full', '{}', 'chapter', 1000, 900000, 901000, 1000)",
        )

        var threw = false
        try {
            db.execSQL(
                "INSERT INTO cache (`key`, variant, value, domain, cachedAtEpochMs, ttlMs, expiresAtEpochMs, lastAccessedAtEpochMs) " +
                    "VALUES ('c1', 'full', '{}', 'chapter', 2000, 900000, 902000, 2000)",
            )
        } catch (e: android.database.sqlite.SQLiteConstraintException) {
            threw = true
        }
        assertTrue(threw)
    }

    @Test
    fun `downgrade de v11 para v10 dropa a tabela cache`() {
        helper.createDatabase(TEST_DB, 10).close()
        helper.runMigrationsAndValidate(TEST_DB, 11, true, AppDatabase.MIGRATION_10_11).close()

        val db = helper.runMigrationsAndValidate(TEST_DB, 10, false, AppDatabase.MIGRATION_11_10)

        val tableCursor = db.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'cache'")
        assertEquals(0, tableCursor.count)
        tableCursor.close()
    }
}
