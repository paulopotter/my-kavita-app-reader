# Plan 008 — Notifications & Deep Links — Tasks

See `README.md` for full context, decisions, the payload contract, and the publisher-side prompt.

| # | Task | Depends on | Status |
|---|------|------------|--------|
| [001](001-notifications-module-schema.md) | `:notifications` module scaffold — groups/URLs/history entities + DAOs + migration | — | done |
| [002](002-notification-provider-abstraction.md) | `NotificationProvider` (L2) + `NtfyProvider` (L1) — ntfy WebSocket plugin | 001 | done |
| [003](003-series-resolver-and-filter.md) | `NotificationResolver` — seriesId/name resolution + Following + toggle filter | 001 | done |
| [004](004-deep-link.md) | Deep links — `mymangareader://` scheme + optional configurable App Link hosts | — | done (pending device verification) |
| [005](005-notification-display.md) | `NotificationDisplay` — native notification build/post/dedup, foreground vs. in-app, tap deep link | 001, 003, 004 | done |
| [006](006-foreground-service-connection.md) | `NotificationConnectionService` (foreground service) + start/stop lifecycle | 002, 003, 005 | pending |
| [007](007-channel-sync-and-bridge.md) | `NotificationsBridgeModule` + bidirectional Android-channel sync | 001, 006 | pending |
| [008](008-config-screen.md) | RN: `config/notifications/` — groups CRUD, toggles, retention setting | 007 | pending |
| [009](009-history-screen-and-retention.md) | RN: in-app history screen (read/unread, badge, delete) + Kotlin retention purge on boot | 007, 008 | pending |

## Suggested execution order

Sequential 001 → 009, with Task 004 (deep links) free-standing and safe to build any time before
Task 005 needs it (it has no dependency on the notifications schema itself, only a prerequisite
for testing the notification tap end-to-end) — schema before provider, provider before resolver
(001 → 002/003), deep links independently (004), resolver + deep links before display (003 + 004 →
005), display before the service that drives them all (005 → 006), bridge after the service exists
so it can start/stop it (006 → 007), config screen before the history screen since both share the
bridge but the config screen also owns the toggle the history screen's badge depends on
(007 → 008 → 009).
