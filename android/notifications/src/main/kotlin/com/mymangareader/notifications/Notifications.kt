package com.mymangareader.notifications

import com.mymangareader.core.database.NotificationGroupDao
import com.mymangareader.core.database.NotificationGroupEntity
import com.mymangareader.core.database.NotificationHistoryDao
import com.mymangareader.core.database.NotificationHistoryEntity
import com.mymangareader.core.database.NotificationUrlDao
import com.mymangareader.core.database.NotificationUrlEntity
import com.mymangareader.tools.network.UrlCandidate
import com.mymangareader.tools.network.UrlProbeResult
import com.mymangareader.tools.network.UrlSelector
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

class NotificationsException(
    message: String,
) : Exception(message)

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
    val linkedServerGroupId: String?,
)

data class NotificationUrlInfo(
    val id: String,
    val groupId: String,
    val url: String,
    val timeoutMs: Int,
    val priority: Int,
    val linkedServerUrlId: String?,
)

// A group's own identity plus its full list of URLs embedded — same shape/reasoning as
// ServerGroupFullInfo, for a caller that wants "everything about this group" without a separate
// getUrls() round trip.
data class NotificationGroupFullInfo(
    val id: String,
    val name: String,
    val providerId: String,
    val topic: String,
    val linkedServerGroupId: String?,
    val urls: List<NotificationUrlInfo>,
)

data class NewNotificationGroup(
    val name: String,
    val providerId: String,
    val topic: String,
    val linkedServerGroupId: String? = null,
)

data class NewNotificationUrl(
    val url: String,
    val timeoutMs: Int,
    val priority: Int,
    val linkedServerUrlId: String? = null,
)

data class NotificationHistoryItem(
    val id: String,
    val seriesId: String,
    val seriesName: String,
    val chapterId: String?,
    val chapterNumber: String?,
    val detectedAtMs: Long,
    val read: Boolean,
    val createdAtLocalMs: Long,
)

