# Common Mistakes — load when debugging or before a new feature

The invariants in `CLAUDE.md` § Code structure are also common mistakes — not repeated here
(screen imports screen, dummy component imports a service, Kotlin tool screen-coupled, feature
gated by an `if`, coupling direction reversed).

Each entry: the symptom, then the rule. The `→ file` pointer is where the fix lives if you need
the full context.

---

### 1. "Wrong state" bug rewritten without logging first
A deterministic UI-data bug (always off by one, always the wrong item) survives repeated fixes
in the most obvious layer.
**Rule**: before rewriting the same layer twice, instrument the full chain user-action →
rendered output and read the real values (`adb logcat`) before forming a new hypothesis. (Plan
003: "click X, opens X-1" survived 3 ViewModel rewrites — the data was always right, the cause
was a missing `popUpTo` in navigation.)

### 2. Room migration as a destructive fallback
`fallbackToDestructiveMigration()`, or a migration that DROPs + recreates a table with data.
**Rule**: write a real SQL migration — data loss is never acceptable. Every `Migration(N, N+1)`
ships with its `Migration(N+1, N)` reverse (both registered in `DatabaseModule.kt`), covered by
the same `MigrationTestHelper` pattern. If a JS table references the affected Room columns, a JS
migration ships too. → `android/core/.../database/migrations/`

### 3. Lifecycle marker set in module `init {}` instead of on first navigation
Splash always skipped even after a force-stop, because a "process is alive" flag was set in the
Kotlin module's `init {}` — which re-runs on every fresh process before any navigation.
**Rule**: "process is alive" = the app actually navigated to a screen in *this* process
lifetime. Set such a marker inside `notifyRouteChanged`, never in a constructor / `init {}`.

### 4. `useState` instead of `useRef` to gate a `setTimeout` closure
A hard timeout fires even though state should have blocked it — `setTimeout` captured the state
value at closure-creation time and never sees the update.
**Rule**: values read inside long-lived closures (timers, listeners) must be `useRef`. Use
state only for values that drive re-renders.

### 5. Sequential `await` instead of `Promise.all` for a minimum-duration guarantee
A "close after sync **and** ≥ N seconds" timer resolves instantly when sync took longer than N —
`await runSync()` then `await waitForMin()` only starts the timer *after* sync.
**Rule**: run both in parallel with `Promise.all`, and pass the *start timestamp* to the
min-duration wait, not the time after sync finished.

### 6. New RN native module installed but not linked into `:app`
`No ViewManager found for class RNSVGPath` (or similar) at runtime — JS resolves, build
compiles, but the native class isn't on `:app`'s classpath. This repo's autolinking discovers
the module but doesn't wire it into `:app`.
**Rule**: after `yarn add`-ing any RN lib with native Android code, add
`implementation(project(":<package-name>"))` to `android/app/build.gradle.kts` (next to
`react-native-screens`), then `rm -rf android/build/generated/autolinking` before rebuilding.

### 7. OTA staleness detected by version string instead of build time
After an OTA test then a full rebuild+deploy, the app keeps loading the old JS bundle across
reinstalls — the OTA bundle in app-private storage survives, and semver compares
`"0.6.0-ota-test"` == `"0.6.0"` so a version check never flags it stale.
**Rule**: staleness is a **build-time** comparison, never a version string.
`make build-bundle` writes `bundle-build-time.txt` → `BuildConfig.EMBEDDED_BUNDLE_BUILD_TIME_MS`;
`OtaManager.discardStaleBundleIfNeeded()` (on `MainApplication.onCreate`) wipes the OTA bundle if
the embedded one is newer. → `mistakes.md` predecessor of the OTA design in `architecture.md`

### 8. Screen state doesn't reflect a change made from another screen
Toggling state in screen A (favoriting a series) doesn't show in screen B still mounted in the
nav stack, until a manual pull-to-refresh. Two variants seen:
1. **Missing initial fetch** — B seeds state to a default and only updates via a native event
   that already fired before B's listener subscribed. Fix: fetch the current value explicitly in
   the same `Promise.all` as the rest of the initial load; keep the listener for *live* updates.
2. **Filter applied once at fetch time** — B stores only the filtered result, so a
   newly-matching item never enters and a no-longer-matching one never leaves. Fix: keep the
   *unfiltered* list in state, apply the filter in a `useMemo` on every render.

**Rule**: for anything shared across screens, always ask "what if this changes while I'm not
focused" — React Navigation doesn't remount on back. (RN→RN cross-screen updates now go through
the `EventBus` — `ChapterEvents.readStatusChanged`.)

### 9. Scroll-position math anchored to the wrong zero point
A reader progress bar / chapter-switch trigger fires early or late, and the error scales with
how far the user scrolled. A `compute*` seeded its running total with
`firstVisibleItemScrollOffset` as the base (double-counting it), or anchored to an item that was
never measured (the previous chapter's header, after scrolling backward into a chapter's last
pages).
**Rule**: before touching scroll-math, write down what pixel position is "zero" for *this*
computation, and confirm every summed term is relative to that same zero — never to an item that
might not have been measured yet. → `ReaderPageList.kt` `compute*`

