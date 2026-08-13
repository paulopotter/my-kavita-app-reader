# Common Mistakes — load when debugging or before implementing a new feature

**CRITICAL — Read at session start**

---

## Top Mistakes

### 1. Screen imports from another screen

**Symptom**: `LibraryScreen` imports a component or hook directly from
`ReaderScreen/`.

**Rule**: screens are isolated. A component/function/hook used by a second
screen must first move to `shared/` before either screen imports it.
Never cross-link screens directly.

**Fix**: move the shared artifact to the appropriate `shared/` subfolder,
update both import sites, and proceed.

---

### 2. Dummy component imports a service

**Symptom**: a component under `screens/*/components/` or
`shared/components/` calls a service, makes a network request, or reads
from the bridge directly.

**Rule**: dummy components only render data received via props. All
orchestration lives in the hook. Components must be pure render functions.

**Fix**: lift the service call into the hook, pass the resulting data as a
prop.

---

### 3. Kotlin tool coupled to a specific screen

**Symptom**: a Kotlin Native Module is named after a screen
(`LibraryModule`, `ReaderModule`) or contains screen-specific logic.

**Rule**: Kotlin tools are always global and domain-agnostic. They expose
primitives (`request`, `db.query`) or domain repos (`kavita.*`), never
screen-specific operations.

**Fix**: extract the screen-specific logic to the JS layer (hook/service).
Rename the Kotlin module to a domain or primitive name.

---

### 4. Feature gated by `if` instead of missing config

**Symptom**: code contains `if (BuildConfig.IS_OPEN_SOURCE)`, `if (bffEnabled)`,
or any boolean flag toggling a feature on/off.

**Rule**: if a plugin isn't configured (e.g. `BFF_URL` is empty), the
feature simply doesn't activate — no branch needed. The absence of config
is the gate.

**Fix**: check for the config value at initialisation time; if absent, skip
registering the plugin. No runtime `if` elsewhere.

---

### 5. "Wrong state" bug attacked by rewriting logic without logging first

**Symptom**: the UI shows wrong data after a logic fix in the most obvious
layer. The error is deterministic (always off by one, always the wrong item).

**Rule**: before rewriting the same layer a second time, instrument the
full chain from user action to rendered output with logs. Install and
capture `adb logcat` — read the actual values before forming a new
hypothesis.

**Reference**: in the mymangar reader (plan 003), the "I click chapter X,
it opens X-1" bug survived three ViewModel rewrites. One log capture
revealed the data was always correct; the cause was the navigation stack
(`popUpTo` missing in `AppNavHost`).

---

### 6. Coupling direction reversed in Kotlin layers

**Symptom**: `core/` imports from `tools/` or `features/`; `tools/`
imports from `features/`.

**Rule**: coupling is unidirectional — `core` ← `tools` ← `features`.
`core` must know nothing about tools or features. `tools` must know nothing
about features.

**Fix**: extract the shared concept into `core/` and have both layers
depend on it.

---

### 7. Room migration written as destructive fallback

**Symptom**: `fallbackToDestructiveMigration()` in the Room database builder,
or a migration that DROPs and recreates a table.

**Rule**: always write a real SQL migration. Data loss is never acceptable.
Every Room migration must also be accompanied by a JS migration if any JS
table references the affected Room columns.

---

### 8. ProcessLifecycleMarker set in module `init {}` instead of on first navigation

**Symptom**: splash is always skipped even after a force-stop, because
`getRestoredRoute` returns a saved route instead of null.

**Root cause**: `ProcessLifecycleMarker.isAlive = true` placed inside the
Kotlin module's `init {}` block runs on every process creation — including
fresh boots after force-stop. The OS kills the process on force-stop, but
the new process immediately re-runs `init {}` before any navigation happens.

**Rule**: "process is alive" means the app has actually navigated to a screen
in *this* process lifetime. Set the marker only inside `notifyRouteChanged`,
not in the module constructor.

**Fix**: remove the assignment from `init {}` and move it to the first line
of `notifyRouteChanged()`.

---

### 9. Using `useState` instead of `useRef` to gate a `setTimeout` closure

**Symptom**: a hard timeout (e.g. the 25s splash fallback) fires even though
a dialog is open and navigation should be blocked.

**Root cause**: `setTimeout` captures the value of a state variable at
closure creation time. If the state is still `false` when the timeout is
registered, the closure always sees `false` — state updates do not reach
already-created closures.

**Rule**: values that need to be readable inside long-lived closures (timers,
event listeners) must be `useRef`, not `useState`. Use state only for values
that drive re-renders.

**Fix**: replace `const [blockedByPolicy, setBlockedByPolicy] = useState(false)`
with `const blockedByPolicyRef = useRef(false)` and read
`blockedByPolicyRef.current` inside the timeout callback.

---

### 10. Sequential `await` instead of `Promise.all` for a minimum-duration guarantee

**Symptom**: the splash closes immediately after sync finishes, even though a
5-second minimum was intended. The timer is always 0 when sync takes longer
than 5 s.

**Root cause**: running `await runSync()` then `await waitForMinDuration()`
means the timer only starts *after* sync ends. If sync took 7 s, the remaining
time is already negative and the timer resolves instantly.

**Rule**: to guarantee both "sync finished" and "at least N seconds have
passed since start", run both in parallel with `Promise.all`. Pass the
*start timestamp* to `waitForMinDuration`, not the time after sync.

