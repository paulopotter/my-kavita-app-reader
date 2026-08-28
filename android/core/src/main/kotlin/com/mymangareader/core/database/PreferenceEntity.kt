package com.mymangareader.core.database

import androidx.room.Entity

// The single generic table backing Preferences (Kotlin, :preferences module) — value is an
// opaque, caller-serialized string (Preferences itself never parses it), same convention as
// CacheEntity's value/domain. Unlike CacheEntity, there is no ttlMs/expiresAtEpochMs/
// lastAccessedAtEpochMs: a preference is a source of truth, not a recomputable value — nothing
// here is ever purged by age, only overwritten (put) or removed on purpose (delete).
//
// variant/key together identify one entry — same convention as CacheEntity: variant names which
// parameter(s) a value's shape depends on (e.g. a per-series preference uses variant = seriesId),
// while key carries the entity id when there is one (a global preference uses key = "" and puts
// the distinguishing value in variant instead — see ChapterSortPrefs' own design notes for the
// concrete case). Primary key is (key, variant) together — key alone is not unique once two
// variants of the same entity can coexist.
@Entity(tableName = "preferences", primaryKeys = ["key", "variant"])
data class PreferenceEntity(
    val key: String,
    val variant: String,
    val value: String,
    val domain: String,
    val updatedAtEpochMs: Long,
)
