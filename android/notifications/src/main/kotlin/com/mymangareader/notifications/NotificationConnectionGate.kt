package com.mymangareader.notifications

import android.util.Log
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "NotificationConnectionGate"

/**
 * Decides whether the notification foreground service should be connected right now — the two
 * conditions from this plan's README/Task 006: at least one [NotificationGroupEntity] has at
 * least one URL, AND the Android notification channel is enabled (Task 007 — the channel's own
 * state is the source of truth, not a `:preferences` flag). Both must hold; either becoming false
 * is a reason to stop.
 *
 * A small, pure decision extracted specifically so it's testable without a real Android `Service`
 * — [NotificationConnectionService] only consults [shouldConnect] before connecting; Task 007
 * reuses the same check to decide when to call `start()`/`stop()` automatically as groups/the
 * channel change.
 */
@Singleton
class NotificationConnectionGate
    @Inject
    constructor(
        private val notifications: Notifications,
        private val channelState: NotificationChannelState,
    ) {
        suspend fun shouldConnect(): Boolean {
            if (!channelState.isEnabled()) {
                Log.i(TAG, "shouldConnect() — false: notification channel is disabled")
                return false
            }
            val hasConfiguredGroup = notifications.groups.list().any { notifications.group(it.id).getUrls().isNotEmpty() }
            Log.i(TAG, "shouldConnect() — $hasConfiguredGroup: channel enabled, group with URLs configured=$hasConfiguredGroup")
            return hasConfiguredGroup
        }
    }
