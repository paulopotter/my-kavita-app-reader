# Task 005 — RN: `config/storage/` — usage breakdown, ceiling control, clear action

## Why last

It consumes everything the four previous tasks built: Task 001's measurement, Task 002's
preference, Task 003's enforcement, and Task 004's bridge. It is also the task that makes the whole
plan legible to the user — README Decision 3, and the piece that lets them answer "is this ceiling
worth it?" with a number instead of a guess.

## What to do

A new config sub-screen at `frontend/src/screens/config/storage/`, built to the same shape as
`config/notifications/` — that directory is the working reference for a preference sub-screen with
a numeric range control, and this one should not diverge from it without reason.

### Screen content

1. **Usage breakdown** — one row per `StorageSource` (reader pages, data cache, …) with its size,
   plus a total. Sizes are formatted for humans (MB/GB) here on the RN side; the bridge only ever
   hands over raw bytes. If Task 001's measurement found a material unaccounted remainder, show it
   as an explicit "other" row rather than letting the numbers quietly fail to add up.
2. **The ceiling control** — reads/writes the preference through `StorageService`, clamped to the
   agreed range, mirroring how `notifications.hooks.ts` handles `retentionDays` with its
   `RETENTION_MIN_DAYS`/`RETENTION_MAX_DAYS`/`RETENTION_DEFAULT_DAYS` constants and its clamp on
   set. **It must state that the new ceiling applies from the next app start** (Task 003's Coil
   constraint) — the UI never implies an instant effect it cannot deliver.
3. **The clear action** — per source and/or everything, behind a confirmation, since it is
   destructive-looking even though it only discards re-downloadable data. The confirmation copy
   should say exactly that: nothing the user owns is lost, pages are simply fetched again next time.
   After a successful clear, the breakdown reloads so the freed space is visible immediately.

### Wiring

`config.screen.tsx` gains one more menu row and one more `case 'storage':` in its existing switch —
the same two-line pattern the `'notifications'` row already follows. No new route in
`RootNavigator`; config sub-screens are rendered by the config screen itself.

### Rules this screen is held to

- Every string goes through the existing i18n system in both `ptBR` and `en` — no hardcoded
  single-language text anywhere.
- Dumb components under `components/` take primitives and callbacks only; none of them imports a
  service or the bridge.
- No value measured here is transmitted anywhere.

## Blocked on

**README open question 1** — the control's shape (slider / presets / free numeric entry) follows
from what options the user is offered, and that is decided with Task 001's measurement in hand.

## Files to create

- `frontend/src/screens/config/storage/storage.{screen.tsx,hooks.ts,styles.ts,types.ts}`
  (+ `storage.hooks.tests.ts`, `storage.tests.tsx`, `index.ts`)
- `frontend/src/screens/config/storage/components/...` (+ styles/tests/index beside each)

## Files to modify

- `frontend/src/screens/config/config.screen.tsx` — menu row + switch case.
- `frontend/src/shared/i18n/strings.ts` — the new keys, both languages.

## Acceptance criteria

- The breakdown rows sum to the displayed total (including the "other" row when present).
- Changing the ceiling persists it and shows the "applies on next start" note.
- The clear action asks for confirmation, and on confirm the breakdown reloads with lower numbers.
- Reading a chapter immediately after a clear works — pages re-download without error.
- No dumb component under this screen imports the bridge or a service (verified, as Plan 008 Task
  009 verified its own `HistoryItem`).
- Every new string exists in both `ptBR` and `en`.
- `tsc --noEmit`, ESLint and Jest pass; JS coverage floor bumped if coverage rose.
- `make coverage` passes overall — the plan cannot close otherwise.

## Project-pattern checklist

- Screen file layout, hook naming and the clamp-on-set behavior follow `config/notifications/`, the
  nearest existing equivalent.
- The screen imports only from `shared/` and its own folder — never from another screen.
- Byte formatting lives on the RN side; the bridge contract stays numeric.
