// ── Notifications sub-screen shapes ──────────────────────────────────────────
// Local to screens/config/notifications/. The bridge/service shapes it maps to and from live in
// shared/ (shared/bridge/notifications.ts, shared/services/notifications/).

// A notification group's URL as the sub-screen edits it (strings in the form, parsed on save).
export interface NotificationUrlForm {
  id: string;
  url: string;
  priority: number;
}

// The group-level "test connection" button's own transient state — mirrors config/server's
// ConnStatus (server.types.ts).
export type ConnStatus = 'idle' | 'testing' | 'ok' | 'error';
