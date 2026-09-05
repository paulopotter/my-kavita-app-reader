# Task 006 — `NotificationConnectionService` (foreground service) + start/stop lifecycle

## Why after 002, 003, 005

This service is the thing that actually wires the plugin (002), resolver (003), and display (005)
together into a running pipeline — it can't be built before any of the three exist.

## What was decided beyond the original scope (closed with the user)

The original draft left "how to select the active URL" and "how start/stop is triggered" open.
Both were resolved before implementation:

1. **URL/group selection reuses `ActiveUrlSelector`** (`:tools`, already used by `:server` and
   `:external-metadata-server`) rather than a `:notifications`-local reimplementation.
2. **A notification group can be linked to a specific Kavita server group** — same
   `linkedServerGroupId` shape and resolution algorithm as
   `ExternalMetadataServer.resolveNoHint`: try the group linked to the currently active Kavita
   server first, fall back to the pool of unlinked groups if there's no link or it isn't healthy.
   This required schema/facade changes beyond this task's original file list (see below) —
   deliberately done here rather than reopening Tasks 001-003, since the foreground service is the
   first and only consumer of this resolution.
3. **No automatic start/stop trigger yet.** `NotificationConnectionService.start(context)` /
   `.stop(context)` are plain `Context.startService`/`stopService` calls a caller drives directly;
   Task 007 (bridge with real groups/toggle CRUD) is what eventually calls these automatically as
   config changes. This task only proves the pipeline itself works end-to-end when driven this
   way.

## What was built

### Schema/facade additions (retroactive to Tasks 001/002, scoped to this task)

