# Task 007 — `NotificationsBridgeModule` + Android-channel state

## Why after 001, 006

The bridge is the RN-facing surface over everything built so far: it needs the schema (001) to
expose groups/history CRUD, and it needs the service (006) to start/stop it whenever config
changes from the RN side.

## Android channel reality (changed the original design)

Android does not let an app change an already-created `NotificationChannel`'s importance/enabled
state programmatically — only the user can, from the system's own per-channel settings screen.
Given that, the channel becomes the single source of truth for "notifications enabled", and the
app's job shrinks to:

- Creating the channels (name/description/initial importance) once, on first app start.
- Reading the channel's current importance whenever it needs to know if notifications are on.
- Handing the user to the system's channel settings screen to change it — there is no in-app
  toggle that flips a real switch; the "toggle" in the config screen (Task 008) is a button that
  opens that screen.

This replaced the original plan's `setEnabled(enabled)`/bidirectional-sync mechanism, and is why
the `notifications` preference domain no longer has an `enabled` key at all.

## What was built

1. `NotificationChannelState` (`:notifications`) — the boundary interface the pure Kotlin module
   needs without depending on `Context`/`NotificationManager`:
   ```kotlin
   fun interface NotificationChannelState {
       fun isEnabled(): Boolean
   }
   ```
   `NotificationResolver` and `NotificationConnectionGate` both take this in their constructor now,
   replacing the old `preferences.get("enabled")` read.
2. `NotificationPreferenceKeys` (`:notifications`) — centralizes the preference keys that used to be
   duplicated string literals across `NotificationResolver`/the bridge (`SCOPE_ALL`,
   `SCOPE_FOLLOWED_ONLY`, `GROUP_ACROSS_SERIES`, `RETENTION_DAYS`, plus the `notifications` domain
   name).
3. `NotificationChannelSync` (`android/app`) — creates the two channels
   (`new_chapters`/`notifications_connection`) on app start, implements `NotificationChannelState`
   by reading `NotificationManagerCompat`/channel importance, and exposes `openChannelSettings()`
   (`Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS` with `EXTRA_APP_PACKAGE`/`EXTRA_CHANNEL_ID`).
   Wired in `MainApplication.onCreate()` right after `AppForegroundState.register()`.
4. `NotificationsBridgeModule` (`android/app`) — one NativeModule for the whole domain, built by
   hand in `AppReactPackage` (not `@Inject`, same idiom as `ExternalMetadataBridgeModule`):

   | Method | Delegates to |
   |---|---|
   | `isChannelEnabled()` / `openChannelSettings()` | `NotificationChannelSync` |
   | `listGroups()` / `addGroup(...)` / `removeGroup(id)` / `addGroupUrl(...)` / `removeGroupUrl(...)` | `Notifications.groups`/`Notifications.group(id)`, each re-evaluates `NotificationConnectionGate.shouldConnect()` afterwards and starts/stops `NotificationConnectionService` |
   | `get/setScopeAll`, `get/setScopeFollowedOnly`, `get/setGroupAcrossSeries`, `get/setRetentionDays` | `:preferences`, `notifications` domain |
   | `listHistory()` / `markHistoryRead(id)` / `markAllHistoryRead()` / `deleteHistoryItem(id)` / `unreadCount()` | `Notifications.history`, mutations emit `unreadCountChanged` |
   | `addListener` / `removeListeners` | stubs, existing convention |

   `NotificationDisplay` also calls the module's companion `notifyUnreadCountChanged(count)` after
   every history insert (foreground and background alike), so the badge stays live even while the
   config/history screens aren't mounted.
5. `NotificationsBridgeMappers.kt` — `toWritableMap()`/`toWritableArray()` extensions for
   `NotificationGroupInfo`, `NotificationUrlInfo`, `NotificationHistoryItem`.
6. `frontend/src/shared/bridge/notifications.ts` — interfaces mirroring the three data classes
   above, a `NotificationsBridge` object wrapping the positional native calls behind named-argument
   methods (matching `PreferencesBridge`/`CacheBridge`'s convention), and
   `NotificationsEventEmitter` for `newNotificationReceived`/`unreadCountChanged`.

## Files created

- `android/notifications/src/main/kotlin/com/mymangareader/notifications/NotificationChannelState.kt`
- `android/notifications/src/main/kotlin/com/mymangareader/notifications/NotificationPreferenceKeys.kt`
- `android/app/src/main/kotlin/com/mymangareader/NotificationChannelSync.kt`
- `android/app/src/main/kotlin/com/mymangareader/NotificationsBridgeModule.kt`
- `android/app/src/main/kotlin/com/mymangareader/NotificationsBridgeMappers.kt`
- `frontend/src/shared/bridge/notifications.ts`
- `android/app/src/test/kotlin/com/mymangareader/NotificationChannelSyncTest.kt` (Robolectric)
- `android/app/src/test/kotlin/com/mymangareader/NotificationsBridgeModuleTest.kt` (wiring only —
  `Arguments.createMap()` needs the native `reactnativejni` lib, unavailable under plain JVM tests,
  same limitation as `CacheBridgeModuleTest`/`DigestBridgeModuleTest`; behavior is covered by the
  real-device smoke test)

## Files modified

- `android/notifications/.../NotificationResolver.kt`, `NotificationConnectionGate.kt` — take
  `NotificationChannelState` instead of reading the `enabled` preference.
- `android/app/.../NotificationDisplay.kt` — reuses `NotificationChannelSync`'s public channel-id
  constant, `NotificationPreferenceKeys.GROUP_ACROSS_SERIES`, emits `unreadCountChanged`.
- `android/app/.../NotificationConnectionService.kt` — reuses `NotificationChannelSync`'s public
  channel-id constant.
- `android/app/.../MainApplication.kt`, `AppReactPackage.kt` — wire `NotificationChannelSync`,
  `Notifications`, `NotificationConnectionGate` through to the bridge module.
- `android/app/.../NotificationsBindingsModule.kt` — binds `NotificationChannelSync` to
  `NotificationChannelState` alongside the existing `NotificationDisplay`→`NotificationPoster`
  binding.
- Existing `:notifications` tests (`NotificationResolverTest`, `NotificationConnectionGateTest`,
  `NotificationEventPipelineTest`) updated to fake `NotificationChannelState` instead of writing the
  removed `enabled` preference.

## Acceptance criteria

- `isChannelEnabled()` reflects the real channel's current importance (Robolectric-verified,
  including the globally-disabled-notifications case).
- `openChannelSettings()` launches the correct system Intent (Robolectric-verified via
  `shadowOf(application).nextStartedActivity`).
- Every group/URL mutation re-evaluates the connection gate and starts/stops the service
  accordingly.
- `unreadCountChanged` fires on every history mutation that can change the count, and on every
  `NotificationDisplay.post` call (foreground or background).
- `koverVerify` and Jest thresholds both pass; `tsc --noEmit` passes for the new bridge file.

## Project-pattern checklist

- One NativeModule for this whole domain, not one per screen.
- RN-side methods take a single named-argument object; the underlying Kotlin `@ReactMethod`s stay
  positional (RN's own bridge mechanism) — same split already used by `shared/bridge/preferences.ts`.
- No business logic in the bridge itself — every decision lives in `Notifications`/
  `NotificationChannelSync`/`Preferences`.
