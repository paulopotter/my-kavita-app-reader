package com.mymangareader.notifications

// Single source of truth for the `notifications` :preferences domain's keys — previously
// scattered as separate private constants in NotificationResolver.kt/NotificationDisplay.kt (Tasks
// 003/005), consolidated here now that the bridge (Task 007) needs to read/write the same keys
// from a different module (android/app/) without duplicating the literal strings.
object NotificationPreferenceKeys {
    const val DOMAIN = "notifications"
    const val SCOPE_ALL = "scopeAll"
    const val SCOPE_FOLLOWED_ONLY = "scopeFollowedOnly"
    const val GROUP_ACROSS_SERIES = "groupAcrossSeries"
    const val RETENTION_DAYS = "retentionDays"
}