### 10. Single shared "last known good value" leaking across independent entities
A payload has fields that individually look plausible but describe two entities at once
(`chapterId` from ch. 39 alongside a `fraction` still holding ch. 40's value). A fallback
`var lastGoodValue` shared across all tracked entities instead of keyed per entity.
**Rule**: any "last known good" fallback for a value naturally scoped per-entity (per chapter /
page / session) must be keyed by that entity's id, never a single shared variable. →
`ReaderPageList.kt` `lastChapterFractionByChapterId: HashMap<String, Float>`

### 11. Generic helper's default silently passes `kotlin.Unit` across the bridge
`RuntimeException: Cannot convert argument of type class kotlin.Unit` deep in a coroutine
worker, only on-device. A `resolveOrReject(promise, code, transform = { it })` identity default,
used on every `Result<Unit>` call site, returned the `Unit` object instead of `null`; RN's
bridge has no conversion for `Unit`.
**Rule**: across a `Result<T>` / `Promise` boundary, `Unit` is not `null` — map it explicitly
(`{ if (it == Unit) null else it }`). JVM tests that only assert "resolved without rejecting"
miss this — assert the *actual value* passed to `resolve()`. → `ReactBridgeSupport.kt`

### 12. Compose `LazyColumn` won't reliably jump when its data changes and an old item survives
`scrollToItem` / `scrollToPositionWithOffset` is reported consumed but the list stays anchored
(or jumps then snaps back). Deterministic once the new item list shares any key with the old —
the list keeps its anchor on a surviving item and a programmatic scroll loses to it. Proven
across 9 device builds.
**Rule**: to force a native list to a position while its data is also changing, **remount the
whole native view** — bump a counter in state on the reload and pass it as the `key` of the
native component. Only for a genuine "navigate elsewhere" (chapter switch); a natural in-place
scroll must NOT bump the key. → `reader.screen.tsx` `key={reader.nativeListKey}`;
`architecture.md` § Chapter-switch contract

### 13. Two mechanisms writing the same navigation state with no coordination
Pressing "next chapter" once advances two chapters (26 → 28). Intermittent, timing-dependent,
"fixed" repeatedly by settle timers that only lower the odds. Two independent flows (native
scroll report + manual arrow) do async read-modify-write on the same field with no lock.
**Rule**: a piece of navigation state has exactly one write path. Every trigger dispatches a
*description of intent*; one owner (a reducer) computes the new state synchronously against its
own current value. Model it as position + index ("ruler + pointer"), not named mutable slots. →
`reader.reducer.ts` owns `ReaderWindow`; `architecture.md` § Chapter-switch contract

### 14. Looping a single-item endpoint instead of the batch one
"Mark all selected as read" marks one and the rest un-mark themselves a moment later. The batch
action did `selectedIds.forEach(id => markRead({id}))` — N parallel POSTs; some fail; the
optimistic-mark error path reverts exactly the failed ones. A real batch endpoint existed and
the bridge already exposed it.
**Rule**: before looping a mutation over a collection, check for a batch form. Wire a
`setMany`/`markMany` that does one request and applies optimistic/confirm/revert to every id
(revert per-id via a `prevStatusById` map). → `ChapterTool.mark.readMany` +
`ChapterService.status.setMany`

### 15. Test suite slow because of a negative `waitFor` assertion
A suite mysteriously takes ~20s and flakes on CI under load. A test ends with
`await waitFor(() => expect(queryByText(x)).toBeNull())` — a **negative** assertion never lets
`waitFor` settle early, so it spins its full retry budget (~1s) running a full `act()`
re-render every 50ms.
**Rule**: to assert something is *gone* after an async action, do the action inside
`await act(async () => { … })` (flushes the awaited work + the closing `setState`) and then
assert synchronously — or use `waitForElementToBeRemoved`. Never `waitFor(... toBeNull())`. →
`server.screen.tests.tsx`

### 16. "Read" threshold as a scroll fraction never reaches 1.0 on a tall last page
A chapter whose last page is much taller than the viewport never auto-marks as read even at the
visible end — the final ~1 viewport can't be scrolled past the bottom edge, so the fraction
maxes out around 0.95–0.97 on a ~19,000px page.
**Rule**: a "practically finished" threshold on a scroll fraction that structurally can't reach
1.0 must leave headroom for that last viewport — pick the cutoff from what the fraction actually
maxes at in the field (0.95), not the arithmetic ideal (0.98). →
`READ_THRESHOLD_FRACTION` in `reader.model.ts`

### 17. Screen re-sorts a list one frame after first paint (async preference)
Opening a series briefly shows the chapter list in the wrong order, then it visibly re-sorts.
The sort mode is a `useState` seeded with a default; the data loads cache-first and fast, so the
first paint uses the default; a separate effect reads the saved preference async and
`setSortMode`s it a frame later.
**Rule**: when a list's order depends on an async-loaded preference, gate the list render on a
`prefsLoaded` flag (the loading spinner already covers it) or seed the `useState` from a
synchronously-readable value. Don't let the first paint use a default the async read will
overturn. → `serie.hooks.ts` (fix deferred as optional — the loading gate usually holds)
