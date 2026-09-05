# Task 003 — `NotificationResolver` — seriesId/name resolution + Following + toggle filter

## Why after 001

Needs the groups/toggle schema from Task 001 to read the current "notifications enabled" state
(via `:preferences`, domain `notifications`) and needs `FollowedSeriesDao` (already existing) to
check Following membership.

## What to do

1. `NotificationResolver.kt` (in `android/app/.../` alongside other domain-specific glue, or in
   `:notifications` if it can stay free of `FollowedSeriesDao`'s app-module location — decide at
   implementation time based on where `FollowedSeriesDao` actually lives; do not introduce a
   circular module dependency to keep it in `:notifications`).
2. `resolve(event: RawNotificationEvent): ResolvedSeriesEvent?`:
   - If `event.seriesId` present, resolve directly (no network call needed beyond what
     `:content-digest`/`:server` already exposes for a series lookup by id).
   - Else, search the locally-synced series listing for an **exact** `seriesName` match. Reuses
     whatever the Kotlin equivalent of `SerialsService.list` is — i.e. the same `:server`/
     `:content-digest` call the RN `SerialsService.list` reaches, not a re-implementation.
   - Exactly one match → resolved. Zero or more than one → log + return `null` (event discarded).
3. `shouldNotify(resolved: ResolvedSeriesEvent): Boolean` — reads three flags from the
   `notifications` preference domain (`:preferences`): `enabled`, `scopeAll`, `scopeFollowedOnly`.
   - `false` if `enabled` is `false`, regardless of the other two.
   - Otherwise `true` if `scopeAll` is `true`, **or** (the series is in Following
     (`FollowedSeriesDao`) **and** `scopeFollowedOnly` is `true`).
   - `scopeAll` and `scopeFollowedOnly` are UI-level mutually exclusive (Task 007 enforces that),
     but this function never assumes that invariant — it evaluates the union as written above even
     if both happen to be `true` (effectively "notify all" in that case), and `false` if neither
     scope flag is set even when `enabled` is `true`.
4. Both functions are pure enough to unit-test with fakes for the series lookup, `FollowedSeriesDao`,
   and `Preferences`.

## Files to create

- `NotificationResolver.kt` (location per the note above)
- Matching test file — cover: seriesId present (skips name search entirely), seriesName exact
  single match, seriesName zero matches (discarded), seriesName multiple matches (discarded),
  `enabled=false` (no notify regardless of scope), `enabled=true` + `scopeAll=true` +
  not-Following (notify), `enabled=true` + `scopeFollowedOnly=true` + Following (notify),
  `enabled=true` + `scopeFollowedOnly=true` + not-Following (no notify), `enabled=true` + both
  scope flags `false` (no notify), both scope flags `true` (notify, treated as "all").

## Acceptance criteria

- All branches above covered by tests.
- No test relies on real network — the series listing lookup is faked.
- `koverVerify` passes; floor bumped if coverage rose.

## Project-pattern checklist

- Resolution reuses the existing Series listing path instead of re-fetching or re-deriving it —
  same "ask the domain, don't recompute it" rule as `SeriesDigest` calling the Chapter module.
- Following check reuses `FollowedSeriesDao` directly, no duplicated follow-state storage.
