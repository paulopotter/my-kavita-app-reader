# Task 038 — Splash migration (Phase 5 — Corrections)

**Status:** in progress

> Referenced repeatedly by Tasks 028 and 036 as "a task da splash" but never created in the
> INDEX. `SplashSyncCoordinator.sync()` was reduced to a no-op in Task 028, and
> `seedLibrary()` was already exported from `library.hooks.ts` in Task 036 anticipating this
> task. Now the splash itself moves to the new pattern.

## Objective

By the end of this task the splash references **nothing from the old model**. Concretely:

1. **Kotlin: delete the dead sync machinery.** `SplashSyncCoordinator` (no-op since Task 028) +
   `StartupModule.syncBlocking` / `syncInBackground` / `drainSyncQueue` + the wiring that
   carries `splashSyncCoordinator` through `MainApplication` → `AppReactPackage` → `StartupModule`.
   `StartupBridge.syncBlocking/syncInBackground/drainSyncQueue` removed from `startup.ts`.
   The rest of `StartupModule` (`hasServerConfigured`, `hasFollowedSeries`, `isSeriesFollowed`,
   `getRestoredRoute`, `notifyRouteChanged`) stays — those are boot queries + route-restore, not sync.

2. **Kotlin: delete `SplashActivity` entirely — `MainActivity` becomes the launcher and owns the
   OTA gate, with the Android 12 SplashScreen API (`androidx.core:core-splashscreen`) holding the
   system splash until the gate resolves.**

   *Why the change from "SplashActivity invisible" (tried in rc65):* an Activity always draws its
   own `DecorView` (the `windowBackground`) even with no `setContentView` — device log v61 showed
   `SplashActivity` producing a frame, then `MainActivity` a second one ~225 ms later. That's the
   "dark screen with a jump on each side" the user saw. A translucent Activity is unreliable
   across ROMs. The clean fix is no intermediate Activity at all.

   - `OtaManager.checkAndDownload()` split into `check()` (manifest + policy + version, no
     download) → `OtaDecision` and `download(manifest)` (the old private `downloadAndValidate`).
     **Done in rc65, kept.**
   - `MainActivity.onCreate`, before `super.onCreate()`: `installSplashScreen()` +
     `setKeepOnScreenCondition { !bootGateDone }`. A coroutine runs `applyRollbackIfNeeded()` +
     `recordBootStart()` (moved here from `SplashActivity`) then `check()`:
     - `Blocked` → native dialog, `finish()` (React never mounts).
     - `DownloadPending` → `applicationScope.launch { download() + notify }`, `bootGateDone = true`.
     - else → `bootGateDone = true`.
   - The system splash stays up (held by `core-splashscreen`) from process start until the RN
     splash has painted; `setOnExitAnimationListener` cross-fades the system splash into the RN
     splash so the factory colour → themed colour handoff is a fade, not a cut.
   - `AndroidManifest`: `MAIN`/`LAUNCHER` intent-filter moves to `MainActivity`; `<activity
     SplashActivity>` removed; `MainActivity` theme becomes a `Theme.App.Starting`
     (`windowSplashScreenBackground=@color/splash_background`, `postSplashScreenTheme=@style/AppTheme`).
   - `OtaEventBridge.applyOtaUpdate()` restarts via `MainActivity` (`CLEAR_TASK`), not
     `SplashActivity`.
   - `recordStableBoot()`'s 5 s timer runs on `applicationScope` (was on `SplashActivity`'s
     scope, cancelled by `finish()` — latent bug). **Done in rc65, kept.**

   **Splash background colour model** (decided with the user 2026-09-02):
   - The **system splash** (drawn by `system_server` from `resources.arsc` before any code runs —
     no Room, no Hilt, no `Context`) is necessarily a static `@color/splash_background`. It
     cannot read Room. Keep it a neutral brand colour safe against any future identity.
   - The **RN splash** paints its own background and can read the real colour (Room / config /
     server theme) on its first render; it cross-fades in from the system splash.
   - A new app identity ships in a release: bump `@color/splash_background` and the RN splash's
     fallback together — no flash if the two values match.

