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

private const val TEST_DB = "migration-test-5-6"

@RunWith(RobolectricTestRunner::class)
class Migration_5_6_Test {

    @get:Rule
    val helper: MigrationTestHelper = MigrationTestHelper(
        InstrumentationRegistry.getInstrumentation(),
        AppDatabase::class.java,
        emptyList(),
        FrameworkSQLiteOpenHelperFactory(),
    )

    @Test
    fun `migra de v5 para v6 preservando reading_progress e adicionando scrollFraction`() {
        helper.createDatabase(TEST_DB, 5).apply {
            execSQL(
                "INSERT INTO reading_progress (chapterId, seriesId, page, updatedAtLocalMs) " +
                    "VALUES ('c1', 's1', 3, 1000)",
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(TEST_DB, 6, true, AppDatabase.MIGRATION_5_6)

        val cursor = db.query("SELECT scrollFraction FROM reading_progress WHERE chapterId = 'c1'")
        cursor.moveToFirst()
        assertEquals(0.0, cursor.getDouble(0), 0.0001)
        cursor.close()
    }

    @Test
    fun `migra de v5 para v6 criando page_cache vazia`() {
        helper.createDatabase(TEST_DB, 5).close()

        val db = helper.runMigrationsAndValidate(TEST_DB, 6, true, AppDatabase.MIGRATION_5_6)

        db.execSQL(
            "INSERT INTO page_cache (chapterId, pageIndex, url, cachedAtEpochMs) " +
                "VALUES ('c1', 0, 'https://example/1.jpg', 1000)",
        )
        val cursor = db.query("SELECT COUNT(*) FROM page_cache")
        cursor.moveToFirst()
        assertEquals(1, cursor.getInt(0))
        cursor.close()
    }
}
