package com.mymangareader.notifications

import com.mymangareader.preferences.Preferences
import javax.inject.Inject
import javax.inject.Singleton

private const val MS_PER_DAY = 24L * 60 * 60 * 1000

// Fire-and-forget boot cleanup — deletes history items older than the user's retentionDays
// preference (NotificationPreferenceKeys.RETENTION_DAYS). No retentionDays set yet → nothing to
// purge (never guesses a default here; the config screen's own default already writes the
// preference on first read). `now` is injected so the exact cutoff boundary is testable without
// mocking System.currentTimeMillis().
@Singleton
class NotificationRetentionPurge
    @Inject
    constructor(
        private val notifications: Notifications,
        private val preferences: Preferences,
    ) {
        suspend fun purge(now: Long = System.currentTimeMillis()) {
            val retentionDays = preferences.get(NotificationPreferenceKeys.RETENTION_DAYS)?.value?.toIntOrNull() ?: return
            val cutoffMs = now - retentionDays * MS_PER_DAY
            notifications.history.deleteOlderThan(cutoffMs)
        }
    }
