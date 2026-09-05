package com.mymangareader.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

// One network path to reach a NotificationGroupEntity (e.g. a high-priority LAN host and a WAN
// fallback for the same ntfy topic) — mirrors ServerUrlEntity. groupId is a plain string column,
// no @ForeignKey enforced, same convention already used by server_url.groupId. linkedServerUrlId
// mirrors ExternalMetadataUrlEntity's own column — null means this notification URL applies to
// any URL within the owning group's linked server group (or any server at all, if the group
// itself is unlinked).
@Entity(tableName = "notification_url")
data class NotificationUrlEntity(
    @PrimaryKey val id: String,
    val groupId: String,
    val url: String,
    val timeoutMs: Int,
    val priority: Int,
    val linkedServerUrlId: String? = null,
)
