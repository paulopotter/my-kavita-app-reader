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

private const val TEST_DB = "migration-test-13-14"

@RunWith(RobolectricTestRunner::class)
class Migration_13_14_Test {

    @get:Rule
    val helper: MigrationTestHelper = MigrationTestHelper(
        InstrumentationRegistry.getInstrumentation(),
        AppDatabase::class.java,
        emptyList(),
        FrameworkSQLiteOpenHelperFactory(),
    )

    @Test
    fun `migra de v13 para v14 dropando ui_preferences`() {
        helper.createDatabase(TEST_DB, 13).apply {
            execSQL(
                "INSERT INTO ui_preferences (id, keepScreenOnDuringReading, immersiveModeDuringReading, " +
                    "chapterSortMode, chapterSortFixedThreshold, chapterSortProgressPercent, language, " +
                    "libraryViewMode, librarySortMode) " +
                    "VALUES ('prefs', 1, 0, 'ASCENDING', NULL, 50, 'pt-BR', 'GRID', 'RECENTLY_UPDATED')",
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(TEST_DB, 14, true, AppDatabase.MIGRATION_13_14)

        val cursor = db.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'ui_preferences'")
        assertEquals(0, cursor.count)
        cursor.close()
    }

    @Test
    fun `downgrade de v14 para v13 recria ui_preferences vazia`() {
        helper.createDatabase(TEST_DB, 13).close()
        helper.runMigrationsAndValidate(TEST_DB, 14, true, AppDatabase.MIGRATION_13_14).close()

        val db = helper.runMigrationsAndValidate(TEST_DB, 13, false, AppDatabase.MIGRATION_14_13)

        val cursor = db.query("SELECT COUNT(*) FROM ui_preferences")
        cursor.moveToFirst()
        assertEquals(0, cursor.getInt(0))
        cursor.close()
    }
}
