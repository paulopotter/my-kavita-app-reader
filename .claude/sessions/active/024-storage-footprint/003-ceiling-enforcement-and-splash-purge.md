# Task 003 — Enforce the ceiling in Coil + fire the existing cache purge on splash

## Why here

This is where README Decisions 1 and 2 become real behavior, and it needs Task 002's preference to
already exist. Two changes, both in `MainApplication.kt`, both small, both behavior-changing — which
is why they land together after the measurement and the preference are settled and never before.

## What to do

### 1. Ceiling enforcement (README Decision 1)

`MainApplication.newImageLoader()` currently hardcodes
`READER_DISK_CACHE_MAX_BYTES = 500L * 1024 * 1024` into `DiskCache.Builder().maxSizeBytes(...)`.
Replace that constant with a read of `StorageBudget` (Task 002), falling back to the agreed default
when the preference is unset.

Coil fixes the disk cache size when the `ImageLoader` is constructed, so a change takes effect on
the **next app start**. That is a real constraint, not a bug to work around: the settings UI (Task
005) must state it, and no code here should attempt to rebuild the loader live.

Keep the existing explanatory comment's reasoning intact — the trade-off it documents is still the
trade-off, it is simply the user's to set now. Update it to say so instead of deleting it.

`READER_MEMORY_CACHE_PERCENT = 0.15` (the in-memory bitmap cache) is **not** touched: it is a RAM
bound, not a storage one, and its own comment justifies the specific value against how
`SafeBitmapDecoder` decodes pages at full resolution.

### 2. Splash purge (README Decision 2)

`CachePurge.kt` in `:storage` — a small `@Singleton` that calls `:cache`'s **existing**
`purgeExpired()` / `purgeOlderThan(cutoffEpochMs)` (`CacheStore`). It implements no purge logic of
its own; it is the trigger that finding 2 showed was missing, nothing more. `now` is an injectable
parameter defaulting to `System.currentTimeMillis()` so the cutoff boundary is testable without
mocking the clock — the same trick `NotificationRetentionPurgeTest` already relies on.

Wired into `MainApplication.onCreate()` as one more `applicationScope.launch { ... }`, a sibling of
the existing `NotificationRetentionPurge` call: fire-and-forget, `SupervisorJob`-scoped so a failure
here cannot affect the other boot jobs, unawaited so it never blocks the splash gate.

**Scope limit:** splash is the only trigger in this task. A second trigger (e.g. on leaving the
Reader) is README open question 3 and stays out until it is decided — adding it here would decide
it by default.

## Blocked on

- **README open question 1** — the fallback default when the ceiling preference is unset.
- **README open question 2** — whether the purge is age-based, size-based, or both, which decides
  whether `CachePurge` calls `purgeExpired()`, `purgeOlderThan()`, or both, and with what cutoff.

## Files to create

- `android/storage/src/main/kotlin/com/mymangareader/storage/CachePurge.kt`
- `android/storage/src/test/kotlin/com/mymangareader/storage/CachePurgeTest.kt`

## Files to modify

- `android/app/src/main/kotlin/com/mymangareader/MainApplication.kt` — `newImageLoader()` reads the
  budget; `onCreate()` fires `CachePurge`; `READER_DISK_CACHE_MAX_BYTES` removed or demoted to the
  named default.

## Acceptance criteria

- With a ceiling set, the constructed `ImageLoader`'s disk cache uses that value (covered by testing
  the extracted size-resolution function, not by instantiating Coil).
- With no ceiling set, the documented default is used — never 0, never unbounded by accident.
- Boundary test on the purge cutoff: an entry exactly at the cutoff is kept, one ms older is purged.
- The purge is an unawaited `applicationScope.launch`; a thrown failure inside it leaves the other
  boot jobs running (verified the same way Plan 008 Task 009 verified its own).
- On-device: a cold start after lowering the ceiling keeps the page cache under the new value during
  sustained reading; the splash shows no added delay.
- No new periodic job, no `WorkManager` — verified by inspection of the diff (README non-goals).
- `koverVerify` passes; floor bumped if coverage rose.

## Project-pattern checklist

- The purge reuses `:cache`'s own `purgeExpired`/`purgeOlderThan` rather than reimplementing
  deletion — `:storage` triggers, `:cache` owns the behavior.
- The boot wiring copies the existing fire-and-forget `applicationScope.launch` idiom already used
  by the OTA check, the stable-boot call, and `NotificationRetentionPurge`.
- A user-facing constant becomes a preference, in keeping with the project's preference for
  configuration over hardcoded policy.
