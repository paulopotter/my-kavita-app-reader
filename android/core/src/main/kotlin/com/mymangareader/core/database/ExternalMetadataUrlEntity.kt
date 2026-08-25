package com.mymangareader.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

// One network path to reach an ExternalMetadataGroupEntity, same convention as ServerUrlEntity.
// linkedServerUrlId is only meaningful when the owning group already has a
// linkedServerGroupId — null means this metadata URL applies to any URL within that linked
// server group (or, if the group itself is unlinked, to any server at all).
@Entity(tableName = "external_metadata_url")
data class ExternalMetadataUrlEntity(
    @PrimaryKey val id: String,
    val groupId: String,
    val url: String,
    val timeoutMs: Int,
    val priority: Int,
    val linkedServerUrlId: String? = null,
)
