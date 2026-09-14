# Task 001 — Measure the real footprint: `:storage` module + `StorageSource` measurement

## Why first

Every number this plan eventually picks — the default ceiling, the preset options, an age cutoff —
is currently a guess. The 500 MB Coil ceiling and the Room caches are where the bytes *should* be
(README findings 1-2), but nothing has ever measured where they *are*. This task answers README
open question 4 on the real device **before** any task chooses a number, and it delivers the
measurement primitive the storage screen (Task 005) later displays.

Deliberately measurement-only: nothing here deletes, caps, or changes existing behavior.

## What to do

1. Create the Gradle module `android/storage/` (Layer 2, `:storage`), wired into
   `settings.gradle.kts` the same way `:notifications` / `:server` are. Depends only on `:core`,
   `:cache`, `:preferences` — never on `:features`, never on `:app`.
2. `StorageSource.kt` — the Layer 2 interface every measurable store implements: a stable `id`, a
   translatable-label key, and `sizeBytes(): Long`. `clear()` is declared here too but left
   unimplemented/TODO-free until Task 004 — the interface is defined once so Task 004 adds behavior,
   not a second abstraction. One implementation per store means a source discovered during the
   measurement below can be added later without touching the facade.
3. Two implementations under `sources/`:
   - `PageCacheSource.kt` — recursive byte size of Coil's `coil_page_cache` directory
     (`cacheDir.resolve("coil_page_cache")`, the exact path `MainApplication.newImageLoader()`
     configures). Directory absent → 0, never an exception.
   - `DataCacheSource.kt` — the Room-backed caches, measured through `:cache`. `:storage` must not
     open the database or stat its file itself; if `:cache` cannot report a size today, add the
     capability there, where that knowledge belongs.
4. `Storage.kt` — the Layer 2 facade: `measure()` returns the per-source breakdown plus the total.
   Fan-out only; no policy, no thresholds, no formatting (bytes in, bytes out — the RN side formats
   for display).
5. **Run the measurement against the real device** and record the result in this file's "Measured
   result" section below: per-source bytes, the total, and the figure Android's own
   "App info → Storage" screen reports for comparison. If the two disagree by a material margin,
   identify what the remainder is (OTA bundle, bundled assets, WebView/OkHttp cache, something else)
   and record that too — that identification is the actual deliverable of this task.

## Files to create

- `android/storage/build.gradle.kts`
- `android/storage/src/main/kotlin/com/mymangareader/storage/Storage.kt`
- `android/storage/src/main/kotlin/com/mymangareader/storage/StorageModule.kt`
- `android/storage/src/main/kotlin/com/mymangareader/storage/StorageSource.kt`
- `android/storage/src/main/kotlin/com/mymangareader/storage/sources/PageCacheSource.kt`
- `android/storage/src/main/kotlin/com/mymangareader/storage/sources/DataCacheSource.kt`
- Matching `src/test/` files beside each.

## Files to modify

- `settings.gradle.kts` — register `:storage`.
- `android/cache/...` — only if it cannot report its own size yet.

## Acceptance criteria

- `measure()` returns a per-source breakdown whose sum equals the reported total.
- A missing/empty cache directory measures 0 and never throws.
- `PageCacheSource` counts nested files recursively (covered with a fake directory tree).
- `:storage` depends on no module outside `:core`/`:cache`/`:preferences`, and on `:app` never.
- The "Measured result" section below is filled in with real device numbers — this task is not done
  while it is empty.
- `koverVerify` passes; floor bumped if coverage rose.

## Project-pattern checklist

- `:storage` follows the module shape already established by `:notifications`/`:server`, with a
  single Layer 2 facade as its public API — no new pattern invented.
- Measurement reads each store through the module that owns it (`:cache`), never by reaching into
  another module's files — micro → macro composition.
- No measurement value is transmitted anywhere; it is read on-device for on-device display only.

## Measured result

> To be filled in when this task runs. Until then, every number in Tasks 002/003/005 stays open —
> see README open questions 1, 2 and 4.

| Source | Bytes | Notes |
|---|---|---|
| Reader pages (`coil_page_cache`) | — | |
| Data cache (`:cache` / Room) | — | |
| **Total measured by `Storage.measure()`** | — | |
| Reported by Android "App info → Storage" | — | |
| **Unaccounted remainder** | — | identify: OTA bundle? assets? other? |
