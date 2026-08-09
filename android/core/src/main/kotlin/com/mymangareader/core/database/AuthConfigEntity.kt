package com.mymangareader.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "auth_config")
data class AuthConfigEntity(
    @PrimaryKey val id: String = "auth",
    val apiKey: String,
    val jwt: String? = null,
)
