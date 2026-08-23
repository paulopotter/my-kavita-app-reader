package com.mymangareader.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

// One network path to reach a ServerGroupEntity (e.g. LAN vs. external domain for the same
// physical server) — groupId is a plain string column, no @ForeignKey enforced, same convention
// already used by BffServerConfigEntity.linkedKavitaServerConfigId.
@Entity(tableName = "server_url")
data class ServerUrlEntity(
    @PrimaryKey val id: String,
    val groupId: String,
    val url: String,
    val timeoutMs: Int,
    val priority: Int,
)
