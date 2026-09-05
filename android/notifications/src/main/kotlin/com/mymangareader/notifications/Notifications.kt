package com.mymangareader.notifications

import com.mymangareader.core.database.NotificationGroupDao
import com.mymangareader.core.database.NotificationGroupEntity
import com.mymangareader.core.database.NotificationHistoryDao
import com.mymangareader.core.database.NotificationHistoryEntity
import com.mymangareader.core.database.NotificationUrlDao
import com.mymangareader.core.database.NotificationUrlEntity
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

class NotificationsException(
    message: String,
) : Exception(message)

// Same "list as JSON column" convention already used by series_detail_cache.genresJson/tagsJson
// — a plain kotlinx.serialization Json instance, no custom (de)serialization helper.
private val historyListFormat = Json { ignoreUnknownKeys = true }

private fun requireNotBlank(
    fieldName: String,
    value: String?,
) {
    if (value?.isBlank() == true) throw NotificationsException("$fieldName must not be blank")
}

private fun requirePositive(
    fieldName: String,
    value: Int?,
) {
    if (value != null && value <= 0) throw NotificationsException("$fieldName must be positive")
}

private fun requireNotNegative(
    fieldName: String,
    value: Int?,
) {
    if (value != null && value < 0) throw NotificationsException("$fieldName must not be negative")
}

data class NotificationGroupInfo(
    val id: String,
    val name: String,
    val providerId: String,
    val topic: String,
)

data class NotificationUrlInfo(
    val id: String,
    val groupId: String,
    val url: String,
    val timeoutMs: Int,
    val priority: Int,
)

// A group's own identity plus its full list of URLs embedded — same shape/reasoning as
// ServerGroupFullInfo, for a caller that wants "everything about this group" without a separate
// getUrls() round trip.
data class NotificationGroupFullInfo(
    val id: String,
    val name: String,
    val providerId: String,
    val topic: String,
    val urls: List<NotificationUrlInfo>,
)

data class NewNotificationGroup(
    val name: String,
    val providerId: String,
    val topic: String,
)

data class NewNotificationUrl(
    val url: String,
    val timeoutMs: Int,
    val priority: Int,
)

data class NotificationHistoryItem(
    val id: String,
    val seriesId: String,
    val seriesName: String,
    val chapterIds: List<String>?,
    val chapterNumbers: List<String>?,
    val detectedAtMs: Long,
    val read: Boolean,
    val createdAtLocalMs: Long,
)

// [id] is the caller's already-computed deterministic dedup hash (Task 005's
// NotificationDisplay owns that computation — Notifications never derives it itself).
data class NewNotificationHistoryItem(
    val id: String,
    val seriesId: String,
    val seriesName: String,
    val chapterIds: List<String>?,
    val chapterNumbers: List<String>?,
    val detectedAtMs: Long,
)

/**
 * `:notifications`'s own Layer 2 public API — this task only proves the schema compiles and
 * round-trips (groups/URLs/history CRUD, thin passthroughs over the DAOs). No provider
 * resolution, no WebSocket connection, no series resolution/filtering — those arrive with the
 * plugin abstraction, the resolver, and the foreground service in later tasks of this same plan.
 */
