// ── Notifications history screen shapes ──────────────────────────────────────
// Local to screens/notifications/. The bridge/service shapes it maps to and from live in shared/
// (shared/bridge/notifications.ts, shared/services/notifications/).

// A history item as the screen renders it — the raw NotificationHistoryItem plus the same
// body-equivalent summary text NotificationDisplay.kt builds for the system notification
// (buildBody), so the in-app list and the system tray never disagree about what a batch says.
export interface NotificationHistoryRow {
  // The row's own id when it represents exactly one NotificationHistoryItem; the first (most
  // recent) of `ids` when it represents a group. `ids` always has 1+ entries — every real
  // NotificationHistoryItem this row stands for, e.g. for markRead/delete to act on all of them.
  id: string;
  ids: string[];
  seriesId: string;
  seriesName: string;
  // Present only when this row stands for exactly one chapter — never set on a grouped row (2+
  // real items collapsed together, see collapseNotificationRows's own doc), even if every one of
  // those items happens to know its own chapter — a group's tap always lands on the series.
  chapterId?: string;
  // Every chapter number the row's own items carry, oldest-first — 0-1 entries for a single row,
  // 0+ for a group (an item with no known number contributes nothing here, never a placeholder).
  // The detail popup lists these; the collapsed list row itself only ever shows bodyText.
  chapterNumbers: string[];
  bodyText: string;
  detectedAtMs: number;
  // A grouped row reads as read only once every item it stands for is read — same "nothing left
  // to see" idea as a single row's own read flag.
  read: boolean;
  // Filled in lazily, per-viewport (see notifications.hooks.ts's enrichCover) — undefined until
  // enriched, or forever when the series has no resolvable cover.
  coverUrl?: string;
}
