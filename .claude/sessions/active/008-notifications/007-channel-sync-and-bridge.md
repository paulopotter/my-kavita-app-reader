# Task 007 — `NotificationsBridgeModule` + bidirectional Android-channel sync

## Why after 001, 006

The bridge is the RN-facing surface over everything built so far: it needs the schema (001) to
expose groups/history CRUD, and it needs the service (006) to start/stop it whenever config
changes from the RN side.

## What to do

1. `NotificationChannelSync.kt` — keeps the app's own "notifications enabled" preference and the
   real Android notification channel's enabled state in agreement in both directions:
   - App toggle turned off → channel importance set to `NotificationManager.IMPORTANCE_NONE`
     (or channel deleted/recreated, whichever the Android APIs in use actually support reliably).
   - Channel disabled directly from Android system settings → detected (via
     `NotificationManagerCompat`/channel importance check, checked at a sensible point such as
     app foregrounding) and reflected back into the `notifications` preference domain.
2. `NotificationsBridgeModule.kt` (`@ReactMethod` + `Promise`, one NativeModule per responsibility
   per the existing bridge convention):

   | Method | Delegates to |
   |---|---|
   | `listGroups()` / `upsertGroup(group)` / `deleteGroup(id)` | `Notifications.kt` group CRUD |
   | `setEnabled(enabled)` | `:preferences` `notifications` domain + triggers service start/stop re-evaluation + `NotificationChannelSync` |
   | `isEnabled()` | `:preferences` read |
   | `setGroupAcrossSeries(enabled)` / `getGroupAcrossSeries()` | `:preferences` |
   | `setRetentionDays(days)` / `getRetentionDays()` | `:preferences` |
   | `listHistory()` / `markHistoryRead(id)` / `markAllHistoryRead()` / `deleteHistoryItem(id)` | `Notifications.kt` history CRUD |
   | `unreadCount()` | `Notifications.kt` history CRUD |
   | `addListener` / `removeListeners` | stubs, per existing convention |

   Emits an `unreadCountChanged` event (native origin, `NativeEventEmitter`) whenever
   `NotificationDisplay.post` or a history mutation changes the unread count.
3. Register `NotificationsBridgeModule` in `AppReactPackage.kt`'s `createNativeModules()`.
4. `frontend/src/shared/bridge/notifications.ts` — typed bridge interface mirroring the table
   above, following the existing `shared/bridge/*.ts` idiom (interface + `NativeModules.X` +
   `NativeEventEmitter` for `unreadCountChanged`).

## Files to create

- `android/app/src/main/kotlin/com/mymangareader/NotificationChannelSync.kt`
- `android/app/src/main/kotlin/com/mymangareader/NotificationsBridgeModule.kt`
- `frontend/src/shared/bridge/notifications.ts`
- Matching test files for both Kotlin classes and the TS bridge type shape (`tsc --noEmit`).

## Files to modify

- `android/app/src/main/kotlin/com/mymangareader/AppReactPackage.kt`

## Acceptance criteria

- `setEnabled(false)` disables the Android channel; disabling the channel from system settings is
  reflected by `isEnabled()` on next check.
- Every bridge method has a matching Kotlin-side unit test with a faked `Notifications`/
  `Preferences`.
- `unreadCountChanged` fires exactly once per history mutation that changes the count (no
  duplicate/missed emissions in test).
- `koverVerify` and Jest thresholds both pass; floors bumped if coverage rose.

## Project-pattern checklist

- One NativeModule for this whole domain, not one per screen — matches "one NativeModule per
  responsibility" already documented in `architecture.md`.
- Every bridge method with an argument takes it directly (Kotlin `@ReactMethod` args are
  positional by RN's own bridge mechanism); the RN-side named-object convention applies starting
  at the Service layer in Task 008/009, not at this raw bridge layer — consistent with how
  `shared/bridge/*.ts` already looks today (thin typed passthrough, no object-wrapping at the
  bridge boundary itself).
