# Task 038 — Splash migration (Phase 5 — Corrections)

**Status:** done

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

**Done in rc68/rc69 (RN splash — new file structure):**
- `screens/splash/` on the current convention: `splash.screen.tsx` (prop-driven view for now),
  `splash.styles.ts`, `splash.types.ts` (`SplashDestination = 'setup' | 'app'`, `SplashOtaAlert`),
  `hooks/splash.hooks.ts` (+ `splash.tests.ts`), `components/progress/` (bar + optional caption
  slot for "what's loading" / playful messages — memoized, clamps 0..1).
- `AppVersions` promoted flat → `shared/components/app-versions/` (current convention + render
  tests); Config's import updated.
- `shared/theme/colors.ts` — first design-token pass, seeded from the colours in the files this
  rewrite touched. Full theming = backlog **018-tema-e-design-tokens.md**.
- No `ota-policy-alert` component — the mode→{title,body,buttons} mapping is pure derivation, so
  it's a `useMemo` in the hook; the screen renders `<AppAlert {...otaAlert} />` directly.
- **Legacy `SplashScreen.tsx` / `useSplash.ts` still wired in `App.tsx`** — the new screen/hook
  are built and tested but not plugged until the boot logic (destination) migrates.

**Done in rc70 (splash hook — step 1 & 2):**
- **Step 1 (show-the-splash rule):** `useSplash` calls `StartupBridge.markUiReady()` on mount +
  a `reportStep()` that only `console.log`s for now (progress caption not wired to the return
  yet — it'll be fed by each boot step once the graph exists).
- **Step 2 (OTA rule moved into the hook):** `getOtaPolicy()` on mount → `otaAlert` derived via
  `useMemo` (mode + Strings → `{title, message, buttons, dismissible}`), wired to the return.
  `required` = hard stop, no dismiss. Advisory = "not now" / "view notes"; `highly_recommended`
  re-shows after 5 min; `Linking.openURL` + `acknowledgePolicy` in callbacks. `otaBundleReady` +
  `getOtaState` phase `ready` → `otaUpdateReady` (hidden button), wired. `otaDownloadProgress` →
  `console.log` + `reportStep` (not wired). `progress` / `destination` still not wired.

**Design decisions (step 3 — server management, 2026-09-02):**
- **`:server`'s model is single-active-group** (`activeGroupId` is one in-memory slot; N `Server`
  instances for N servers). Multiple URLs *within* a group already work (`UrlSelector` failover).
- **The splash just activates `groups[0]`** (what `activateFirstServerGroup` already does). No
  "last used", no picker.
