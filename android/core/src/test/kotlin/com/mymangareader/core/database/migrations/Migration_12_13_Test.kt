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

private const val TEST_DB = "migration-test-12-13"

@RunWith(RobolectricTestRunner::class)
class Migration_12_13_Test {
    @get:Rule
    val helper: MigrationTestHelper =
        MigrationTestHelper(
            InstrumentationRegistry.getInstrumentation(),
            AppDatabase::class.java,
            emptyList(),
            FrameworkSQLiteOpenHelperFactory(),
        )

    @Test
    fun `migra de v12 para v13 copiando series_sort_prefs para preferences por seriesId`() {
        helper.createDatabase(TEST_DB, 12).apply {
            execSQL(
                "INSERT INTO series_sort_prefs (seriesId, chapterSortMode, chapterSortFixedThreshold, chapterSortProgressPercent) " +
                    "VALUES ('s1', 'AUTO_FIXED', 3.0, 50)",
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(TEST_DB, 13, true, AppDatabase.MIGRATION_12_13)

        val cursor = db.query("SELECT `key`, variant, value, domain FROM preferences WHERE `key` = 's1'")
        cursor.moveToFirst()
        assertEquals("s1", cursor.getString(0))
        assertEquals("", cursor.getString(1))
        assertEquals("{\"mode\":\"AUTO_FIXED\",\"fixedThreshold\":3.0,\"progressPercent\":50}", cursor.getString(2))
        assertEquals("chapterSortPrefs", cursor.getString(3))
        assertEquals(1, cursor.count)
        cursor.close()
    }

    @Test
    fun `migra de v12 para v13 copiando ui_preferences para preferences com key global`() {
        helper.createDatabase(TEST_DB, 12).apply {
            execSQL(
                "INSERT INTO ui_preferences (id, keepScreenOnDuringReading, immersiveModeDuringReading, " +
                    "chapterSortMode, chapterSortFixedThreshold, chapterSortProgressPercent, language, " +
                    "libraryViewMode, librarySortMode) " +
                    "VALUES ('prefs', 1, 0, 'DESCENDING', NULL, 75, 'pt-BR', 'GRID', 'RECENTLY_UPDATED')",
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(TEST_DB, 13, true, AppDatabase.MIGRATION_12_13)

        val cursor = db.query("SELECT value FROM preferences WHERE `key` = 'global'")
        cursor.moveToFirst()
        assertEquals("{\"mode\":\"DESCENDING\",\"progressPercent\":75}", cursor.getString(0))
        cursor.close()
    }

    @Test
    fun `migra de v12 para v13 sem crashar quando preferences ja tem key global (ChaptersTool ja escreveu antes de atualizar)`() {
        helper.createDatabase(TEST_DB, 12).apply {
            // Reproduz o cenário real do crash: um device que já usava ChaptersTool.sort (via
            // ConfigScreen/SerieScreen) antes desta migration existir já tem uma entrada
            // ('global', '') em preferences — um INSERT sem OR IGNORE colide na PK (key, variant)
            // com SQLITE_CONSTRAINT_PRIMARYKEY e derruba a migration inteira.
            execSQL(
                "INSERT INTO preferences (`key`, variant, value, domain, updatedAtEpochMs) " +
                    "VALUES ('global', '', '{\"mode\":\"ASCENDING\",\"progressPercent\":50}', 'chapterSortPrefs', 1000)",
            )
            execSQL(
                "INSERT INTO ui_preferences (id, keepScreenOnDuringReading, immersiveModeDuringReading, " +
                    "chapterSortMode, chapterSortFixedThreshold, chapterSortProgressPercent, language, " +
                    "libraryViewMode, librarySortMode) " +
                    "VALUES ('prefs', 1, 0, 'DESCENDING', NULL, 75, 'pt-BR', 'GRID', 'RECENTLY_UPDATED')",
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(TEST_DB, 13, true, AppDatabase.MIGRATION_12_13)

        // A entrada que o app já tinha escrito prevalece — a migration não sobrescreve.
        val cursor = db.query("SELECT value FROM preferences WHERE `key` = 'global'")
        cursor.moveToFirst()
        assertEquals("{\"mode\":\"ASCENDING\",\"progressPercent\":50}", cursor.getString(0))
        assertEquals(1, cursor.count)
        cursor.close()
    }

    @Test
    fun `migra de v12 para v13 dropando series_sort_prefs`() {
        helper.createDatabase(TEST_DB, 12).close()

        val db = helper.runMigrationsAndValidate(TEST_DB, 13, true, AppDatabase.MIGRATION_12_13)

        val tableCursor = db.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'series_sort_prefs'")
        assertEquals(0, tableCursor.count)
        tableCursor.close()
    }

    @Test
    fun `downgrade de v13 para v12 recria series_sort_prefs vazia`() {
        helper.createDatabase(TEST_DB, 12).close()
        helper.runMigrationsAndValidate(TEST_DB, 13, true, AppDatabase.MIGRATION_12_13).close()

        val db = helper.runMigrationsAndValidate(TEST_DB, 12, false, AppDatabase.MIGRATION_13_12)

        val cursor = db.query("SELECT COUNT(*) FROM series_sort_prefs")
        cursor.moveToFirst()
        assertEquals(0, cursor.getInt(0))
        cursor.close()
    }
}
