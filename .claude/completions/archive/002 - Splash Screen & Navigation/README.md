# Plan 002 — Splash Screen & Navigation

## Context

The app today opens via `SplashActivity` (Kotlin), which runs the OTA check + a blocking sync
(listSeries + syncBff) and then launches `MainActivity` (RN). The RN side goes straight to Library
or Config with no visual feedback during that wait. This plan:

- Removes the blocking sync from `SplashActivity` (moves it to RN via `StartupModule`)
- Installs `react-navigation` as the navigation foundation
- Implements the animated visual splash in RN (overlay, not a route)
- Establishes the complete route graph (with placeholders for future screens)

`SplashActivity` keeps its role as the Android entry point and retains `Theme.Splash`
(windowBackground) to prevent the black flash while RN initialises.

---

## Architecture decisions

### Navigation library
Install `@react-navigation/native` + `@react-navigation/native-stack` +
`@react-navigation/bottom-tabs`. Foundation that all future plans depend on. A Stack navigator
wraps all screens; tabs live inside the navigator.

### `StartupModule` — what it exposes to RN
New Native Module (`StartupModule`, JS name `"StartupModule"`):
- `startup.hasServerConfigured() → Promise<boolean>` — reads `ServerConfigDao.getAll()`
- `startup.hasFollowedSeries() → Promise<boolean>` — reads `FollowedSeriesDao.getAllIds()`
- `startup.syncBlocking() → Promise<{ success: boolean }>` — delegates to `SplashSyncCoordinator.sync()`
- `startup.syncInBackground() → void` — same, without awaiting
- `startup.drainSyncQueue() → void` — stub (resilient queue implemented in a future plan)
- `startup.isSeriesFollowed(seriesId: string) → Promise<boolean>` — reads `FollowedSeriesDao.isFollowed()`; resolves `NavOrigin` for deep links
- `startup.getRestoredRoute() → Promise<string | null>` — reads `SharedPreferences("app_lifecycle")` + `ProcessLifecycleMarker`
- `startup.notifyRouteChanged(route, isRootRoute, rootRoute?) → void` — writes `SharedPreferences("app_lifecycle")`

### Cache and recent sync window (unchanged)
- In-memory cache of listSeries: 2 min, already in `LibraryModule` — unchanged
- Recent sync window: 5 min via `lastSuccessfulSyncAtMs` in `UiPreferencesEntity` — migrated from
  `SplashActivity` to `SplashSyncCoordinator`

### Process lifecycle state
`SharedPreferences("app_lifecycle")` with keys:
- `last_stopped_at_ms` — written in `MainActivity.onStop()`
- `was_on_root_route` — boolean
- `last_route` — route with real IDs (e.g. `series/42?origin=LIBRARY`)
- `last_root_route` — name of the last root tab

"Process alive" detected by `object ProcessLifecycleMarker { var isAlive = false }` — not by
prefs, to distinguish force-stop from simple app switching.

### Splash UX (RN)
- Minimum duration of **5 seconds**
- Progress bar: uses real sync milestones when available: 0.3 (listSeries) / 0.6 (syncBff) / 0.9
  (chapters). When no milestones (sync skipped due to recent cache), grows linearly from 0 to 0.9
  over 5 s. Bar never goes backward: `max(realMilestone, linearProgress)`
- Goes to 1.0 only when navigation fires
- Shows logo + progress bar + app version (via `OtaModule.getVersions()` — already exists)
- "Apply update" button appears if OTA finishes downloading while splash is visible
  (listening to `OtaEmitter` event `'otaBundleReady'` — already exists in `native/OtaModule.ts`)
- The splash is an **absolute overlay** (`position: absolute`, high `zIndex`) on top of the
  `NavigationContainer` — not a stack route, to avoid the bottom nav "pushing" the splash
  before it disappears
- Navigation fires after minimum time AND sync complete (or timeout)

### Post-splash decision flow
`useSplash.ts` decides the destination:
1. No server → `setup` (SetupScreen already exists, with `onComplete` prop)
2. Server configured, no followed series → `library` (LibraryScreen already exists, no props)
3. Server configured, with followed series → `following` (placeholder in this plan; Plan 004)