- **Only one server group is allowed** until multi-server is designed. Nothing enforces it in
  code — the Config screen is still 100% legacy (`SetupBridge`/`ConfigRepository`, "one Kavita +
  N URLs") and creates **no** `server_group` at all, so a guard would be dead code. The rule is
  registered in backlog **019-multiplos-servidores.md** and Task 035 (Config → `:server`) must
  respect it when it adds group creation.
- **`hasServerConfigured` / `isAuthenticated` stay on the legacy `SetupBridge`** in the splash —
  migrating auth to `:server` is Task 035, not pulled in here. The splash only needs "is there a
  server?" and "is the session valid?" and the legacy answers are fine for now.
- Backlog **019-multiplos-servidores.md** created (single-active-group model, the options:
  picker / N Server instances / aggregated library, and the impact on `:server`/digests/Library/
  Reader/Config).

**Done in rc70+ (splash hook wired end to end):**
- `runSplashBoot` (pure boot graph, sits next to the hook — same arrangement as
  `assembleLibrary`): `groups.list` → activate `groups[0]` → `setActiveGroup`/`reauthenticate`
  → LIGHT Library warm-up (`assembleLibrary({ light: true })` in a `Promise.race` with
  `WARMUP_BUDGET_MS`, seeds even if it outlasts the cap) → a `SplashDestination`.
- `activateFirstServerGroup.ts` folded into the hook (no separate file). Legacy `SplashScreen.tsx`
  / `useSplash.ts` / the old hook test all deleted; `screens/splash/` has only the new convention.
- `SplashDestination` is a typed union `{ kind: 'setup' | 'home' | 'serial' | 'reader' }`; the
  `'following'` destination is gone (which tab opens is `MainNavigator`'s call via
  `hasFollowedSeries`). `navActionFor()` is the one exhaustive kind→`navigation.reset()` mapping.
- `RootNavigator` initial route = `Routes.SPLASH`; `App.tsx` just `boot()`s and the splash decides
  (commit `3949d9a`). No `onDone` on `App.tsx` anymore.

**Done in rc81 (perf — the real device-felt win):**
- `:cache` gained `patch` + `patchAll` (JSON shallow/deep merge, one read + one transaction for a
  batch) + `CacheFilter`/`JsonMerge`; `:core CacheDao` gained `queryFiltered` + `upsertAllLenient`.
- `buildSerialsDigest` uses `patchAll` — the per-series `get()+copy()+put()` loop (≈238 Room ops,
  ~11.6 s on a ~120-series library) is now 1 query + 1 transaction.
- Library: `assembleLibrary({ light })` — `light` reads the progress index for FOLLOWED series
  only; heavy per-series digest + BFF match moved to lazy per-viewport enrichment
  (`onViewableIndices` → `ENRICH_LOOKAHEAD` / `ENRICH_CONCURRENCY`, dedup, queue).
- The one other hand-rolled merge (`buildChapterDigest`'s prev/next neighbour merge) is
  DELIBERATELY left as-is — its precedence is the inverse of `patch` (the on-disk value must win
  so a neighbour-less write never erases neighbours a Series-driven write attached). Commented as
  such; not a `patch` fit.

**Done in rc83 (OTA policy behaviour, device-confirmed):**
- **`required`** → `MainActivity` shows a native non-cancelable dialog ("download" → release page)
  AND publishes `pendingPolicy = "required"` so the RN splash also freezes underneath (no
  progress, no redirect). Redundant barrier — device-confirmed a background→foreground cycle stays
  blocked (without the RN freeze the user could slip past the native dialog).
- **`highly_recommended`** → RN advisory dialog only (no download — `ota-serve` skips it). Buttons
  "dismiss" + "view notes" for now; the redirect is held while the dialog is up and released on
  dismiss; re-shows after 5 min inside the app. An on-demand "download now" button needs a Kotlin
  bridge that doesn't exist — **backlog 020**.
- **`recommended`** → no dialog. Kotlin downloads in the background; when staged, the RN splash
  shows only the "apply update" button (`applyOtaUpdate()` → restart onto the new bundle). Boot
  holds the redirect `UPDATE_BUTTON_GRACE_MS` (5 s) so the button is actually seen, then
  `acknowledgePolicy()` + redirect. Once applied, `OtaManager.check()` sees
  `manifest.lastRNVersion == currentBundleVersion` → `NothingToDo` → no button next boot (the
  button persisting under `make ota-*` is only the `-ota-test-` suffix in `ota-serve.sh`).
- Diagnostic `console.log`s in `library.hooks.ts` / `splash.hooks.ts` commented (not deleted) with
  a pointer to **backlog 015** (telemetry/debug panel).

**Remaining:**
- `make coverage` (JS + Kotlin) — done, no drop. JS floor bumped
  (`statements`/`lines` 68→71, `functions` 77→78); Kotlin LINE 83.30 %, floor stays 83.
- `versionar-build` -rcN + `make redeploy-log` — rc83 verified on device by the user across
  `required` / `recommended`; boot has no intermediate screen; Library is cache-first and
  survives a restart.
- `finalizar-task` (INDEX + completion doc + prepared commit message) — pending explicit approval.

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

## Result

**Delivered.** The Kotlin sync machinery is gone (`SplashSyncCoordinator`, the
`syncBlocking/syncInBackground/drainSyncQueue` bridge methods, `features/startup/`).
`SplashActivity` no longer exists — `MainActivity` is the launcher and owns the OTA
gate via `androidx.core:core-splashscreen`, held until the OTA gate resolves AND the
RN splash paints (`BootUiReadySignal` + `StartupModule.markUiReady`), with a 4s cap.
`screens/splash/` is fully on the current convention (`splash.screen.tsx` +
`splash.styles.ts` + `splash.types.ts` + `hooks/splash.hooks.ts` + `components/progress/`);
the legacy `SplashScreen.tsx` / `useSplash.ts` / `activateFirstServerGroup.*` and their
tests are deleted. The splash is a real `RootNavigator` route; the boot graph
(`runSplashBoot`) does server → auth (`:server` `setActiveGroup`/`reauthenticate`, single
active group = `groups[0]`) → light Library warm-up (`assembleLibrary({ light: true })` +
`seedLibrary`) → a typed `SplashDestination`; the `'following'` destination is cut.

**OTA policy behaviour (rc83, device-confirmed):**
- `required` → native non-cancelable dialog in `MainActivity` (button → release page)
  **and** `pendingPolicy = "required"` published so the RN splash freezes underneath
  (double barrier — the user confirmed a background→foreground cycle stays blocked).
- `highly_recommended` → RN advisory dialog only, no download; redirect held while the
  dialog is up, released on dismiss, re-shown after 5 min. An on-demand "download now"
  button needs a new Kotlin bridge → **backlog 020**.
- `recommended` → background download; the RN splash shows only the "apply update"
  button when the bundle is staged, held `UPDATE_BUTTON_GRACE_MS` (5s) before the
  redirect, then `acknowledgePolicy()`.

**Perf side-effect (rc81, the device-felt win):** `:cache` gained `patch`/`patchAll`
(JSON merge + one read + one transaction for a batch) and `buildSerialsDigest` uses
`patchAll` — the ~238-Room-op per-series loop (~11.6s on ~120 series) is now 1 query +
1 transaction. Library moved heavy per-series work to lazy per-viewport enrichment.

**Versions:** `0.8.0-rc72` (frontend `0.9.0-rc72`) → `0.8.0-rc83` (frontend `0.9.0-rc83`).

**Tests:**
- `cd frontend && yarn jest` — 56 suites, 769 tests, all green.
- `cd frontend && yarn type-check` — clean. `yarn lint` — 0 errors.
- `make coverage` — Kotlin `koverVerify` BUILD SUCCESSFUL (LINE 83.30%, floor 83);
  JS threshold passes. JS floor bumped `statements`/`lines` 68→71, `functions` 77→78.
- Device: user ran `make redeploy-log` across `make ota-required` and
  `make ota-recommended` on rc82/rc83. Confirmed: no intermediate screen on a normal
  boot; `required` stays blocked across an app background→foreground cycle;
  `recommended` downloads in bg, shows the update button, restarts onto the new bundle;
  Library is cache-first on first open and survives a restart.

**Follow-ups:** backlog 015 (diagnostic `console.log`s left commented, pointing there),
backlog 020 (OTA on-demand download button for `highly_recommended`). `buildChapterDigest`'s
prev/next neighbour merge deliberately NOT converted to `patch` (inverse precedence).
