package com.mymangareader.core.database.migrations

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

// Task 024 — chapter sort preferences move to the generic `preferences` table (Preferences,
// :preferences module) as their single source of truth, replacing both series_sort_prefs (the
// per-series override) and ui_preferences' own chapterSort* columns (the global default) — the
// two disconnected sources ChapterSortSettingsScreen (Config) and the legacy SeriesDetailScreen
// used to read/write independently before both were migrated to ChaptersTool.sort. Same JSON
// shape ChaptersTool.sort.get/put already read/write: {"mode":"...","fixedThreshold":<num
// or omitted>,"progressPercent":<int>} — built with plain SQL string concatenation since a Room
// migration has no access to kotlinx.serialization; the shape is small and stable enough that
// this is safe.
//
// No data migration on the way back (downgrade just recreates the empty tables/columns) —
// Migration_11_12's own precedent for the same asymmetry.
val Migration_12_13 = object : Migration(12, 13) {
    override fun migrate(db: SupportSQLiteDatabase) {
        val now = System.currentTimeMillis()

        // Per-series override → preferences (key = seriesId, domain = 'chapterSortPrefs').
        db.execSQL(
            """
            INSERT INTO preferences (`key`, variant, value, domain, updatedAtEpochMs)
            SELECT
                seriesId,
                '',
                '{"mode":"' || chapterSortMode || '"' ||
                    CASE WHEN chapterSortFixedThreshold IS NOT NULL
                         THEN ',"fixedThreshold":' || chapterSortFixedThreshold
                         ELSE '' END ||
                    ',"progressPercent":' || chapterSortProgressPercent || '}',
                'chapterSortPrefs',
                $now
            FROM series_sort_prefs
            """.trimIndent(),
        )

        // Global default → preferences (key = 'global', same domain) — only the single
        // ui_preferences row (id = 'prefs') ever exists.
        db.execSQL(
            """
            INSERT INTO preferences (`key`, variant, value, domain, updatedAtEpochMs)
            SELECT
                'global',
                '',
                '{"mode":"' || chapterSortMode || '"' ||
                    CASE WHEN chapterSortFixedThreshold IS NOT NULL
                         THEN ',"fixedThreshold":' || chapterSortFixedThreshold
                         ELSE '' END ||
                    ',"progressPercent":' || chapterSortProgressPercent || '}',
                'chapterSortPrefs',
                $now
            FROM ui_preferences
            WHERE id = 'prefs'
            """.trimIndent(),
        )

        db.execSQL("DROP TABLE IF EXISTS series_sort_prefs")
    }
}

// Downgrade path: recreates series_sort_prefs empty — no attempt to reverse the data copy (same
// asymmetry Migration_11_10/Migration_12_11 already accepted for their own tables).
val Migration_13_12 = object : Migration(13, 12) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS series_sort_prefs (
                seriesId TEXT NOT NULL PRIMARY KEY,
                chapterSortMode TEXT NOT NULL,
                chapterSortFixedThreshold REAL,
                chapterSortProgressPercent INTEGER NOT NULL DEFAULT 50
            )
            """.trimIndent(),
        )
    }
}
