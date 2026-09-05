// ── Notifications history screen shapes ──────────────────────────────────────
// Local to screens/notifications/. The bridge/service shapes it maps to and from live in shared/
// (shared/bridge/notifications.ts, shared/services/notifications/).

// A history item as the screen renders it — the raw NotificationHistoryItem plus the same
// body-equivalent summary text NotificationDisplay.kt builds for the system notification
// (buildBody), so the in-app list and the system tray never disagree about what a batch says.
export interface NotificationHistoryRow {
  id: string;
  seriesId: string;
  seriesName: string;
  bodyText: string;
  detectedAtMs: number;
  read: boolean;
}