// One row per CHAPTER, always — see NotificationHistoryEntity's own doc. A caller with a batch of
// N chapters is expected to already have exploded it into N of these (NotificationResolver's own
// explode step — see its own doc); this type itself never carries more than one chapter. No [id]
// here: History.insert mints a fresh one (UUID) for every call, since there's no notion of "reuse
// this id to replace an existing row".
data class NewNotificationHistoryItem(
    val seriesId: String,
    val seriesName: String,
    val chapterId: String?,
    val chapterNumber: String?,
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
        private val urlSelector: UrlSelector,
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
                            linkedServerGroupId = group.linkedServerGroupId,
                        )
                    notificationGroupDao.upsert(entity)
                    return entity.toInfo()
                }

                override suspend fun update(
                    groupId: String,
                    name: String?,
                    topic: String?,
                    linkedServerGroupId: String?,
                    clearLinkedServerGroupId: Boolean,
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
                            linkedServerGroupId =
                                when {
                                    clearLinkedServerGroupId -> null
                                    linkedServerGroupId != null -> linkedServerGroupId
                                    else -> existing.linkedServerGroupId
                                },
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
                override suspend fun insert(item: NewNotificationHistoryItem): String {
                    val id = UUID.randomUUID().toString()
                    notificationHistoryDao.insert(
                        NotificationHistoryEntity(
                            id = id,
                            seriesId = item.seriesId,
                            seriesName = item.seriesName,
                            chapterId = item.chapterId,
                            chapterNumber = item.chapterNumber,
                            detectedAtMs = item.detectedAtMs,
                            read = false,
                            createdAtLocalMs = System.currentTimeMillis(),
                        ),
                    )
                    return id
                }

                override suspend fun listAll(): List<NotificationHistoryItem> = notificationHistoryDao.listAll().map { it.toItem() }

                override suspend fun markRead(id: String) = notificationHistoryDao.markRead(id)

                override suspend fun markReadByChapter(
                    seriesId: String,
                    chapterId: String,
                ) = notificationHistoryDao.markReadByChapter(seriesId, chapterId)

                override suspend fun markSerialRead(seriesId: String) = notificationHistoryDao.markSerialRead(seriesId)

                override suspend fun markAllRead() = notificationHistoryDao.markAllRead()

                override suspend fun delete(id: String) = notificationHistoryDao.delete(id)

                override suspend fun deleteOlderThan(epochMs: Long) = notificationHistoryDao.deleteOlderThan(epochMs)

                override suspend fun countUnread(): Int = notificationHistoryDao.countUnread()
            }

        interface Groups {
            suspend fun list(): List<NotificationGroupInfo>

            suspend fun get(groupId: String): NotificationGroupInfo?

            suspend fun add(group: NewNotificationGroup): NotificationGroupInfo

            // linkedServerGroupId: pass a value to (re)link, omit to leave unchanged, or pass
            // clearLinkedServerGroupId=true to unlink — plain `null` alone is ambiguous between
            // "don't touch it" and "clear it", so unlinking needs its own explicit flag.
            suspend fun update(
                groupId: String,
                name: String? = null,
                topic: String? = null,
                linkedServerGroupId: String? = null,
                clearLinkedServerGroupId: Boolean = false,
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
                linkedServerUrlId: String? = null,
            ): NotificationUrlInfo

            suspend fun removeUrl(urlId: String)

            // Point check on a typed-in URL — does not persist or change which URL is active.
            // Mirrors Server.group.urls.testUrl/ExternalMetadataServer's own; timeoutMs defaults
            // to the same 5s the config screen uses for new URLs.
            suspend fun testUrl(
                url: String,
                timeoutMs: Int = 5000,
            ): UrlProbeResult

            // Tests every configured URL for this group, highest priority (lowest number) first,
            // and returns the one that actually answered its health check — always a fresh check,
            // ignoring UrlSelector's 15-minute cache, since "test my notification server" means
            // "check right now," not "trust what was last resolved." Mirrors
            // Server.group.urls.validateUrls's own. Throws if none responded.
            suspend fun validateUrls(): NotificationUrlInfo
        }

        interface History {
            // Returns the freshly-minted id for the inserted row — the caller (NotificationDisplay)
            // needs it to build the system notification's own PendingIntent/notification id.
            suspend fun insert(item: NewNotificationHistoryItem): String

            suspend fun listAll(): List<NotificationHistoryItem>

            suspend fun markRead(id: String)

            // Marks read by WHAT was consumed rather than by row id — the caller (RN, reacting to
            // a chapter/serial actually being opened) never knows which row announced it. See
            // NotificationHistoryDao's own doc for why each only touches its own kind of row.
            suspend fun markReadByChapter(
                seriesId: String,
                chapterId: String,
            )

            suspend fun markSerialRead(seriesId: String)

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
                    linkedServerGroupId = group.linkedServerGroupId,
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
                        linkedServerUrlId = url.linkedServerUrlId,
                    )
                notificationUrlDao.upsert(entity)
                return entity.toInfo()
            }

            override suspend fun updateUrl(
                urlId: String,
                url: String?,
                timeoutMs: Int?,
                priority: Int?,
                linkedServerUrlId: String?,
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
                        linkedServerUrlId = linkedServerUrlId ?: existing.linkedServerUrlId,
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

            override suspend fun testUrl(
                url: String,
                timeoutMs: Int,
            ): UrlProbeResult {
                notificationGroupDao.getById(groupId) ?: throw NotificationsException("Notification group not found: $groupId")
                requireNotBlank("url", url)
                requirePositive("timeoutMs", timeoutMs)
                return urlSelector.probe(
                    UrlCandidate(
                        id = "probe",
                        url = url,
                        timeoutMs = timeoutMs,
                        priority = 0,
                        healthCheckPath = NTFY_HEALTH_CHECK_PATH,
                    ),
                )
            }

            override suspend fun validateUrls(): NotificationUrlInfo {
                notificationGroupDao.getById(groupId) ?: throw NotificationsException("Notification group not found: $groupId")
                val candidates =
                    notificationUrlDao.getByGroupId(groupId).map {
                        UrlCandidate(
                            id = it.id,
                            url = it.url,
                            timeoutMs = it.timeoutMs,
                            priority = it.priority,
                            healthCheckPath = NTFY_HEALTH_CHECK_PATH,
                        )
                    }
                val winningUrl =
                    urlSelector.invalidateAndReselect(candidates).getOrElse {
                        throw NotificationsException("Could not resolve a healthy URL for group $groupId: ${it.message}")
                    }
                return notificationUrlDao.getByGroupId(groupId).first { it.url.trimEnd('/') == winningUrl }.toInfo()
            }
        }
    }

private fun NotificationGroupEntity.toInfo() =
    NotificationGroupInfo(
        id = id,
        name = name,
        providerId = providerId,
        topic = topic,
        linkedServerGroupId = linkedServerGroupId,
    )

private fun NotificationUrlEntity.toInfo() =
    NotificationUrlInfo(
        id = id,
        groupId = groupId,
        url = url,
        timeoutMs = timeoutMs,
        priority = priority,
        linkedServerUrlId = linkedServerUrlId,
    )

private fun NotificationHistoryEntity.toItem() =
    NotificationHistoryItem(
        id = id,
        seriesId = seriesId,
        seriesName = seriesName,
        chapterId = chapterId,
        chapterNumber = chapterNumber,
        detectedAtMs = detectedAtMs,
        read = read,
        createdAtLocalMs = createdAtLocalMs,
    )
