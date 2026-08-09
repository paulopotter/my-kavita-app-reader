package com.mymangareader.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "server_config")
data class ServerConfigEntity(
    @PrimaryKey val id: String,
    val url: String,
    val timeoutMs: Int,
    val priority: Int,
    val healthCheckPath: String,
)
