package com.mymangareader.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

// Generic infrastructure row — mirrors ServerGroupEntity's shape. A group is one logical
// notification connection (today, always the ntfy provider — providerId is a plain string
// column, same "this table knows nothing about which providers exist" convention as
// ServerGroupEntity.providerId); its candidate URLs live in NotificationUrlEntity, same split as
// server_group/server_url.
@Entity(tableName = "notification_group")
data class NotificationGroupEntity(
    @PrimaryKey val id: String,
    val name: String,
    val providerId: String,
    val topic: String,
)
