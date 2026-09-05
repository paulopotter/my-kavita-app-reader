package com.mymangareader.notifications

import com.mymangareader.preferences.Preferences
import javax.inject.Inject
import javax.inject.Singleton

private const val KEY_ENABLED = "enabled"

/**
 * Decides whether the notification foreground service should be connected right now — the two
 * conditions from this plan's README/Task 006: at least one [NotificationGroupEntity] has at
 * least one URL, AND the `enabled` preference is `true`. Both must hold; either becoming false is
 * a reason to stop.
 *
 * A small, pure decision extracted specifically so it's testable without a real Android `Service`
 * — [NotificationConnectionService] only consults [shouldConnect] before connecting; Task 007
 * reuses the same check to decide when to call `start()`/`stop()` automatically as groups/toggle
 * are written from RN.
 */
@Singleton
class NotificationConnectionGate
    @Inject
    constructor(
        private val notifications: Notifications,
        private val preferences: Preferences,
    ) {
        suspend fun shouldConnect(): Boolean {
            if (preferences.get(KEY_ENABLED)?.value != "true") return false
            return notifications.groups.list().any { notifications.group(it.id).getUrls().isNotEmpty() }
        }
    }
