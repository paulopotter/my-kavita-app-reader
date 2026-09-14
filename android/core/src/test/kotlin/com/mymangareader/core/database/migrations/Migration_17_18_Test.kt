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

private const val TEST_DB = "migration-test-17-18"

@RunWith(RobolectricTestRunner::class)
class Migration_17_18_Test {
    @get:Rule
    val helper: MigrationTestHelper =
        MigrationTestHelper(
            InstrumentationRegistry.getInstrumentation(),
            AppDatabase::class.java,
            emptyList(),
            FrameworkSQLiteOpenHelperFactory(),
        )

    // No data preserved either direction (see Migration_17_18's own doc) — this only proves the
    // resulting schema is valid and a fresh row round-trips through it, not that anything survives
    // the migration itself.
    @Test
    fun `migra de v17 para v18 e o schema novo aceita chapterId e chapterNumber singulares`() {
        helper.createDatabase(TEST_DB, 17).close()

        val db = helper.runMigrationsAndValidate(TEST_DB, 18, true, AppDatabase.MIGRATION_17_18)

        db.execSQL(
            "INSERT INTO notification_history (id, seriesId, seriesName, chapterId, chapterNumber, detectedAtMs, read, createdAtLocalMs) " +
                "VALUES ('h1', 's1', 'One Piece', '101', '1120', 1000, 0, 1000)",
        )
        val cursor = db.query("SELECT chapterId, chapterNumber FROM notification_history WHERE id = 'h1'")
        cursor.moveToFirst()
        assertEquals("101", cursor.getString(cursor.getColumnIndexOrThrow("chapterId")))
        assertEquals("1120", cursor.getString(cursor.getColumnIndexOrThrow("chapterNumber")))
        cursor.close()
    }

    @Test
    fun `downgrade de v18 para v17 recria o schema antigo, com as colunas de lista em JSON`() {
        helper.createDatabase(TEST_DB, 17).close()
        helper.runMigrationsAndValidate(TEST_DB, 18, true, AppDatabase.MIGRATION_17_18).close()

        val db = helper.runMigrationsAndValidate(TEST_DB, 17, false, AppDatabase.MIGRATION_18_17)

        db.execSQL(
            "INSERT INTO notification_history (id, seriesId, seriesName, chapterIdsJson, chapterNumbersJson, detectedAtMs, read, createdAtLocalMs) " +
                "VALUES ('h1', 's1', 'One Piece', NULL, NULL, 1000, 0, 1000)",
        )
        val cursor = db.query("SELECT chapterIdsJson FROM notification_history WHERE id = 'h1'")
        cursor.moveToFirst()
        assertNull(cursor.getString(cursor.getColumnIndexOrThrow("chapterIdsJson")))
        cursor.close()
    }
}
