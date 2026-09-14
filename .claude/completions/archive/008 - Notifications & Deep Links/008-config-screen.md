# Task 008 — RN: `config/notifications/` — groups CRUD, toggles, retention setting

## Why after 007

Needs the bridge to exist before any RN code can call it.

## Android channel reality (see Task 007 / README Decision 10)

There is no real "enable notifications" switch: Android does not let this app change an
already-created channel's importance programmatically, only the user can from the system's own
per-channel settings screen. So the config screen's "channel" control is not a `Switch` bound to a
writable flag — it is a row/button that:
1. Shows the channel's current state, read via `NotificationsService.channel.isEnabled()`.
2. On press, calls `NotificationsService.channel.openSettings()` (launches the system screen for
   that channel — nothing else).
3. Re-reads `isEnabled()` whenever the app returns to foreground (`AppState` 'active' event) — the
   user may have just come back from that system screen, so the displayed state stays accurate
   without any app-side write.

## Bridge gap found and fixed (Task 007 follow-up)

`NotificationsBridgeModule` (Task 007) exposed `listGroups()` but no way to list a specific
group's URLs — `Notifications.group(id).getUrls()`/`getInfo()` exist Kotlin-side but were never
wired to the bridge. Since this screen needs exactly that (a group card's URL list), a
`listGroupUrls(groupId)` method was added end-to-end as part of this task: the `@ReactMethod` in
`NotificationsBridgeModule.kt`, the `toUrlsWritableArray()` mapper in
`NotificationsBridgeMappers.kt`, the `.ts` bridge method, and `NotificationsService.groups.urls.list`.

## What was built

1. `shared/services/notifications/notifications.services.ts` — `NotificationsService`, thin
   wrapper over `NotificationsBridge` (already named-argument, no positional mapping to redo),
   namespaced by responsibility: `channel` (isEnabled/openSettings), `groups` (list/add/remove +
   nested `urls.list/add/remove`), `scope` (getAll/setAll/getFollowedOnly/setFollowedOnly),
   `groupAcrossSeries` (get/set), `retentionDays` (get/set), `history`
   (list/markRead/markAllRead/delete/unreadCount — exposed here for Task 009 to consume, unused by
   this screen). No `bound()` — groups are the top-level unit, no nested id worth fixing.
2. `screens/config/notifications/` (matching `config/server/`'s file shape):
   - `notifications.hooks.ts` — three hooks: `useNotificationChannel` (read + `AppState`-driven
     refresh + `openSettings`), `useNotificationPrefs` (the 4 preference values, with
     `scopeAll`/`scopeFollowedOnly` mutual exclusivity enforced here, UI-only per README Decision
     6), `useNotificationGroups` (groups + per-group URL lists, CRUD, `canAddUrl`/`canRemoveUrl`/
     `nextPriority` mirroring `useServer`'s own).
   - `notifications.screen.tsx` — the channel row (button, not a toggle), the 3 Switch rows
     (`scopeAll`, `scopeFollowedOnly` mutually locking, `groupAcrossSeries`), a retention
     stepper (1–365 days), then the groups list with add/remove group and add/remove URL, each
     via its own modal and context menu — same interaction shape as `ServerScreen`.
   - `notifications.types.ts`, `notifications.styles.ts`.
   - `components/row/`, `components/group-card/`, `components/group-modal/`,
     `components/url-modal/` — dumb components, each with its own `.tests.tsx`. `GroupModal` only
     offers add (no rename — a group's name/topic change would need re-subscribing the live
     connection, out of scope; remove + re-add covers it). `UrlModal` has no "test connection"
     (unlike `config/server`'s) — a notification URL is a publish endpoint, not something the
     bridge exposes a reachability probe for.
3. Route registered in `config.types.ts` (`ConfigSubScreen`), `config.screen.tsx` (menu entry +
   router case).
4. i18n: all new strings added to `Strings` + both `ptBR`/`en` blocks in
   `shared/i18n/strings.ts`, including `configMenuNotifications` for the Config menu entry.
5. `jest.setup.js`'s `NATIVE_MODULE_NAMES` list — Task 007 added `NotificationsBridgeModule` as a
   real `NativeModules` read but never added it to this list, so any test importing the
   `shared/bridge` barrel crashed on `new NativeEventEmitter(undefined)`. Fixed here since it was
   silently breaking coverage runs before this task's own tests could even be written.

## Files created

- `frontend/src/shared/services/notifications/notifications.services.ts` (+ `.tests.ts`, `index.ts`)
- `frontend/src/screens/config/notifications/notifications.{screen.tsx,hooks.ts,types.ts,styles.ts}`
  (+ `notifications.tests.tsx`, `notifications.hooks.tests.ts`, `index.ts`)
- `frontend/src/screens/config/notifications/components/{row,group-card,group-modal,url-modal}/`
  (component + styles + tests + index.ts each)
- `frontend/src/shared/bridge/__tests__/notifications.test.ts` — direct coverage of the
  `NotificationsBridge` wrapper object itself (positional-args unwrap), same gap `cache.ts` still
  has but not worth carrying forward here.

## Files modified

- `android/app/src/main/kotlin/com/mymangareader/NotificationsBridgeModule.kt` — added
  `listGroupUrls`.
- `android/app/src/main/kotlin/com/mymangareader/NotificationsBridgeMappers.kt` — added
  `toUrlsWritableArray()`.
- `frontend/src/shared/bridge/notifications.ts` — added `listGroupUrls`.
- `frontend/src/shared/bridge/index.ts` — export `./notifications` (was missing since Task 007).
- `frontend/src/screens/config/config.types.ts`, `config.screen.tsx` — new `'notifications'`
  sub-screen + menu entry.
- `frontend/src/shared/i18n/strings.ts` — new `notifications*`/`configMenuNotifications` keys.
- `frontend/jest.setup.js` — `NotificationsBridgeModule` added to `NATIVE_MODULE_NAMES`.
- `frontend/package.json` — `coverageThreshold` bumped (statements/lines 88→92, functions 79→81,
  branches unchanged at 90) — coverage rose after this task.

## Acceptance criteria

- Adding/removing a URL from a group persists across a screen remount — covered at the hook level
  with a faked `NotificationsService` (`notifications.hooks.tests.ts`).
- Pressing the "notifications" row calls `NotificationsService.channel.openSettings()`; the
  screen's read of `channel.isEnabled()` re-runs on `AppState` 'active'.
- Turning "all series" on locks "followed only" off (and vice versa); turning the active one back
  off unlocks the other — covered at the hook level.
- No dumb component under this screen imports `NotificationsService` or the bridge directly
  (verified by grep).
- `tsc --noEmit`, ESLint, Jest (968 tests) and Kotlin (`:app` unit tests, ktlint, `koverVerify`)
  all pass; JS coverage floor bumped since it rose.

## Project-pattern checklist

- Method-with-argument convention (one named object, never positional) applied throughout the new
  Service.
- Screen never imports from another screen — only from `shared/`.
- Feature gated by missing config: the screen itself never special-cases "notifications not
  configured" beyond showing an empty group list — the actual gating (service won't start) lives
  in Kotlin (Task 006), not duplicated here as a UI `if`.
