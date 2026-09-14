package com.mymangareader.notifications

// Where tapping the SYSTEM notification for a resolved batch should take the user — decided here
// (Kotlin-only, provider-agnostic) rather than in NotificationDisplay (`android/app/`), which only
// ever executes this decision against the real Android APIs (PendingIntent, deep link URI). Same
// "this module decides the data, the app layer talks to the OS" split as NotificationPoster.
//
// Always resolved from the SAME batch that produced the system notification, never from anything
// accumulated in history — the tray always reflects exactly what was just detected, regardless of
// the collapseSerialChaptersNotification preference (which only ever affects how the in-app
// history list PRESENTS past rows, never what a fresh batch's own tap does).
sealed interface NotificationTapTarget {
    data class Chapter(val serialId: String, val chapterId: String) : NotificationTapTarget

    data class Serial(val serialId: String) : NotificationTapTarget
}

// Exactly one known chapter → the reader can open straight into it. Anything else (a batch of N,
// or no chapter id known at all) has no single chapter to land on, so the serial's own screen is
// the only destination that's always correct.
fun ResolvedSeriesEvent.tapTarget(): NotificationTapTarget {
    val singleKnownChapterId = chapterIds?.singleOrNull()
    return if (singleKnownChapterId != null) {
        NotificationTapTarget.Chapter(serialId = seriesId, chapterId = singleKnownChapterId)
    } else {
        NotificationTapTarget.Serial(serialId = seriesId)
    }
}
