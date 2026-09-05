package com.mymangareader.notifications

import com.mymangareader.core.database.FollowedSeriesDao
import com.mymangareader.notifications.plugins.RawNotificationEvent
import com.mymangareader.preferences.Preferences
import com.mymangareader.server.Server
import javax.inject.Inject
import javax.inject.Singleton

private const val PREFERENCES_DOMAIN = "notifications"
private const val KEY_ENABLED = "enabled"
private const val KEY_SCOPE_ALL = "scopeAll"
private const val KEY_SCOPE_FOLLOWED_ONLY = "scopeFollowedOnly"

/**
 * One series-level event already resolved to a local `seriesId` — [RawNotificationEvent] before
 * this only carries `seriesId?`/`seriesName`, either of which might not exist locally yet.
 */
data class ResolvedSeriesEvent(
    val seriesId: String,
    val seriesName: String,
    val chapterIds: List<String>?,
    val chapterNumbers: List<String>?,
    val detectedAtMs: Long,
)

/**
 * Resolves a raw ntfy event to a local series (Task 002's [RawNotificationEvent] carries an
 * *unresolved* `seriesId?`/`seriesName` pair) and decides whether that resolved event should
 * actually become a visible notification — README decisions 5 and 6. Runs entirely in Kotlin,
 * ahead of [com.mymangareader.notifications.plugins.ntfy.NtfyPlugin]'s foreground-service
 * consumer (Task 006), with no RN involvement in this hot path.
 */
@Singleton
class NotificationResolver
    @Inject
    constructor(
        private val server: Server,
        private val followedSeriesDao: FollowedSeriesDao,
        private val preferences: Preferences,
    ) {
        // [seriesId] present → resolved directly, no network/listing lookup needed. Absent →
        // exact [seriesName] match against the series listing Server already exposes (same data
        // SerialsService.list reaches on the RN side) — never re-fetched/re-derived by this
        // resolver itself, per the "ask the domain, don't recompute it" rule. Exactly one match →
        // resolved; zero or more than one → discarded (null), never guessed.
        suspend fun resolve(event: RawNotificationEvent): ResolvedSeriesEvent? {
            val seriesId =
                event.seriesId ?: run {
                    val matches =
                        server.serials
                            .list()
                            .data.serials
                            .filter { it.name == event.seriesName }
                    if (matches.size != 1) return null
                    matches.first().id
                }
            return ResolvedSeriesEvent(
                seriesId = seriesId,
                seriesName = event.seriesName,
                chapterIds = event.chapterIds,
                chapterNumbers = event.chapterNumbers,
                detectedAtMs = event.detectedAtMs,
            )
        }

        // false unless enabled is true. Otherwise true if scopeAll is true, or (the series is in
        // Following AND scopeFollowedOnly is true) — see README decision 6. scopeAll/
        // scopeFollowedOnly are UI-level mutually exclusive (Task 007 enforces that in the config
        // screen), but this function never assumes that invariant: both true is evaluated as
        // written below, which simply behaves as "notify all".
        suspend fun shouldNotify(resolved: ResolvedSeriesEvent): Boolean {
            if (!readFlag(KEY_ENABLED)) return false
            if (readFlag(KEY_SCOPE_ALL)) return true
            if (!readFlag(KEY_SCOPE_FOLLOWED_ONLY)) return false
            return followedSeriesDao.isFollowed(resolved.seriesId)
        }

        private suspend fun readFlag(key: String): Boolean = preferences.get(key)?.value == "true"
    }
