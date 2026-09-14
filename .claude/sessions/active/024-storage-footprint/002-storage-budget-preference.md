# Task 002 — `StorageBudget` — the max-cache-size preference

## Why here

Task 001's measurement says what the current footprint costs; this task creates the single place
where the user's chosen ceiling lives, so Task 003 (enforcement) and Task 005 (the UI) both read one
source of truth instead of two. It ships before either of them for exactly that reason.

Deliberately storage-only: this task persists and reads the value, and changes no runtime behavior.
Coil is still built with the hardcoded constant until Task 003.

## What to do

1. `StoragePreferenceKeys.kt` in `:storage` — centralizes this domain's `:preferences` keys, exactly
   the role `NotificationPreferenceKeys` plays for the notifications domain. At minimum
   `MAX_CACHE_BYTES`; a second key for an age cutoff only if README open question 2 resolves in
   favor of age-based purging.
2. `StorageBudget.kt` — reads and writes the ceiling through `:preferences`. Never set → returns an
   explicit "unset" rather than silently substituting a number, the same discipline
   `NotificationRetentionPurge` follows when `retentionDays` is absent. Deciding what happens on
   "unset" is the *caller's* job (Task 003), so the default is stated in exactly one place.
3. Clamp on write: reject a negative or absurd value, with the accepted range defined as named
   constants, mirroring `RETENTION_MIN_DAYS`/`RETENTION_MAX_DAYS`'s own role on the notifications
   screen. The concrete bounds come from README open question 1.

## Blocked on

**README open question 1** — the default ceiling and the range/options offered. Do not invent
numbers here; carry Task 001's measured result into that decision, get it approved, then implement.
The code shape in this task is independent of which numbers are chosen, so it can be written and
reviewed first, with the constants filled in last.

## Files to create

- `android/storage/src/main/kotlin/com/mymangareader/storage/StoragePreferenceKeys.kt`
- `android/storage/src/main/kotlin/com/mymangareader/storage/StorageBudget.kt`
- Matching `src/test/` files beside each.

## Acceptance criteria

- Round-trip test: write a ceiling, read it back unchanged.
- Unset returns the explicit "unset" value — never a guessed default, never 0 masquerading as one.
- Out-of-range writes are clamped (or rejected) at the documented bounds, covered at both edges.
- No consumer of the ceiling exists yet outside this module — enforcement is Task 003's scope.
- `koverVerify` passes; floor bumped if coverage rose.

## Project-pattern checklist

- Preference access goes through `:preferences`, the app's single generic preference layer — no new
  storage mechanism for one value.
- The "absent preference is not a default" discipline is copied from `NotificationRetentionPurge`,
  keeping the default declared in exactly one place instead of two that can drift.
