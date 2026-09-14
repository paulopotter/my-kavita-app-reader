# Plan 024 — Storage Footprint & Resource Hygiene

## Context

The app currently occupies roughly **900 MB** on the user's device. Nothing in the app tells the
user that, nothing lets them cap it, and nothing ever reclaims it on its own. The stated goal that
drives this plan:

> "quero manter um app leve que não impacte no consumo de bateria, memória, espaço e de download de
> dados" — keep the app light, with no meaningful impact on battery, memory, storage, or data usage.

This plan turns that goal into a concrete, user-controlled storage budget. Four findings from the
pre-plan investigation frame it (each verified by inspection, sources cited):

1. **The page cache is, by design, the biggest consumer.** `MainApplication.kt` configures Coil with
   an explicit `READER_DISK_CACHE_MAX_BYTES = 500L * 1024 * 1024` ceiling (500 MB) into
   `cacheDir.resolve("coil_page_cache")`, plus `READER_MEMORY_CACHE_PERCENT = 0.15` for the
   in-memory bitmap cache. The committed comment says explicitly *why*: Coil's own default is 2% of
   free disk, which "on a nearly-full device can be too small to hold more than a couple of
   chapters — pages get evicted and re-downloaded on every reopen even though nothing on the server
   changed." So the 500 MB figure is **a deliberate space-vs-network trade-off, not an accident** —
   it is simply pinned all the way to the "spend space, save bandwidth" end, with the user never
   consulted. It also has **no age-based expiry at all**: Coil only evicts when the ceiling is hit.

2. **The data cache already has a purge mechanism, and nobody ever calls it.** `CacheStore`
   (`android/cache/.../CacheStore.kt`) declares `purgeExpired()` and `purgeOlderThan(cutoffEpochMs)`;
   both are implemented by `PersistentCache`, `MemoryKotlinCache` and `NetworkCache`, exposed
   through `CacheBridgeModule.kt`, and surfaced on the RN side by `CacheManager`
   (`frontend/src/shared/managers/caches/cache.manager.ts`). But no production caller exists — the
   comment at `frontend/src/shared/bridge/cache.ts:53` admits it: *"Called manually (e.g. a
   debug/…)"*. The whole plumbing is built, tested, and never wired to a trigger.

3. **A working precedent for exactly this shape already exists.** Notification history (Plan 008,
   Task 009) has real retention: a user-adjustable `retentionDays` preference on the notifications
   config sub-screen (`RETENTION_MIN_DAYS = 1` / `RETENTION_MAX_DAYS = 15` /
   `RETENTION_DEFAULT_DAYS = 7`), persisted via `:preferences`, enforced by
   `NotificationRetentionPurge` fired fire-and-forget from `MainApplication.onCreate()`. This plan
   copies that shape rather than inventing a second one — a preference in a config sub-screen plus a
   purge on boot.

4. **There is no background/battery problem to fix here — and this plan must not create one.** The
   app uses no `WorkManager` and no periodic job. The only continuous process is
   `NotificationConnectionService` (foreground service, persistent WebSocket, `START_STICKY`), which
   is inherent to real-time notification delivery, and whose reconnect backoff (5 s → 1 h) already
   prevents infinite retry against an offline server. Every mechanism this plan adds therefore runs
   **only at app start (splash) or on explicit user action** — never on a wake-up schedule, never a
   new always-on process. That is a constraint on this plan, not an open question.

The user has already made three decisions (below); everything else worth deciding is listed under
"Open questions" and must be answered — in most cases by Task 001's measurement — before the tasks
that depend on it are implemented.

---

## Decisions (already made by the user)

### 1. The storage ceiling is a user-chosen preference, not a constant

The trade-off in finding 1 belongs to the user, so the 500 MB constant becomes a **configurable
maximum cache size**, letting them actively pick where they sit between "occupies space" and
"re-downloads pages". This mirrors, deliberately and exactly, the notification `retentionDays`
preference that already exists and works: stored via `:preferences` under its own domain, edited on
a config sub-screen, read by the code that enforces it, with no hidden second source of truth.

Because Coil's `DiskCache` size is fixed when the `ImageLoader` is built (`MainApplication`'s
`newImageLoader()`), the preference is read at loader-construction time; changing it takes effect on
the next app start, and the settings UI says so rather than pretending it is instant.

### 2. The existing purge runs on splash

