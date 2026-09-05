package com.mymangareader.notifications

/**
 * Boundary between `:notifications` (Kotlin-only) and the real Android notification channel's
 * enabled state — same idiom as [NotificationPoster]. Android's own channel importance is the one
 * source of truth for "are notifications actually on" (the app creates/names the channel once,
 * but only the user, via system Settings, can change whether it's enabled — the app cannot flip
 * it programmatically once the user has seen it). [NotificationChannelSync] (`android/app/`, Task
 * 007) implements this by reading `NotificationManager.getNotificationChannel(id).importance`.
 *
 * [NotificationResolver.shouldNotify] consults this instead of a `:preferences` flag — there is no
 * separate "enabled" preference to drift out of sync with the real channel.
 */
fun interface NotificationChannelState {
    fun isEnabled(): Boolean
}
