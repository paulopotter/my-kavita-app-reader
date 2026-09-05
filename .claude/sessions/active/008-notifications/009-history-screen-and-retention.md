# Task 009 — RN: in-app history screen (read/unread, badge, delete) + Kotlin retention purge on boot

## Why last

Depends on the bridge (007) for history CRUD and on the config screen (008) already having wired
`retentionDays` — this task is the last consumer of that value plus the one new piece of Kotlin
boot-time behavior (the purge).

## What to do

### Kotlin — retention purge on boot

1. Add a fire-and-forget purge call, following the existing `BackgroundExecute` pattern in
   `:tools` (generic fire-and-forget over `Cache`/similar infra) — reads `retentionDays` from
   `:preferences`, calls `Notifications.kt`'s `deleteOlderThan(now - retentionDays)`.
2. Wire it into the app's existing startup/splash flow, same spirit as other startup warm-up work
   already documented (e.g. the Library warm-up from Plan 017) — never blocking the splash gate.

### RN — history screen

3. `screens/notifications/notifications-history.screen.tsx` (+ `.hooks.ts`, `.types.ts`,
   `.styles.ts`), current screen convention:
   - List of history items (series name, body-equivalent summary, timestamp, read/unread visual
     state).
   - "Mark all as read" action.
   - Per-item delete + per-item "mark as read" (tap already marks read per README decision 7, but
     an explicit action should also be available without opening the deep link).
   - Unread badge — wherever the app's navigation shell already shows badges/counts (reuse that
     mechanism, don't invent a second one), subscribed to the `unreadCountChanged` event from
     Task 007.
4. Dumb components under `components/<comp>/`, same isolation rule as Task 008 (no
   service/bridge import inside a dumb component).
5. All strings translatable (pt-BR + en).
6. Register the route + the entry point to reach it (e.g. from the navigation shell's
   notification icon/badge).

## Files to create

- Kotlin: wherever the startup/splash flow's existing warm-up call lives, a small addition (not a
  new module) — likely inside `:tools`'s `BackgroundExecute` call site or the equivalent startup
  coordinator; exact file to confirm against the current startup flow at implementation time.
- `frontend/src/screens/notifications/notifications-history.screen.tsx` (+ `.hooks.ts`,
  `.types.ts`, `.styles.ts`, tests)
- `frontend/src/screens/notifications/components/...`
- Matching Kotlin test for the purge call (retention boundary: item exactly at the cutoff is kept,
  one ms older is purged).

## Files to modify

- Navigation route registration
- Wherever the app's boot/startup sequence already fires other fire-and-forget warm-up calls

## Acceptance criteria

- Purge call never blocks the splash gate (test confirms boot proceeds even if the purge is slow
  or fails).
- Retention boundary test passes (kept vs. purged at the exact cutoff).
- "Mark all as read" zeroes the unread badge.
- Deleting an item removes it from the list and, if unread, decrements the badge.
- No dumb component under this screen imports the bridge/service directly.
- `make coverage` passes (Kotlin + JS); floors bumped if coverage rose.

## Project-pattern checklist

- Purge reuses the existing fire-and-forget startup pattern instead of inventing a new one.
- Badge reuses whatever counter/badge mechanism the navigation shell already has, if any exists;
  otherwise this is the first one and should be built generically enough not to be
  notifications-specific if a 2nd consumer becomes likely (documented here as a note, not solved
  speculatively — build only what this screen needs today).
