package com.mymangareader.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

// Generic infrastructure row, same convention as ServerGroupEntity — this table (and
// ExternalMetadataUrlEntity) knows nothing about "providers" or "personalBff"; providerId is
// just a plain string column, credentialsJson an opaque per-provider blob. linkedServerGroupId
// is a plain string column, no @ForeignKey enforced (server_group lives in a sibling Gradle
// module, :external-metadata-server never depends on :server) — null means this metadata group
// applies to any active server group.
@Entity(tableName = "external_metadata_group")
data class ExternalMetadataGroupEntity(
    @PrimaryKey val id: String,
    val name: String,
    val providerId: String,
    val credentialsJson: String,
    val healthCheckPath: String,
    val linkedServerGroupId: String? = null,
)