3. **Kotlin: pullable OTA state + progress event for RN.** `OtaEventBridge` gains
   `getOtaState()` (snapshot: `{ phase, progress, policy }`) alongside the existing `pendingPolicy`
   pull + `otaBundleReady` push, plus a new `otaDownloadProgress` push event. The background
   `download()` mirrors `OtaManager.downloadProgress` into `OtaEventBridge.notifyDownloadProgress(...)`
   and stores the last value in the companion (so a download that finishes before the RN splash
   mounts isn't lost — the mount reads `getOtaState()` first, then subscribes).

4. **RN: migrate `screens/splash/` to the current screen convention** (kebab-case, role in
   filename, `hooks/`, styles as a separate file, dumb components in their own subfolder). The
   OTA advisory alert becomes a dumb component. `activateFirstServerGroup` folds into a
   screen-local `splash.boot.ts` model.

5. **RN: enrich — Library warm-up via the digest stack.** After `activateFirstServerGroup()`
   and server+auth OK, the splash assembles the Library list (reusing the Library's own
   `assembleLibrary` path, extracted to a pure `screens/library/library.assemble.ts` so the
   splash imports it without pulling React) and calls `seedLibrary(entries, lastUpdatedEpochMs)`.
   Best-effort — a failure never blocks the splash. The RN splash progress bar reflects OTA
   download progress (via `otaDownloadProgress`) + the warm-up, `max(...)` of the parts, same
   pattern the current `useSplash` uses between timer and sync progress.

6. **RN: cut the dead `'following'` destination.** `SplashDestination` becomes
   `'setup' | 'app'`. Which tab opens is already decided by `MainNavigator` via
   `hasFollowedSeries`. `App.tsx`'s `onDone` simplifies to `setup → Routes.SETUP` / `app → 'main'`.
   Minimum-duration floor drops from 5s to ~2s (currently a purely artificial wait).

## Out of scope

- The OTA gate itself (rollback + `required` block + bundle selection) — structurally native,
  moves from `SplashActivity` to `MainActivity`, not removed.
- Resilient sync queue (`drainSyncQueue` was a stub for a future plan — the dead stub is deleted,
  no queue is implemented).
- `getRestoredRoute` / route-restore in `App.tsx`.
- Making the system splash colour dynamic — impossible (runs before code); only the RN splash
  colour becomes themeable, in step 6.

## Steps (rough order — Android and frontend commits stay separate)

**Done in rc65 (kept as the base for the rest):**
- `OtaManager.check()` / `download()` split + `OtaDecision` + `OtaManagerCheckTest`.
- `applicationScope` in `MainApplication`.
- `SplashSyncCoordinator` deleted (+ test + empty `features/startup/`); `StartupModule` sync
  methods + `splashSyncCoordinator` wiring removed from `MainApplication` / `AppReactPackage`.
- `OtaEventBridge.getOtaState()` + `notifyDownloadProgress` + `otaDownloadProgress` +
  companion store + `OtaEventBridgeStateTest`.
- Frontend: `OtaModule.ts` types, `startup.ts` sync methods dropped, `useSplash.ts` no longer
  calls `syncBlocking`, `App.tsx` no longer calls `syncInBackground`.
- Kotlin coverage floor 81 → 83.

**Done in rc66 (Android — the "kill SplashActivity" leg):**
- `SplashActivity.kt` + `activity_splash.xml` + `Theme.Splash` deleted.
- `androidx.core:core-splashscreen` added (`libs.versions.toml` + `:app`).
- `MainApplication`: `applyRollbackIfNeeded` + `recordBootStart` moved here; `bootGate:
  StateFlow<OtaDecision?>` (filled by `check()` on `applicationScope`); `startOtaDownload()`
  (background download + `OtaEventBridge` progress mirror); stable-boot 5s timer on
  `applicationScope`.
- `MainActivity`: launcher, `installSplashScreen()` + `setKeepOnScreenCondition { !gateResolved }`;
  observes `bootGate`, acts on each `OtaDecision` (`Blocked` → release splash + non-cancelable
  dialog; `DownloadPending` → `startOtaDownload` + release; else → release).
- `AndroidManifest`: `MAIN`/`LAUNCHER` + `Theme.App.Starting` on `MainActivity`; `SplashActivity`
  entry gone. `styles.xml`: `Theme.App.Starting` (parent `Theme.SplashScreen`).
- `OtaEventBridge.applyOtaUpdate()` restarts via `MainActivity` (`CLEAR_TASK`).
- No Activity test added — the project has no Activity/`ReactActivity` test precedent; the
  branch logic that has substance is covered by `OtaManagerCheckTest` (which `OtaDecision`) and
  `OtaEventBridgeStateTest` (the progress store). The `when` in `MainActivity` is plain wiring.
- `:app:assembleDebug` green; Kotlin coverage still ≥ 83 (SplashActivity was already uncovered).

**Done in rc67 (kill the black frame between system splash and RN splash):**
- Device log v63 showed a ~1.35 s black frame: `core-splashscreen` released the system splash as
  soon as the OTA gate resolved (fast), but the RN splash only paints ~1.3 s later.
- `StartupModule.markUiReady()` + `BootUiReadySignal` (process-scoped one-way flag).
  `SplashScreen.tsx` calls `StartupBridge.markUiReady()` in a mount effect.
- `MainActivity.setKeepOnScreenCondition` now holds until **gate resolved AND
  `BootUiReadySignal.ready`**, with a `SPLASH_MAX_HOLD_MS = 4000` safety cap for a JS hang.
- `Makefile` `APP_ACTIVITY` `.SplashActivity` → `.MainActivity` (deploy `am start` was broken).
- `BootUiReadySignalTest`; `startup.test.ts` gains `markUiReady`.

**Remaining:**
4. **Frontend** — `OtaModule.ts`: `getOtaState` + `otaDownloadProgress` types. `startup.ts`: drop
   `syncBlocking/syncInBackground/drainSyncQueue`.
5. **Frontend** — extract `screens/library/library.assemble.ts` (pure `assembleLibrary` + helpers)
   from `library.hooks.ts`; hook imports from it; move the assemble tests.
6. **Frontend** — migrate `screens/splash/` to the current convention: `splash.screen.tsx`,
   `splash.styles.ts`, `splash.types.ts`, `hooks/splash.hooks.ts` (+ `splash.tests.ts`),
   `splash.boot.ts` (+ tests), `components/ota-policy-alert/`. Cut `'following'`. Warm-up +
   `seedLibrary`. Progress bar consumes OTA + warm-up.
7. **Frontend** — `App.tsx` `onDone` simplification; ~2s floor.
8. `make coverage` (JS + Kotlin) — no drop; bump the floor if it rose
   (`coverageThreshold` in `frontend/package.json`, `COVERAGE_FLOOR_KOTLIN` in
   `android/build.gradle.kts`).
9. `versionar-build` -rcN (APK + bundle), `make redeploy-log`. On device:
   - **No intermediate screen on a normal boot** — system splash cross-fades straight into the RN
     splash, no dark frame / no window jump between them. Only the blocked dialog for `required`.
   - OTA download progress shows on the RN splash; `otaBundleReady` → "restart to update" still works.
   - Library loads cache-first on first open (warm-up seeded it) and survives an app restart
     (the original Task 028 gap).
   - Pull-to-refresh forces a network fetch.
   - Every card field correct (progress, chapter count, status, follow).

## Completion criteria

- `SplashActivity` deleted; `MainActivity` is the launcher and owns the OTA gate via
  `core-splashscreen`. No intermediate Activity/window on a normal boot (device-confirmed).
- `screens/splash/` fully on the current convention; nothing in it references the old model
  (`SplashSyncCoordinator`, `syncBlocking`, the `'following'` destination).
- `SplashSyncCoordinator` + the sync methods deleted from Kotlin; `features/startup/` gone.
- Library warm-up via `seedLibrary` on the splash; cache-first first paint device-confirmed.
- OTA download no longer blocks the boot; progress visible on the RN splash.
- All moved functions covered by tests in their new location; `make coverage` no drop.
- Explicit user approval before `finalizar-task`.
