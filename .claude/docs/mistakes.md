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

**Last Updated**: 2026-08-12