- `NotificationGroupEntity` gains `linkedServerGroupId: String? = null` — plain string column, no
  `@ForeignKey` (`:notifications` is a sibling Gradle module to `:server`, same reasoning as
  `ExternalMetadataGroupEntity.linkedServerGroupId`). Migration `Migration_15_16`/`Migration_16_15`
  (schema v15→v16) — the reverse path recreates the table without the column (copy/drop/rename;
  SQLite's `ADD COLUMN` has no portable `DROP COLUMN` counterpart across supported versions).
- `Notifications.groups.add`/`.update` accept `linkedServerGroupId`. `update` additionally takes
  `clearLinkedServerGroupId: Boolean` — a bare `null` is ambiguous between "leave unchanged" and
  "unlink", so unlinking needs its own explicit flag.

### `NotificationGroupResolver.kt` (`:notifications`)

`resolveActiveUrl(): NotificationUrl` — the two-level algorithm described above, using
`UrlSelector.getActiveUrl` against `UrlCandidate`s built from each group's URLs.
`healthCheckPath` is ntfy's own documented liveness endpoint, `/v1/health`, so `UrlSelector`'s
generic "GET url+healthCheckPath" shape works unmodified for this provider too. Throws
`NotificationGroupResolverException` if neither level yields a healthy URL.

### `NotificationConnectionGate.kt` (`:notifications`)

`shouldConnect(): Boolean` — the two conditions from the plan's README, extracted as its own pure,
testable class (not inlined in the Service) specifically so the 4-case start/stop matrix doesn't
require a real Android `Service` under Robolectric: at least one group has at least one URL, AND
the `enabled` preference is `true`. Both required; either false means "should not be connected".

### `NotificationPoster.kt` + `NotificationEventPipeline.kt` (`:notifications`)

`NotificationDisplay` (Task 005) lives in `android/app/` — it depends on `Context`/Coil/
`NotificationManagerCompat` and can't move into `:notifications` without inverting the module
dependency direction. `NotificationPoster` is the boundary interface (`fun interface { suspend fun
post(resolved) }`); `NotificationDisplay` now implements it (bound via a new
`NotificationsBindingsModule` `@Binds` in `android/app/`). `NotificationEventPipeline.handle(event)`
— `resolve` → `shouldNotify` → `post`, extracted so this exact orchestration is unit-testable with
a recording fake `NotificationPoster`, without a real Service.

### `NotificationConnectionService.kt` (`android/app/`)

A foreground `Service` (`@AndroidEntryPoint`):
- `onStartCommand`: calls `startForegroundWithConnectedNotification()` immediately (the low-priority
  "connected" notification, `FOREGROUND_SERVICE_TYPE_DATA_SYNC`), then launches
  `connectAndObserve()`.
- `connectAndObserve()`: checks `NotificationConnectionGate.shouldConnect()` first — if false, calls
  `stopSelf()` and returns. Otherwise resolves the first configured group's provider, builds a
  plugin instance via its registration's `factory`, resolves the active URL via
  `NotificationGroupResolver`, connects the plugin, and collects `plugin.events`, delegating every
  raw event to `NotificationEventPipeline.handle`.
- `onDestroy`: disconnects the active plugin instance, cancels the service's own coroutine scope.
- `companion object`: `start(context)` / `stop(context)` — plain `Context.startService`/
  `stopService` wrappers, the normal Service idiom (never a method called on a live instance).

Manifest: `<service android:name=".NotificationConnectionService" android:exported="false"
android:foregroundServiceType="dataSync" />`, plus `POST_NOTIFICATIONS`, `FOREGROUND_SERVICE`,
`FOREGROUND_SERVICE_DATA_SYNC` permissions.

## Files created

- `android/notifications/src/main/kotlin/com/mymangareader/notifications/NotificationGroupResolver.kt` (+ test)
- `android/notifications/src/main/kotlin/com/mymangareader/notifications/NotificationConnectionGate.kt` (+ test)
- `android/notifications/src/main/kotlin/com/mymangareader/notifications/NotificationPoster.kt`
- `android/notifications/src/main/kotlin/com/mymangareader/notifications/NotificationEventPipeline.kt` (+ test)
- `android/notifications/src/main/kotlin/com/mymangareader/core/database/migrations/Migration_15_16.kt` (+ test)
- `android/app/src/main/kotlin/com/mymangareader/NotificationConnectionService.kt`
- `android/app/src/main/kotlin/com/mymangareader/NotificationsBindingsModule.kt`
- `android/notifications/src/test/kotlin/com/mymangareader/notifications/ServerTestFakes.kt`,
  `NotificationTestFakes.kt` — shared fakes extracted from `NotificationResolverTest`/
  `NotificationsTest` once a second test file needed the same `Server`/`NotificationGroupDao`
  fakes (Kotlin's file-`private` doesn't prevent a same-name collision across files in one Gradle
  source set).

## Files modified

- `android/core/src/main/kotlin/com/mymangareader/core/database/NotificationGroupEntity.kt`,
  `AppDatabase.kt`, `DatabaseModule.kt` (schema v16, new migration pair registered)
- `android/notifications/src/main/kotlin/com/mymangareader/notifications/Notifications.kt`
  (`linkedServerGroupId` plumbed through `NotificationGroupInfo`/`Full`/`New`/`update`)
- `android/app/src/main/kotlin/com/mymangareader/NotificationDisplay.kt` (implements
  `NotificationPoster`)
- `android/app/src/main/AndroidManifest.xml` (service declaration, permissions)
- `android/app/src/main/res/values/strings.xml` / `values-en/strings.xml` (connected-notification
  copy)

## Acceptance criteria

- All 4 start/stop matrix cases covered (`NotificationConnectionGateTest`).
- A fake-provider event flows through resolver → poster exactly once per event, in order
  (`NotificationEventPipelineTest`); a discarded (unresolved) or filtered (shouldNotify=false)
  event never reaches the poster.
- `NotificationGroupResolver` covers: linked group healthy (used), linked group unhealthy (falls
  back to unlinked pool), no link at all (goes straight to unlinked pool), no group at all reachable
  (throws).
- `koverVerify` passes (84.71%, up from 84.48% — within the existing 84% floor, no bump needed).

## Project-pattern checklist

- The service is thin orchestration — no resolution/display/protocol logic duplicated in it; every
  step delegates to `NotificationGroupResolver`, `NotificationConnectionGate`,
  `NotificationEventPipeline`, and (via `NotificationPoster`) `NotificationDisplay`.
- Start/stop is driven by config presence (`NotificationConnectionGate`), never by an `if`
  scattered through unrelated code — the single check lives there, reused by both the service and
  (later) Task 007's automatic trigger.
- `linkedServerGroupId` is a plain string column with no `@ForeignKey`, matching the established
  cross-module convention — `:notifications` never gains a compile-time dependency on `:server`'s
  database types.
