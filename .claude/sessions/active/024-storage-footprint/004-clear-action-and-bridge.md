# Task 004 — `clear()` per source + `StorageBridgeModule` (the RN boundary)

## Why here

Tasks 001-003 are entirely Kotlin-side and invisible to the user. This task opens the boundary the
screen consumes: the manual clear action (README Decision 3's second half) and the bridge that
exposes measurement, clearing, and the ceiling to RN. It ships before the screen so Task 005 builds
against an existing, tested contract instead of two moving parts at once.

## What to do

### 1. `clear()` on every `StorageSource`

Implement the `clear()` declared on the Task 001 interface:

- `PageCacheSource.clear()` — clears Coil's disk cache through **Coil's own `DiskCache` API**, never
  by deleting the directory behind its back: Coil holds an open journal, and removing files
  underneath it corrupts its bookkeeping rather than freeing space cleanly.
- `DataCacheSource.clear()` — delegates to `:cache`'s own invalidation, the same discipline Task 003
  applies to the purge. `:storage` never issues a `DELETE` against the database itself.

**A clear must never touch user data.** Following, read progress, preferences and notification
history live in the same `:core` database as the data cache; the clear path must be scoped to cache
tables only, and the test suite must prove it explicitly rather than assume it.

`Storage.clear(source)` on the facade takes a source id, plus a "clear everything" variant. Per the
project's argument convention, it takes one named object, never positional arguments.

### 2. `StorageBridgeModule`

RN bridge in `android/app/`, following the shape of `NotificationsBridgeModule`:

- read the measurement breakdown + total,
- clear one source or all,
- get/set the ceiling (`StorageBudget`).

Mapping to `WritableMap`/`WritableArray` lives in a separate `StorageBridgeMappers.kt`, the same
split `NotificationsBridgeMappers.kt` already uses. Bytes cross the bridge as raw numbers; all
human-readable formatting is the RN side's job.

### 3. RN typed handle + Service

- `frontend/src/shared/bridge/storage.ts` — the typed `StorageBridge` handle.
- `frontend/src/shared/services/storage/storage.services.ts` — `StorageService`, a thin wrapper over
  the bridge. Only methods that genuinely call the bridge: no derived getters, no convenience
  computed properties (the standing rule for Services in this project).

## Files to create

- `android/app/src/main/kotlin/com/mymangareader/StorageBridgeModule.kt`
- `android/app/src/main/kotlin/com/mymangareader/StorageBridgeMappers.kt`
- `frontend/src/shared/bridge/storage.ts`
- `frontend/src/shared/services/storage/storage.services.ts` (+ its test, beside it)
- Matching Kotlin `src/test/` files beside each.

## Files to modify

- `android/storage/.../sources/PageCacheSource.kt`, `DataCacheSource.kt` — `clear()` implemented.
- `android/storage/.../Storage.kt` — `clear(...)` on the facade.
- The `ReactPackage` registration list, wherever the existing bridge modules are registered.

## Acceptance criteria

- Clearing the page cache goes through Coil's `DiskCache` API, not a raw directory delete (verified
  by inspection and by the test's fake).
- Clearing the data cache leaves Following, read progress, preferences and notification history
  intact — an explicit test, not an assumption.
- After a clear, a re-`measure()` of that source reports a materially lower size.
- The bridge rejects an unknown source id with a clear error code rather than silently doing
  nothing.
- `StorageService` exposes only methods that actually call the bridge.
- `tsc --noEmit`, ESLint, Jest and `koverVerify` all pass; floors bumped if coverage rose.

## Project-pattern checklist

- The bridge/mapper split and the thin-Service shape copy `NotificationsBridgeModule` /
  `NotificationsBridgeMappers` / `NotificationsService` exactly.
- Each store is cleared by the module that owns it; `:storage` orchestrates and never reaches into
  another module's files or tables.
- Facade methods take one named object rather than positional arguments.
