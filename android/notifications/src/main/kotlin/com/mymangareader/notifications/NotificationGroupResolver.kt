package com.mymangareader.notifications

import com.mymangareader.core.database.NotificationGroupDao
import com.mymangareader.core.database.NotificationUrlDao
import com.mymangareader.core.database.NotificationUrlEntity
import com.mymangareader.notifications.plugins.NotificationUrl
import com.mymangareader.server.Server
import com.mymangareader.tools.network.UrlCandidate
import com.mymangareader.tools.network.UrlSelector
import javax.inject.Inject
import javax.inject.Singleton

class NotificationGroupResolverException(
    message: String,
) : Exception(message)

// ntfy's own documented liveness endpoint — used as every candidate's healthCheckPath so
// UrlSelector (built for a bare "GET <url><healthCheckPath>" check) works unmodified for this
// provider too, same as it already does for :server/:external-metadata-server.
private const val NTFY_HEALTH_CHECK_PATH = "/v1/health"

private const val DEFAULT_TIMEOUT_MS = 8_000

/**
 * Resolves which [com.mymangareader.core.database.NotificationGroupEntity] (and, within it, which
 * reachable URL) a notification connection should use right now — same two-level algorithm as
 * [com.mymangareader.externalmetadataserver.ExternalMetadataServer]'s own `resolveNoHint`:
 *
 * 1. If a Kavita server group is active, and a notification group is linked to it
 *    (`linkedServerGroupId`), try that group's own URLs first.
 * 2. If there's no link, or every URL in that linked group is unreachable, fall back to the pool
 *    of every URL belonging to a group with no link at all (`linkedServerGroupId == null`) —
 *    pooled across groups, not tried group-by-group, since an unlinked group is by definition
 *    interchangeable with any other for this purpose.
 *
 * Throws if neither level yields a healthy URL — the caller (Task 006's
 * `NotificationConnectionService`) decides what "no group could be resolved" means for its own
 * start/stop lifecycle.
 */
@Singleton
class NotificationGroupResolver
    @Inject
    constructor(
        private val notificationGroupDao: NotificationGroupDao,
        private val notificationUrlDao: NotificationUrlDao,
        private val urlSelector: UrlSelector,
        private val server: Server,
    ) {
        suspend fun resolveActiveUrl(): NotificationUrl {
            val allGroups = notificationGroupDao.getAll()

            val kavitaServerGroupId = server.getActiveGroupId()
            val linkedGroupId = kavitaServerGroupId?.let { id -> allGroups.firstOrNull { it.linkedServerGroupId == id }?.id }

            if (linkedGroupId != null) {
                val linkedUrls = notificationUrlDao.getByGroupId(linkedGroupId)
                val winner = urlSelector.getActiveUrl(linkedUrls.map { it.toUrlCandidate() })
                winner.getOrNull()?.let { winningUrl ->
                    return toNotificationUrl(linkedGroupId, linkedUrls, winningUrl)
                }
            }

            val unlinkedGroups = allGroups.filter { it.linkedServerGroupId == null }
            val urlsByGroup = unlinkedGroups.associate { it.id to notificationUrlDao.getByGroupId(it.id) }
            val poolCandidates = urlsByGroup.values.flatten().map { it.toUrlCandidate() }
            val winningUrl =
                urlSelector.getActiveUrl(poolCandidates).getOrElse {
                    throw NotificationGroupResolverException("No healthy notification group could be resolved")
                }
            val winningGroupId = urlsByGroup.entries.first { (_, urls) -> urls.any { it.url.trimEnd('/') == winningUrl } }.key
            return toNotificationUrl(winningGroupId, urlsByGroup.getValue(winningGroupId), winningUrl)
        }

        private suspend fun toNotificationUrl(
            groupId: String,
            groupUrls: List<NotificationUrlEntity>,
            winningUrl: String,
        ): NotificationUrl {
            val group =
                notificationGroupDao.getById(groupId)
                    ?: throw NotificationGroupResolverException("Notification group not found: $groupId")
            val timeoutMs = groupUrls.firstOrNull { it.url.trimEnd('/') == winningUrl }?.timeoutMs ?: DEFAULT_TIMEOUT_MS
            return NotificationUrl(url = winningUrl, topic = group.topic, timeoutMs = timeoutMs)
        }
    }

private fun NotificationUrlEntity.toUrlCandidate() =
    UrlCandidate(
        id = id,
        url = url,
        timeoutMs = timeoutMs,
        priority = priority,
        healthCheckPath = NTFY_HEALTH_CHECK_PATH,
    )