### Restored route / skip splash logic
`startup.getRestoredRoute()` returns a route string or `null`. Conditions to return a route:
- Process still alive AND:
  - Was on a deep route (series/reader): always skips splash
  - Was on a root tab: skips if `last_stopped_at_ms` < 5 min

When splash is skipped: sync in background + drain queue.

### Deep links
Accepted schemes: `mykavita://` and `mymangas://` (equivalent). URL patterns:
- `{scheme}://series/{seriesId}` → SeriesDetail
- `{scheme}://library/{libraryId}/series/{seriesId}` → SeriesDetail (`libraryId` accepted in
  path to match Kavita's pattern, never read in domain)
- `{scheme}://series/{seriesId}/manga/{chapterId}` → Reader
- `{scheme}://library/{libraryId}/series/{seriesId}/manga/{chapterId}` → Reader

Resolved in `MainActivity` via Intent; passed to `StartupModule`. Deep link takes priority over
restored route and normal flow. `NavOrigin` for deep links resolved by
`startup.isSeriesFollowed(seriesId)`.

### Navigator routes
```
STARTUP        "startup"                     ← initial decision, no UI
SETUP          "setup"                       ← SetupScreen (already exists)
LIBRARY        "library"                     ← LibraryScreen (already exists)
FOLLOWING      "following"                   ← placeholder (Plan 004)
SEARCH         "search"                      ← placeholder (Plan 009)
CONFIG         "config"                      ← ConfigScreen (already exists)
NOTIFICATIONS  "notifications"               ← placeholder (Plan 008)
SERIES_DETAIL  "series/:seriesId"            ← placeholder (Plan 006)
READER         "reader/:seriesId/:chapterId" ← placeholder (Plan 007)

BOTTOM_NAV_ROUTES = { library, following, search, config }
```

**LIBRARY and FOLLOWING are distinct routes** (not a template route with argument): identical routes
with `launchSingleTop=true` would make tab switching ignored ("already here") — bottom nav would
"flash" and get stuck. Distinct routes give independent state in each screen hook.

### Bottom nav visibility
- Only on the 4 root routes, only when server is configured
- "Following" tab only if `hasFollowedSeries` is true
- Never when `ConfigScreen` is in a sub-screen (detected via `onRegisterBackHandler` — pattern
  already in `ConfigScreen.tsx`; the navigator needs to know via callback if it's in a sub-screen)
- A tab is not rendered if its route doesn't exist in the graph

### Smart back in deep screens
**SeriesDetail.onBack:**
1. `navigation.goBack()` trying to pop to `originRoute`
2. If not in backstack (deep link) → explicitly navigates to `originRoute`

**Reader:** uses `popUpTo(SERIES_DETAIL)` when navigating to avoid stacking multiple instances.

---

## Kotlin layers — what is reused, extended and created

### Reused without modification
| Component | Layer | What it provides |
|---|---|---|
| `KavitaSeriesFeature.listSeries()` | `:features` | direct call by `SplashSyncCoordinator` |
| `BffFeature.syncBff()` | `:features` | same |
| `FollowedSeriesDao.getAllIds()` / `isFollowed()` | `:core` | read by `StartupModule` |
| `ServerConfigDao.getAll()` | `:core` | read by `StartupModule` |
| `UiPreferencesDao.get()` / `upsert()` | `:core` | read/written by `SplashSyncCoordinator` |
| `UiPreferencesEntity.lastSuccessfulSyncAtMs` | `:core` | field already exists, no migration |
| `OtaManager` + all OTA handlers | `:app` | remain intact in `SplashActivity` |
| `FeaturesModule` | `:features` | no new bindings needed |

### Extended (modifies existing)
| File | Change |
|---|---|
| `KavitaSeriesFeature.kt` | Adds `suspend fun listChaptersForSeries(seriesId: String): Result<List<ChapterDto>>` (sequential, for `SplashSyncCoordinator`) |
| `SplashActivity.kt` | Removes `setContentView`, `syncJob`, `joinAll` awaiting sync. Keeps intact: all OTA logic (jobs, handlers, dialogs, `recordBootStart`, `applyRollbackIfNeeded`, `recordStableBoot`). Launches `MainActivity` as soon as OTA is known |
| `MainActivity.kt` | Adds `onStop()` that writes `last_stopped_at_ms` to `SharedPreferences("app_lifecycle")` |
| `AppReactPackage.kt` | Adds `StartupModule` in `createNativeModules` |

### Created from scratch
| File | Layer | Responsibility |
|---|---|---|
| `SplashSyncCoordinator.kt` | `:features` | 3-step sync, 30 s budget, 5 min window, `StateFlow<Float>` with milestones 0.3/0.6/0.9. Injects `KavitaSeriesFeature`, `BffFeature`, `FollowedSeriesDao`, `UiPreferencesDao` |
| `StartupModule.kt` | `:app` | Native Module with 8 methods. Injects `ServerConfigDao`, `FollowedSeriesDao`, `SplashSyncCoordinator`. Contains `ProcessLifecycleMarker`. Reads/writes `SharedPreferences("app_lifecycle")` |

---

## Frontend layers — what is reused, extended and created

### Reused without modification
| File | What it provides |
|---|---|
| `shared/bridge/config.ts` | `ConfigRepository.getServerConfigs()` + `getUiPreferences()` — bootstrap in `App.tsx` unchanged |
| `shared/i18n/useStrings.ts` | `useStrings()` and `useLanguage()` — all new components use them directly |
| `shared/i18n/LanguageContext.ts` | Provider already wraps everything in `App.tsx`; SplashScreen inherits language at no cost |
| `native/OtaModule.ts` | `OtaModule.getVersions()` to show version in splash; `OtaEmitter` event `'otaBundleReady'` for update button |
| `screens/setup/SetupScreen.tsx` | Route `setup` calls the existing component; prop `onComplete` → navigates to `library` |
| `screens/library/LibraryScreen.tsx` | Route `library` calls the existing component; no props |
| `screens/config/ConfigScreen.tsx` | Route `config` calls the existing component; prop `onRegisterBackHandler` already exists and works |

### Extended (modifies existing)
| File | Change |
|---|---|
| `App.tsx` | Wraps everything with `NavigationContainer`. State `'loading'` now renders `SplashScreen` (overlay) instead of empty `<View>`. Removes manual `BackHandler` (react-navigation assumes that responsibility). Removes manual `BottomBar` (replaced by `MainNavigator`) |
| `shared/components/BottomBar.tsx` | Retired from rendering in `App.tsx`. File may be kept as reference or removed if `MainNavigator` replaces it completely — decision at task time |
| `shared/i18n/strings.ts` | Adds keys: tab labels (`navLibrary`, `navFollowing`, `navSearch`, `navConfig`) and splash strings (`splashVersion`) |

### Created from scratch
| File | Responsibility |
|---|---|
| `shared/bridge/startup.ts` | Typed wrappers for `StartupModule`: 8 functions with TypeScript types |
| `navigation/routes.ts` | Route constants, `NavOrigin` enum, URL helpers with origin |
| `navigation/RootNavigator.tsx` | Stack navigator with all routes + deep links for both schemes |
| `navigation/MainNavigator.tsx` | Bottom tabs: Search \| Library \| Following (conditional) \| Config. `launchSingleTop`, `saveState`, `restoreState`. Hidden outside root routes and in Config sub-screen |
| `screens/splash/useSplash.ts` | 5 s timer + mixed progress (real milestones vs. linear) + setup/library/following decision + OTA button signal via `OtaEmitter` |
| `screens/splash/SplashScreen.tsx` | Absolute overlay: logo, animated bar, version (`OtaModule.getVersions()`), OTA button |
| `screens/following/FollowingScreen.tsx` | Placeholder — route name + back button (Plan 004) |
| `screens/search/SearchScreen.tsx` | Placeholder (Plan 009) |
| `screens/notifications/NotificationsScreen.tsx` | Placeholder (Plan 008) |
| `screens/series-detail/SeriesDetailScreen.tsx` | Placeholder with smart back: tries pop to `originRoute`; if fails (deep link), navigates explicitly (Plan 006) |
| `screens/reader/ReaderScreen.tsx` | Placeholder with back to series; protected against deep link without backstack (Plan 007) |
| `shared/components/AppShellState.tsx` | Context with `hasFollowedSeries`, `hasServerConfigured`, `unreadNotificationCount` — avoids prop drilling in navigator |

---

## Files to create / modify

| File | Action |
|---|---|
| `android/features/.../kavita/KavitaSeriesFeature.kt` | **extend** |
| `android/features/.../SplashSyncCoordinator.kt` | **create** |
| `android/app/.../SplashActivity.kt` | **extend** |
| `android/app/.../StartupModule.kt` | **create** |
| `android/app/.../MainActivity.kt` | **extend** |
| `android/app/.../AppReactPackage.kt` | **extend** |
| `frontend/package.json` | **extend** — react-navigation deps |
| `frontend/src/shared/bridge/startup.ts` | **create** |
| `frontend/src/navigation/routes.ts` | **create** |
| `frontend/src/navigation/RootNavigator.tsx` | **create** |
| `frontend/src/navigation/MainNavigator.tsx` | **create** |
| `frontend/src/screens/splash/useSplash.ts` | **create** |
| `frontend/src/screens/splash/SplashScreen.tsx` | **create** |
| `frontend/src/screens/following/FollowingScreen.tsx` | **create** (placeholder) |
| `frontend/src/screens/search/SearchScreen.tsx` | **create** (placeholder) |
| `frontend/src/screens/notifications/NotificationsScreen.tsx` | **create** (placeholder) |
| `frontend/src/screens/series-detail/SeriesDetailScreen.tsx` | **create** (placeholder + smart back) |
| `frontend/src/screens/reader/ReaderScreen.tsx` | **create** (placeholder + back to series) |
| `frontend/src/shared/components/AppShellState.tsx` | **create** |
| `frontend/src/shared/i18n/strings.ts` | **extend** — new tab + splash keys |
| `frontend/src/App.tsx` | **extend** — NavigationContainer + splash overlay |

---

## Tasks

| # | Task | Module | Status | Blocks | Blocked by |
|---|------|--------|--------|--------|------------|
| 001 | features — create `SplashSyncCoordinator` (3 steps, 5 min window, 30 s budget, milestones 0.3/0.6/0.9) + extend `KavitaSeriesFeature` with `listChaptersForSeries` | `:features` | todo | 002 | — |
| 002 | app — create `StartupModule` (8 methods, `SharedPreferences`, `ProcessLifecycleMarker`) | `:app` | todo | 003 | 001 |
| 003 | app — extend `SplashActivity` (remove sync, keep OTA) + extend `MainActivity` (`onStop`) + extend `AppReactPackage` (register `StartupModule`) | `:app` | todo | 004 | 002 |
| 004 | frontend — install react-navigation deps + create `routes.ts` + create `startup.ts` bridge | `frontend` | todo | 005, 007 | 003 |
| 005 | frontend — create `useSplash.ts` (5 s timer, mixed progress, destination decision, OTA button via `OtaEmitter`) | `frontend` | todo | 006 | 004 |
| 006 | frontend — create `SplashScreen.tsx` (absolute overlay: logo, animated bar, version via `OtaModule.getVersions()`, OTA button) | `frontend` | todo | 009 | 005 |
| 007 | frontend — create placeholder screens: Following, Search, Notifications, SeriesDetail (smart back), Reader (back to series) | `frontend` | todo | 008 | 004 |
| 008 | frontend — create `AppShellState.tsx` + create `MainNavigator.tsx` (conditional tabs, saveState/restoreState, hidden outside root routes and in Config sub-screen) | `frontend` | todo | 009 | 007 |
| 009 | frontend — create `RootNavigator.tsx` (complete graph + deep links for both schemes) + extend `App.tsx` (NavigationContainer + splash overlay + route persistence listener) | `frontend` | todo | 010 | 006, 008 |
| 010 | frontend — extend `strings.ts` (tab labels `navLibrary/navFollowing/navSearch/navConfig` + `splashVersion`, PT-BR and EN) | `frontend` | todo | 011 | 004 |
| 011 | Build + install on device + manual verification (14 scenarios) | device | todo | — | 009, 010 |
| 012 | Docs — commit with implementation documentation | docs | todo | — | 011 |

---

## Acceptance criteria per task

**Task 001** — `SplashSyncCoordinator.sync()` skips if `lastSuccessfulSyncAtMs < 5 min`, emitting
`0.9f`. When it runs: 3 sequential steps, 30 s budget via `withTimeoutOrNull`, per-series catch
without aborting the others, milestones `0.3f / 0.6f / 0.9f`, updates `lastSuccessfulSyncAtMs` on
success.

**Task 002** — `NativeModules.StartupModule.hasServerConfigured()` returns Promise.
`getRestoredRoute()` returns `null` on first install. `notifyRouteChanged()` writes prefs without
crash.

**Task 003** — `SplashActivity` launches `MainActivity` in ~1 s without blocking on sync. Full OTA
flow (download, dialogs, restart button, `recordStableBoot`) works as before.
`MainActivity.onStop()` writes `last_stopped_at_ms`.

**Task 004** — `yarn start` compiles without errors. Types in `startup.ts` match `StartupModule`
signatures. Route constants exported correctly.

**Task 005** — Bar never goes backward. Real milestones advance when available; linear time fills
the rest. Navigation fires after minimum time AND sync complete. OTA button signalled on receiving
`'otaBundleReady'` event.

**Task 006** — Splash is an absolute overlay (not a route). Logo, animated bar, app version
visible. OTA button appears on signal from `useSplash`. No jitter. Splash disappears only after
next screen is composed underneath.

**Task 007** — Placeholders compile and are navigable. SeriesDetail: smart back works with and
without origin tab in backstack. Reader: returns to SeriesDetail; protected against deep link.

**Task 008** — Bottom bar visible only on the 4 root routes, only with server configured. "Following"
tab absent when `hasFollowedSeries` is false. Config sub-screen hides the bar.
`saveState`/`restoreState` preserve state when switching tabs.

**Task 009** — All startup paths work (verification table). Deep links for both schemes navigate to
the correct destination. Persistence listener writes concrete route to prefs. `App.tsx` without
manual `BackHandler` (react-navigation assumes that responsibility).

**Task 010** — No hardcoded strings in any new component. PT-BR and EN complete.

**Task 011** — Manual walkthrough of all 14 scenarios on device.

---

## Verification

```bash
# Kotlin tests
cd android && ./gradlew :features:test :app:test

# JS tests
cd frontend && yarn test

# Build + deploy (apply versionar-build skill first)
make build-android && make build-bundle && make deploy
```

| # | Scenario | Expected result |
|---|---------|-----------------|
| 1 | New install | Splash 5 s → SetupScreen |
| 2 | Server configured, no followed series | Splash 5 s → Library |
| 3 | Server configured + followed series | Splash 5 s → Following (placeholder) |
| 4 | Switch apps → return within 5 min | No splash, same root tab restored |
| 5 | Switch apps → return after 5 min | Splash again |
| 6 | Force stop → reopen | Splash (new process) |
| 7 | Inside series → switch apps → return | No splash, goes straight to series screen |
| 8 | Recent sync (< 5 min) | Bar goes to 0.9 quickly with no network call |
| 9 | Deep link `mykavita://series/42` | Navigates to SeriesDetail (placeholder) |
| 10 | Deep link `mymangas://series/42/manga/7` | Navigates to Reader (placeholder) |
| 11 | Deep link (followed series) → back | SeriesDetail returns to Following |
| 12 | Deep link (unfollowed series) → back | SeriesDetail returns to Library |
| 13 | OTA available during splash | Button appears → click restarts → new splash with new bundle |
| 14 | "Following" tab before following a series | Tab does not appear in bottom nav |
