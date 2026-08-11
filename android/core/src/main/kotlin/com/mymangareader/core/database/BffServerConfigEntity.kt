package com.mymangareader.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "bff_server_config")
data class BffServerConfigEntity(
    @PrimaryKey val id: String,
    val url: String,
    val priority: Int,
    val healthCheckPath: String = "/manga",
    val linkedKavitaServerConfigId: String? = null,
)
