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

private const val TEST_DB = "migration-test"

@RunWith(RobolectricTestRunner::class)
class Migration_4_5_Test {

    @get:Rule
    val helper: MigrationTestHelper = MigrationTestHelper(
        InstrumentationRegistry.getInstrumentation(),
        AppDatabase::class.java,
        emptyList(),
        FrameworkSQLiteOpenHelperFactory(),
    )

    @Test
    fun `migra de v4 para v5 sem perder dados existentes e cria series_sort_prefs`() {
        // Cria o banco na versão 4 e insere dados em uma tabela pré-existente,
        // para confirmar que a migration não é destrutiva.
        helper.createDatabase(TEST_DB, 4).apply {
            execSQL(
                "INSERT INTO followed_series (seriesId, followedAtMs) VALUES ('10', 1000)",
            )
            close()
        }

        val db = helper.runMigrationsAndValidate(TEST_DB, 5, true, AppDatabase.MIGRATION_4_5)

        // Dado antigo preservado.
        val cursor = db.query("SELECT seriesId FROM followed_series")
        assertEquals(1, cursor.count)
        cursor.close()

        // Nova tabela existe e aceita insert com o schema esperado.
        db.execSQL(
            "INSERT INTO series_sort_prefs (seriesId, chapterSortMode, chapterSortFixedThreshold, chapterSortProgressPercent) " +
                "VALUES ('10', 'DESCENDING', 5.0, 80)",
        )
        val prefsCursor = db.query("SELECT chapterSortMode FROM series_sort_prefs WHERE seriesId = '10'")
        assertEquals(1, prefsCursor.count)
        prefsCursor.close()
    }
}
