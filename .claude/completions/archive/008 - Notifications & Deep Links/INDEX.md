# Plan 008 — Notifications & Deep Links — Tasks

See `README.md` for full context, decisions, the payload contract, and the publisher-side prompt.

| # | Task | Depends on | Status |
|---|------|------------|--------|
| [001](001-notifications-module-schema.md) | `:notifications` module scaffold — groups/URLs/history entities + DAOs + migration | — | done |
| [002](002-notification-provider-abstraction.md) | `NotificationProvider` (L2) + `NtfyProvider` (L1) — ntfy WebSocket plugin | 001 | done |
| [003](003-series-resolver-and-filter.md) | `NotificationResolver` — seriesId/name resolution + Following + toggle filter | 001 | done |
| [004](004-deep-link.md) | Deep links — `mymangareader://` scheme + optional configurable App Link hosts | — | done (verified on a physical device — tapping a server link in another app opens the series) |
| [005](005-notification-display.md) | `NotificationDisplay` — native notification build/post/dedup, foreground vs. in-app, tap deep link | 001, 003, 004 | done |
| [006](006-foreground-service-connection.md) | `NotificationConnectionService` (foreground service) + start/stop lifecycle | 002, 003, 005 | done |
| [007](007-channel-sync-and-bridge.md) | `NotificationsBridgeModule` + Android-channel state | 001, 006 | done |
| [008](008-config-screen.md) | RN: `config/notifications/` — groups CRUD, toggles, retention setting | 007 | done |
| [009](009-history-screen-and-retention.md) | RN: in-app history screen (read/unread, badge, delete) + Kotlin retention purge on boot | 007, 008 | done |

## Suggested execution order

Sequential 001 → 009, with Task 004 (deep links) free-standing and safe to build any time before
Task 005 needs it (it has no dependency on the notifications schema itself, only a prerequisite
for testing the notification tap end-to-end) — schema before provider, provider before resolver
(001 → 002/003), deep links independently (004), resolver + deep links before display (003 + 004 →
005), display before the service that drives them all (005 → 006), bridge after the service exists
so it can start/stop it (006 → 007), config screen before the history screen since both share the
bridge but the config screen also owns the toggle the history screen's badge depends on
(007 → 008 → 009).

## Post-implementation follow-up (real-world usage)

All 9 tasks landed as designed. Using the feature on a real device surfaced bugs and gaps that
were fixed on top of what the plan delivered — recorded here because they are part of what
actually shipped, not a separate plan:

1. **Granular notification history** (Room migration 17→18) — history stored one row per *event*
   with chapter lists serialized as JSON, which made per-chapter read state and per-chapter tap
   destinations impossible. An N-chapter event now explodes into N rows, one per chapter.
2. **Optional visual grouping in the history** — with one row per chapter, a series publishing a
   batch flooded the list. Chapters of the same series arriving close together are collapsed into
   a single visual entry, behind the `collapseSerialChaptersNotification` preference, with the
   window configurable via `COLLAPSE_WINDOW_MS` (default 15 min). Grouping is visual only; the
   stored rows stay granular.
3. **Read-on-consumption, not read-on-tap** — a notification only cleared when tapped, so reading
   the chapter through the Library/Series/Reader left it unread forever. Added the RN
   `EventsManager`: normalized content declares its own events, and the notifications module
   listens and correlates, marking history read whichever path consumed the content.
4. **Deep link intent-filter fixed** — the filter declared `/series/` and `/reader/`, which are
   React Navigation *internal route* names, not paths the content server serves; no real URL ever
   matched, so Android never offered the app. It now declares the four real shapes
   (`/series/{id}`, `/library/{libId}/series/{id}`, and each with `/manga/{chapterId}`), with
   `DeepLinkNormalizer` translating them to internal routes — translation stays 100% Kotlin-side,
   `linking.config` still knows only the internal scheme.
5. **`autoVerify` split + share fallback** — http and https shared one intent-filter block, where
   `autoVerify` can never work. Split into an http block without it and an https block with it.
   Verification can't pass for the content server's host anyway (the domain isn't ours, there's
   nowhere to publish `assetlinks.json`), so an `ACTION_SEND` filter is the workaround: a URL
   shared from any app is treated as a deep link.
6. **Resilient WebSocket reconnection** — if no URL answered the health check at boot the service
   gave up permanently, staying "disconnected" even after the server came back, until an app
   restart. It now retries with growing backoff (5s → 1h) for as long as notifications are on,
   skipping attempts when there's no network (`NetworkAvailability`, new in `:tools`) instead of
   burning the clock. Once the socket is open, drops are still handled by the plugin's own
   backoff.

## Validation

- `make coverage` fully passing — Kotlin `BUILD SUCCESSFUL`, 1069 JS tests across 85 suites.
- Verified on a real device by the user: deep links open from another app, notifications arrive
  and route correctly.
