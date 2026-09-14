package com.mymangareader.notifications

// A resolved batch (one publisher event, already resolved to a local serial) always turns into
// one history row PER CHAPTER — never one row per event, even when the event itself carried N
// chapters together. See NotificationHistoryEntity's own doc (`:core`) for why: a row with more
// than one chapter would make "how many distinct chapters am I owed across history" ambiguous to
// compute later, and the RN-side presentation grouping (collapseSerialChaptersNotification) is
// meant to be the ONLY place multiple chapters ever get shown together — never something baked
// into storage itself.
//
// chapterIds/chapterNumbers pair up positionally where both exist: index i of one is assumed to
// describe the same chapter as index i of the other (the payload contract's own ordering, never
// re-sorted here). When they don't line up 1:1 — different lengths, or only one of the two
// present — every entry that HAS an id/number still gets its own row; nothing is ever dropped for
// lack of a counterpart. Neither present at all → exactly one row with neither, matching what a
// publisher sends when it detected "something changed on this serial" without chapter detail.
fun ResolvedSeriesEvent.explodeToHistoryItems(): List<NewNotificationHistoryItem> {
    val ids = chapterIds.orEmpty()
    val numbers = chapterNumbers.orEmpty()
    val chapterCount = maxOf(ids.size, numbers.size)

    if (chapterCount == 0) {
        return listOf(
            NewNotificationHistoryItem(
                seriesId = seriesId,
                seriesName = seriesName,
                chapterId = null,
                chapterNumber = null,
                detectedAtMs = detectedAtMs,
            ),
        )
    }

    return (0 until chapterCount).map { i ->
        NewNotificationHistoryItem(
            seriesId = seriesId,
            seriesName = seriesName,
            chapterId = ids.getOrNull(i),
            chapterNumber = numbers.getOrNull(i),
            detectedAtMs = detectedAtMs,
        )
    }
}
