package com.mymangareader.preferences

import kotlinx.serialization.Serializable

// value/updatedAtEpochMs are always returned on a hit — there is no isExpired concept here (see
// PreferenceEntity's own doc for why): a preference is a source of truth, never stale by design.
@Serializable
data class PreferenceEntry(
    val value: String,
    val updatedAtEpochMs: Long,
)

// What Preferences.put() hands back after a successful write — same "describes provenance, not
// the payload" role CacheDescriptor plays for Cache (:cache). No `mode` field: unlike Cache,
// Preferences has a single backend (Room), so there's nothing to distinguish.
@Serializable
data class PreferenceDescriptor(
    val key: String,
    val variant: String,
    val domain: String,
    val updatedAtEpochMs: Long,
)