@Singleton
class Notifications
    @Inject
    constructor(
        private val notificationGroupDao: NotificationGroupDao,
        private val notificationUrlDao: NotificationUrlDao,
        private val notificationHistoryDao: NotificationHistoryDao,
    ) {
        val groups: Groups =
            object : Groups {
                override suspend fun list(): List<NotificationGroupInfo> = notificationGroupDao.getAll().map { it.toInfo() }

                override suspend fun get(groupId: String): NotificationGroupInfo? = notificationGroupDao.getById(groupId)?.toInfo()

                override suspend fun add(group: NewNotificationGroup): NotificationGroupInfo {
                    requireNotBlank("name", group.name)
                    requireNotBlank("providerId", group.providerId)
                    requireNotBlank("topic", group.topic)
                    val entity =
                        NotificationGroupEntity(
                            id = UUID.randomUUID().toString(),
                            name = group.name,
                            providerId = group.providerId,
                            topic = group.topic,
                        )
                    notificationGroupDao.upsert(entity)
                    return entity.toInfo()
                }

                override suspend fun update(
                    groupId: String,
                    name: String?,
                    topic: String?,
                ): NotificationGroupInfo {
                    val existing =
                        notificationGroupDao.getById(groupId)
                            ?: throw NotificationsException("Notification group not found: $groupId")
                    requireNotBlank("name", name)
                    requireNotBlank("topic", topic)
                    val updated =
                        existing.copy(
                            name = name ?: existing.name,
                            topic = topic ?: existing.topic,
                        )
                    notificationGroupDao.upsert(updated)
                    return updated.toInfo()
                }

                override suspend fun remove(groupId: String) {
                    notificationUrlDao.deleteByGroupId(groupId)
                    notificationGroupDao.deleteById(groupId)
                }
            }

        fun group(groupId: String): Group = GroupHandle(groupId)

        val history: History =
            object : History {
                override suspend fun insertOrReplace(item: NewNotificationHistoryItem) {
                    notificationHistoryDao.insertOrReplace(
                        NotificationHistoryEntity(
                            id = item.id,
                            seriesId = item.seriesId,
                            seriesName = item.seriesName,
                            chapterIdsJson = item.chapterIds?.let { historyListFormat.encodeToString(ListSerializer(String.serializer()), it) },
                            chapterNumbersJson = item.chapterNumbers?.let { historyListFormat.encodeToString(ListSerializer(String.serializer()), it) },
                            detectedAtMs = item.detectedAtMs,
                            read = false,
                            createdAtLocalMs = System.currentTimeMillis(),
                        ),
                    )
                }

                override suspend fun listAll(): List<NotificationHistoryItem> = notificationHistoryDao.listAll().map { it.toItem() }

                override suspend fun markRead(id: String) = notificationHistoryDao.markRead(id)

                override suspend fun markAllRead() = notificationHistoryDao.markAllRead()

                override suspend fun delete(id: String) = notificationHistoryDao.delete(id)

                override suspend fun deleteOlderThan(epochMs: Long) = notificationHistoryDao.deleteOlderThan(epochMs)

                override suspend fun countUnread(): Int = notificationHistoryDao.countUnread()
            }

        interface Groups {
            suspend fun list(): List<NotificationGroupInfo>

            suspend fun get(groupId: String): NotificationGroupInfo?

            suspend fun add(group: NewNotificationGroup): NotificationGroupInfo

            suspend fun update(
                groupId: String,
                name: String? = null,
                topic: String? = null,
            ): NotificationGroupInfo

            suspend fun remove(groupId: String)
        }

        interface Group {
            suspend fun getUrls(): List<NotificationUrlInfo>

            suspend fun getInfo(): NotificationGroupFullInfo

            suspend fun addUrl(url: NewNotificationUrl): NotificationUrlInfo

            suspend fun updateUrl(
                urlId: String,
                url: String? = null,
                timeoutMs: Int? = null,
                priority: Int? = null,
            ): NotificationUrlInfo

            suspend fun removeUrl(urlId: String)
        }

        interface History {
            suspend fun insertOrReplace(item: NewNotificationHistoryItem)

            suspend fun listAll(): List<NotificationHistoryItem>

            suspend fun markRead(id: String)

            suspend fun markAllRead()

            suspend fun delete(id: String)

            suspend fun deleteOlderThan(epochMs: Long)

            suspend fun countUnread(): Int
        }

        private inner class GroupHandle(
            private val groupId: String,
        ) : Group {
            override suspend fun getUrls(): List<NotificationUrlInfo> = notificationUrlDao.getByGroupId(groupId).map { it.toInfo() }

            override suspend fun getInfo(): NotificationGroupFullInfo {
                val group =
                    notificationGroupDao.getById(groupId)
                        ?: throw NotificationsException("Notification group not found: $groupId")
                return NotificationGroupFullInfo(
                    id = group.id,
                    name = group.name,
                    providerId = group.providerId,
                    topic = group.topic,
                    urls = getUrls(),
                )
            }

            override suspend fun addUrl(url: NewNotificationUrl): NotificationUrlInfo {
                notificationGroupDao.getById(groupId) ?: throw NotificationsException("Notification group not found: $groupId")
                requireNotBlank("url", url.url)
                requirePositive("timeoutMs", url.timeoutMs)
                requireNotNegative("priority", url.priority)
                val entity =
                    NotificationUrlEntity(
                        id = UUID.randomUUID().toString(),
                        groupId = groupId,
                        url = url.url,
                        timeoutMs = url.timeoutMs,
                        priority = url.priority,
                    )
                notificationUrlDao.upsert(entity)
                return entity.toInfo()
            }

            override suspend fun updateUrl(
                urlId: String,
                url: String?,
                timeoutMs: Int?,
                priority: Int?,
            ): NotificationUrlInfo {
                val existing =
                    notificationUrlDao.getById(urlId)?.takeIf { it.groupId == groupId }
                        ?: throw NotificationsException("Notification url not found: $urlId in group $groupId")
                requireNotBlank("url", url)
                requirePositive("timeoutMs", timeoutMs)
                requireNotNegative("priority", priority)
                val updated =
                    existing.copy(
                        url = url ?: existing.url,
                        timeoutMs = timeoutMs ?: existing.timeoutMs,
                        priority = priority ?: existing.priority,
                    )
                notificationUrlDao.upsert(updated)
                return updated.toInfo()
            }

            override suspend fun removeUrl(urlId: String) {
                val existing =
                    notificationUrlDao.getById(urlId)?.takeIf { it.groupId == groupId }
                        ?: throw NotificationsException("Notification url not found: $urlId in group $groupId")
                notificationUrlDao.deleteById(existing.id)
            }
        }
    }

private fun NotificationGroupEntity.toInfo() =
    NotificationGroupInfo(
        id = id,
        name = name,
        providerId = providerId,
        topic = topic,
    )

private fun NotificationUrlEntity.toInfo() =
    NotificationUrlInfo(
        id = id,
        groupId = groupId,
        url = url,
        timeoutMs = timeoutMs,
        priority = priority,
    )

private fun NotificationHistoryEntity.toItem() =
    NotificationHistoryItem(
        id = id,
        seriesId = seriesId,
        seriesName = seriesName,
        chapterIds = chapterIdsJson?.let { historyListFormat.decodeFromString(ListSerializer(String.serializer()), it) },
        chapterNumbers = chapterNumbersJson?.let { historyListFormat.decodeFromString(ListSerializer(String.serializer()), it) },
        detectedAtMs = detectedAtMs,
        read = read,
        createdAtLocalMs = createdAtLocalMs,
    )