The purge from finding 2 gets the trigger it never had: the app's startup flow. This is not a new
mechanism — `NotificationRetentionPurge` already establishes the precedent of a purge fired
fire-and-forget from `MainApplication.onCreate()` inside the `SupervisorJob`-scoped
`applicationScope`, where a failure cannot affect the other boot jobs and nothing awaits it, so the
splash gate is never blocked. The cache purge joins it as a sibling, on the same terms.

### 3. A storage screen: show what is used, offer to clear it

A UI that reports how much space the app is actually occupying — **broken down by source** (reader
pages, data cache, and whatever else Task 001's measurement proves is material) — with a manual
"clear" action. This is the piece that closes the loop: the user can only choose a sane ceiling
(Decision 1) if they can see what the current one costs them.

---

## Non-goals

- **No new background job, no `WorkManager`, no periodic wake-up.** See finding 4. Automatic
  reclamation happens at app start; everything else is user-initiated.
- **No change to `NotificationConnectionService`'s lifecycle or its reconnect backoff.** Battery
  behavior of the notification pipeline was addressed in Plan 008 and is out of scope here.
- **No new cache layer, and no replacement for Coil.** This plan bounds and reports what already
  exists.
- **No telemetry.** Measurements are read on-device and shown on-device only — never collected,
  never transmitted. (Fixed project convention.)
- **Not an OTA-bundle storage policy.** If Task 001 proves the OTA bundle/assets are a material
  slice of the 900 MB, that finding is recorded and handed to a follow-up item rather than absorbed
  here — see Open question 4.

---

## Architecture

Storage is a cross-cutting concern with no existing home, so it gets a small Layer 2 Kotlin
module of its own, `:storage`, following the same shape as the other promoted modules. It owns two
things a caller cannot get anywhere else today: **how much space each source occupies** (a
filesystem/DB measurement) and **how to reclaim it**. It delegates the actual reclamation downward
to the module that owns each store (`:cache` for the Room-backed caches, Coil's own `DiskCache` API
for pages) rather than reaching into anyone's storage directly — micro → macro composition, each
domain handling only its own concern.

```
android/storage/                              # :storage (Layer 2) — new module
  Storage.kt                                  # L2 facade: measure() + clear(source) — the module's
                                              # only public API
  StorageModule.kt                            # Hilt — binds every StorageSource implementation
  StorageSource.kt                            # L2 interface: id, sizeBytes(), clear() — one
                                              # implementation per measurable/clearable store, so
                                              # adding a source later never touches the facade
  StorageBudget.kt                            # reads/writes the max-cache-size preference via
                                              # :preferences (single source of truth for the ceiling)
  StoragePreferenceKeys.kt                    # the storage domain's :preferences keys — mirrors
                                              # NotificationPreferenceKeys' own role
  CachePurge.kt                               # the splash-time purge: calls :cache's existing
                                              # purgeExpired()/purgeOlderThan() — never a second
                                              # purge implementation
  sources/
    PageCacheSource.kt                        # reader pages — Coil's coil_page_cache directory
    DataCacheSource.kt                        # Room-backed caches, measured + cleared via :cache

android/app/src/main/kotlin/com/mymangareader/
  MainApplication.kt                          # newImageLoader() reads the configured ceiling
                                              # instead of READER_DISK_CACHE_MAX_BYTES; onCreate()
                                              # fires CachePurge as a sibling of the existing
                                              # NotificationRetentionPurge launch
  StorageBridgeModule.kt                      # RN bridge — measurement read, clear action,
                                              # get/set ceiling
  StorageBridgeMappers.kt                     # *WritableMap()/*WritableArray() mappers

frontend/src/
  shared/bridge/storage.ts                    # StorageBridge (typed)
  shared/services/storage/
    storage.services.ts                       # StorageService — thin wrapper over the bridge
  screens/config/storage/                     # new config sub-screen, same shape as
                                              # config/notifications/
    storage.screen.tsx                        # per-source usage breakdown + total, the ceiling
                                              # control, the clear action
    storage.hooks.ts
    storage.styles.ts
    storage.types.ts
    components/...
  screens/config/config.screen.tsx            # one more menu row → 'storage', same switch/case
                                              # pattern the notifications row already uses
```

**Data flow** (measurement/clear, RN-initiated): `StorageBridgeModule` → `StorageService` →
`storage.hooks.ts` → the config sub-screen. `Storage` fans out to each `StorageSource`.

**Data flow** (purge, Kotlin-only, no RN): `MainApplication.onCreate()` → `CachePurge` → `:cache`'s
own `purgeExpired()` / `purgeOlderThan()`.

**Data flow** (ceiling enforcement): `StorageBudget` (`:preferences`) → `MainApplication`'s
`newImageLoader()` → Coil `DiskCache.maxSizeBytes`.

No new EventBus token is required: the screen reloads its own measurement after a clear, and nothing
outside that screen observes storage state.

---

## Contract-change note

This plan introduces contract-level surfaces: a new Kotlin module (`:storage`), a new bridge
(`StorageBridgeModule`), a new RN Service, a new config sub-screen route, and a behavior change to
`MainApplication`'s image-loader construction (a committed constant becomes a user preference). Per
this project's process rule, none of it gets implemented until this README plus the tasks below are
reviewed and approved, and task-level details (bridge method shapes, the `StorageSource` signature,
the preference key names) remain subject to the same rule at implementation time if they diverge
from what is written here.

---

## Open questions (must be answered before the dependent task is implemented)

These are deliberately **not** decided yet. Task 001 exists specifically to stop the numeric ones
from being guessed.

1. **What is the default ceiling, and what options does the user get?** A slider, a few presets
   (e.g. 100 / 250 / 500 MB / unlimited), or a free numeric entry? And what default ships — the
   current 500 MB, preserving today's behavior for existing installs, or something smaller, treating
   the present footprint as the bug being fixed? *Blocks Task 003/005. Answer informed by Task 001.*

2. **Purge by age, by size, or both?** Size-capping alone (what Coil does today) never removes a
   page that is stale but fits; age alone never bounds the total. `:cache` already supports both
   (`purgeExpired` is TTL-driven, `purgeOlderThan` takes an explicit cutoff), so the mechanism is
   free — the policy is not. If age is in play, its cutoff is a second number needing a default.
   *Blocks Task 002/003.*

3. **Does automatic cleanup get triggers beyond splash?** Decision 2 fixes splash as the baseline.
   A candidate second trigger is leaving the Reader — the moment the app most recently added the
   most bytes, and a natural point to enforce a ceiling. Risk: it competes with the read-ahead the
   user may immediately want back. Not decided; explicitly excluded from Task 003's scope until it
   is. *Blocks nothing in the current task list — would be a follow-up task.*

4. **What actually composes the ~900 MB?** Coil pages, Room/`:cache` data, the OTA bundle, bundled
   assets, WebView/OkHttp caches, or something unaccounted for. Everything in findings 1-2 is an
   informed hypothesis about where the bytes *should* be, not a measurement of where they *are*.
   Task 001 answers this first, on the real device, and every number chosen in questions 1-2 waits
   on its result. If a material slice turns out to be something this plan does not own (the OTA
   bundle being the likeliest), that is recorded as a backlog item rather than silently widening
   this plan's scope.

---

## End-to-end verification checklist

- [ ] On the real device, the measurement reported by the storage screen is consistent with what
      Android's own "App info → Storage" screen reports, and the breakdown accounts for the bulk of
      it (no large unexplained remainder).
- [ ] Setting a lower ceiling and restarting the app results in a page cache that stays under the
      new value during sustained reading.
- [ ] The ceiling control states plainly that it applies from the next app start (Decision 1), and
      the app does not pretend to apply it live.
- [ ] With no ceiling preference ever set, behavior is the documented default — never a crash,
      never an accidental 0-byte cache.
- [ ] The splash purge never blocks the splash gate: it is an unawaited, `SupervisorJob`-scoped
      `applicationScope.launch`, exactly like the existing `NotificationRetentionPurge` call.
- [ ] A purge failure (e.g. DB locked) is swallowed and logged, and the other boot jobs still run.
- [ ] The manual "clear" action visibly drops the reported usage, and the app remains fully usable
      immediately afterwards — the next chapter opened re-downloads its pages without error.
- [ ] Clearing the page cache never clears user data (Following, read progress, preferences,
      notification history) — verified explicitly, since these live in the same `:core` database.
- [ ] No new always-on process, no `WorkManager` dependency, and no new periodic wake-up is
      introduced (verified by inspection of the final diff).
- [ ] No measurement value leaves the device (no telemetry), per the fixed project convention.
- [ ] All new UI text goes through the existing i18n system in both `ptBR` and `en`.
- [ ] `make coverage` passes, with the Kotlin and/or JS floor bumped if coverage rose.
