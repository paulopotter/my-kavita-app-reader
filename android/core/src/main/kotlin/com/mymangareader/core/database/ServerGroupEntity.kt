package com.mymangareader.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

// Generic infrastructure row — this table (and ServerUrlEntity) knows nothing about "providers",
// "Kavita", or any plugin; providerId is just a plain string column, and credentialsJson is an
// opaque blob whose internal shape is decided per-provider (e.g. Kavita's is {"apiKey": "..."}).
// Giving meaning to either (which providers exist, what fields their credentials need) is the
// :server module's job, not core's — see ServerPluginRegistration.credentialFields.
//
// credentialsJson is currently stored in plain text, same as AuthConfigEntity.apiKey/jwt already
// are — a known gap tracked in backlog item 016 (encryption), not resolved here.
@Entity(tableName = "server_group")
data class ServerGroupEntity(
    @PrimaryKey val id: String,
    val name: String,
    val providerId: String,
    val credentialsJson: String,
    val healthCheckPath: String,
)
