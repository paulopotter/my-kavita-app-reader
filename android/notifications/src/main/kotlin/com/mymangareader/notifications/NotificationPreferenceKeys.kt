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
    // Presentation-only, RN-side (config/notifications) — never read by :notifications/:app.
    // When true, the in-app history list visually collapses rows for the same serial that arrived
    // within COLLAPSE_WINDOW_MS of each other into one entry; the underlying rows are always
    // stored separately either way (see NotificationHistoryEntity's own doc). Default false —
    // every row shows individually unless the user opts in.
    const val COLLAPSE_SERIAL_CHAPTERS_NOTIFICATION = "collapseSerialChaptersNotification"
}
