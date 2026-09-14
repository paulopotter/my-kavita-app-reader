package com.mymangareader.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

// One row per CHAPTER, always — never collapsed/overwritten at the storage layer. A single
// publisher event carrying N chapters for the same serial is exploded into N rows before it ever
// reaches this table (NotificationResolver's own concern — see its own doc on the explode step);
// a row with neither chapterId nor chapterNumber only happens when the publisher's event carried
// no chapter detail at all ("something changed on this serial", no chapter identified). Two
// separate publisher events for the same serial — even seconds apart — are, for the same reason,
// always separate rows too. Collapsing rows that arrived close together into one visual entry is
// an RN-side presentation concern (the collapseSerialChaptersNotification preference), not
// something this table ever does — Room only ever stores exactly what was resolved, one insert
// per chapter (or per event, when no chapter was identified). `id` is a fresh UUID per row
// (NotificationResolver/NotificationPoster's own concern), not derived from the serial's own id —
// nothing here assumes any determinism from it.
//
// Column names (seriesId/seriesName) predate this module's "serial, not series" naming
// convention — kept as-is to avoid a schema migration for a pure rename; every Kotlin-side
// caller/property outside this @Entity uses `serial*` naming instead.
@Entity(tableName = "notification_history")
data class NotificationHistoryEntity(
    @PrimaryKey val id: String,
    val seriesId: String,
    val seriesName: String,
    val chapterId: String?,
    val chapterNumber: String?,
    val detectedAtMs: Long,
    val read: Boolean,
    val createdAtLocalMs: Long,
)