**Fix**:
```typescript
await Promise.all([
  runSyncWithMilestones(cancelled),
  waitForMinDuration(startMs),   // startMs captured before both start
]);
```

---

### 11. Logic placed in the wrong domain layer

**Symptom**: `LibraryTransform` formats series data; `SeriesModule` handles
chapter operations; a screen-level transform duplicates logic from a shared
domain.

**Rule**: each domain only knows its own concern. Library calls Series to
handle series data; Series calls Chapter to handle chapter data. Shared domain
logic lives in `shared/transforms/<domain>.ts`, never inside a screen folder
or a parent domain file.

**Fix**: move the function to the correct domain transform. Update all import
sites.

---

### 12. New RN native module (with native code) installed but not linked into `:app`

**Symptom**: `IllegalViewOperationException: No ViewManager found for class
RNSVGPath` (or similar) crashes the app at runtime, even though the JS
package resolves fine and the build compiles.

**Root cause**: `android/app/build.gradle.kts` declares third-party RN
native modules as explicit Gradle project dependencies — see the comment
above them: `// Third-party RN modules (autolinking generates PackageList
but doesn't inject deps in this layout)`. Gradle's `autolinkLibrariesFromCommand`
(in `settings.gradle.kts`) only discovers the module and adds it as a
buildable subproject; it does **not** wire it into `:app`'s dependency list
in this repo's custom layout. `PackageList.java` gets generated correctly
(so the module *looks* linked), but the native view manager class is never
on `:app`'s classpath, so it's missing at runtime.

**Rule**: after `yarn add`-ing any RN library with native Android code
(anything under `<pkg>/android/`, not pure-JS), add
`implementation(project(":<package-name>"))` to the `dependencies {}` block
in `android/app/build.gradle.kts`, next to `react-native-screens` /
`react-native-safe-area-context`. Then run
`rm -rf android/build/generated/autolinking` before rebuilding, since that
file caches the dependency list from before the install.

---

### 13. OTA bundle version string alone can't detect staleness

**Symptom**: after testing an OTA update (`make ota-none` or similar) and
later doing a full native rebuild + deploy (`make build-all` + `make
deploy`), the app keeps loading the old JS bundle indefinitely — even
across a full reinstall. UI fixes that were clearly shipped in the new
build never show up on device.

**Root cause**: `OtaStore.bundleFile` lives in app-private storage
(`filesDir/ota/bundle.js`), which survives reinstalls untouched.
`MainApplication.getJSBundleFile()` always prefers that file over the
bundle packaged inside the APK if it exists, with no check for staleness.
Comparing bundle *version strings* to decide staleness doesn't work either:
a test OTA version like `"0.6.0-ota-test-none"` and a clean rebuild's
`"0.6.0"` compare equal under semver (the suffix is ignored), so the app
keeps serving the stale test bundle forever.

**Rule**: staleness must be detected by **build time**, not version
string. `make build-bundle` writes `android/app/bundle-build-time.txt`
right after generating the JS bundle; `android/app/build.gradle.kts`
reads it into `BuildConfig.EMBEDDED_BUNDLE_BUILD_TIME_MS`. The OTA
manifest (`latest.json`) carries the same kind of timestamp as
`bundleBuildTimeMs`, saved into `OtaState.bundleBuildTimeMs` on every
download. `OtaManager.discardStaleBundleIfNeeded()` (called from
`MainApplication.onCreate()`, before the bundle is resolved) compares the
two timestamps and wipes the OTA bundle if the embedded one is newer —
regardless of how the version strings compare.

---

### 14. Screen state doesn't reflect a change made from another screen

**Symptom**: toggling state in one screen (e.g. favoriting a series in
`SeriesDetailScreen`) doesn't show up in another screen that's still
mounted in the navigation stack (e.g. the star in `LibraryScreen` stays
unfilled, or an item doesn't appear/disappear from a filtered list like
`FollowingScreen`) — until a manual pull-to-refresh.

**Root cause, two variants seen in this codebase**:
1. **Missing initial fetch**: a screen initializes state to a default
   (`isFollowed: false`) and only updates it by listening to a native
   event (`SeriesFollowedEmitter`). If that event was already emitted
   before this screen's listener subscribed (the normal case — the
   `NativeModule`'s `init {}` runs once at app boot, long before the user
   navigates here), the listener never receives the current value. Fix:
   fetch the current state explicitly (e.g. a dedicated
   `isSeriesFollowed(seriesId)` bridge call) in the same
   `Promise.all` as the rest of the initial load — the event listener is
   still useful for *live* updates while the screen stays mounted, but it
   can't be the only source of truth for the initial value.
2. **Filter applied once at fetch time, not reactively**: a screen filters
   a list (e.g. `FollowingScreen`'s `filter: s => s.isFollowed`) inside the
   `refresh()`/fetch callback, then stores only the filtered result in
   state. Once stored, an item that becomes newly matching (just followed)
   never enters the list, and one that stops matching (just unfollowed)
   never leaves it — because nothing re-evaluates the filter after the
   fetch. Fix: keep the *unfiltered* list in state, and apply the filter
   on every render (e.g. `useMemo(() => data.filter(filter), [data,
   filter])`) so it reacts to any state change, not just a refetch.

Screens that stay alive in the navigation stack (React Navigation doesn't
remount on back) are exactly where this bites — always ask "what happens
if this state changes while I'm not focused" for anything shared across
screens.

**Fix**: `implementation(project(":react-native-svg"))` added to
`android/app/build.gradle.kts`.

---

**Last Updated**: 2026-08-12
