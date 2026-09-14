# Task 009 — RN: in-app history screen (read/unread, badge, delete) + Kotlin retention purge on boot

## Why last

Depends on the bridge (007) for history CRUD and on the config screen (008) already having wired
`retentionDays` — this task is the last consumer of that value plus the one new piece of Kotlin
boot-time behavior (the purge).

## Navigation decision (changed from the original draft)

The original draft assumed a header bell icon. Decided instead: **the Notifications screen is a
4th tab** in `MainNavigator` (Following / Library / Notifications / Config), badged with the
unread count via `tabBarBadge` — simpler to wire given the existing bottom-tab structure, and it
replaces the `Routes.NOTIFICATIONS` stack screen that existed as an unreachable placeholder
(`screens/notifications/NotificationsScreen.tsx`, no entry point anywhere) since an earlier task.
That placeholder is deleted; the route now lives in `MainNavigator`, removed from `RootNavigator`.

## What was built

### Kotlin — retention purge on boot

`NotificationRetentionPurge` (`android/notifications`) — a small `@Singleton` class (not a reuse
of `:tools`' `BackgroundExecute`, whose `suspend () -> String` signature is tied to caching a
fetched string; this purge only deletes rows, nothing to cache): reads
`NotificationPreferenceKeys.RETENTION_DAYS` via `Preferences`, and if set, calls
`Notifications.history.deleteOlderThan(now - retentionDays days)`. No preference set yet → no-op
(never guesses a default). `now` is an injectable parameter (defaults to
`System.currentTimeMillis()`) so the exact cutoff boundary is testable without mocking the clock.

Wired into `MainApplication.onCreate()` as a third `applicationScope.launch { ... }`, same
fire-and-forget spirit as the existing OTA check/stable-boot calls — the `SupervisorJob` scope
already means a failure here can't affect the other boot jobs, and nothing awaits it, so it never
blocks the splash gate.

### RN — history screen + tab

- `screens/notifications/notifications.hooks.ts`:
  - `useNotificationHistory` — loads history rows + unread count, maps each raw
    `NotificationHistoryItem` to a `NotificationHistoryRow` with a `bodyText` built by the same
    rule `NotificationDisplay.kt`'s `buildBody()` applies (count > 1 → "N new chapters available";
    exactly 1 chapter with a known number → "Chapter X available"; otherwise → "New chapter
    available" — kept in sync by hand since it's plain display text, not a bridge contract).
    Reloads on `unreadCountChanged` (native-origin event) so the list and the count never drift
    apart. Exposes `markRead`/`markAllRead`/`deleteItem`, each reloading after the mutation.
  - `useUnreadNotificationsCount` — the badge's own hook: reads the initial count then listens for
    `unreadCountChanged`. Lives here (not inline in `MainNavigator`) since it's notifications
    domain logic, not navigation logic — `MainNavigator` only imports and renders with it.
- `screens/notifications/notifications.screen.tsx` — top bar (title + "mark all as read", hidden
  when the list is empty), an empty-state message, and a `FlatList` of `HistoryItem` rows. Tapping
  an unread row marks it read (README decision 7's tap-marks-read rule, applied here for the
  in-app row too) then navigates to `Routes.SERIES_DETAIL` — always with `origin: 'LIBRARY'` as
  the fallback destination, since there's no `NavOrigin` variant for "came from the notifications
  tab" and adding one isn't worth it for this single return path.
- `screens/notifications/components/history-item/` — dumb component: unread dot, series name,
  body text, relative timestamp (`DateTool.format.to.relative`, reused rather than reimplemented),
  a delete button. No bridge/service import.
- `navigation/MainNavigator.tsx` — 4th `Tab.Screen` (`Routes.NOTIFICATIONS`), `Bell` icon
  (`lucide-react-native`, already used for the other tab icons), `tabBarBadge` driven by
  `useUnreadNotificationsCount()`.
- `navigation/RootNavigator.tsx` — the old `Routes.NOTIFICATIONS` stack screen and its import
  removed.
- `navigation/routes.ts` — `Routes.NOTIFICATIONS` added to `BOTTOM_NAV_ROUTES`.
- i18n: `navNotifications` (tab label) plus the `notificationsHistory*` strings (title, empty
  state, mark-all-read, delete, the 3 body-text variants) in both `ptBR`/`en`.

## Files created

- `android/notifications/src/main/kotlin/com/mymangareader/notifications/NotificationRetentionPurge.kt`
- `android/notifications/src/test/kotlin/com/mymangareader/notifications/NotificationRetentionPurgeTest.kt`
- `frontend/src/screens/notifications/notifications.{hooks.ts,screen.tsx,styles.ts,types.ts}`
  (+ `notifications.hooks.tests.ts`, `notifications.tests.tsx`, `index.ts`)
- `frontend/src/screens/notifications/components/history-item/` (component + styles + tests + index.ts)

## Files modified

- `android/app/src/main/kotlin/com/mymangareader/MainApplication.kt` — injects
  `NotificationRetentionPurge`, fires it in `onCreate()`.
- `android/notifications/src/test/kotlin/com/mymangareader/notifications/NotificationTestFakes.kt`
  — extracted `FakeNotificationHistoryDao`/`FakePreferenceDao` here (were `private class` in
  `NotificationsTest.kt`/`NotificationResolverTest.kt`, colliding with this new test file's own
  need for both — same file-scoped-`private`-doesn't-prevent-module-level-redeclaration issue
  already documented in earlier tasks).
- `android/notifications/src/test/kotlin/com/mymangareader/notifications/NotificationsTest.kt`,
  `NotificationResolverTest.kt` — their local fake classes removed in favor of the shared ones.
- `frontend/src/navigation/{routes.ts,MainNavigator.tsx,RootNavigator.tsx}` — see above.
- `frontend/src/screens/notifications/NotificationsScreen.tsx` — deleted (placeholder replaced).
- `frontend/src/shared/i18n/strings.ts` — new keys.
- `frontend/package.json` — `coverageThreshold` bumped (functions 81→82) — coverage rose.

## Acceptance criteria

- Purge call never blocks the splash gate — it's a `SupervisorJob`-scoped, unawaited
  `applicationScope.launch`, same as the other boot warm-ups.
- Retention boundary test passes: an item exactly at the cutoff is kept, one ms older is purged
  (`NotificationRetentionPurgeTest`).
- "Mark all as read" reloads and zeroes the unread badge (covered via the hook's reload +
  `unreadCountChanged` re-read).
- Deleting an item removes it from the list and, if unread, the badge count follows via the same
  reload/event mechanism.
- No dumb component under this screen imports the bridge/service directly (verified: `HistoryItem`
  takes only primitives/callbacks).
- `tsc --noEmit`, ESLint, Jest (988 tests), Kotlin (`:notifications`/`:app` unit tests, ktlint,
  `koverVerify`) all pass; JS coverage floor bumped since it rose.

## Project-pattern checklist

- Purge follows the existing fire-and-forget `applicationScope.launch` idiom already used for the
  OTA check/stable-boot calls, rather than forcing a reuse of `BackgroundExecute` whose signature
  doesn't fit this use case.
- The badge is built specifically for this one tab (`useUnreadNotificationsCount`), not as a
  generic "badge manager" — it's the first badge in the app and nothing else needs one yet.
