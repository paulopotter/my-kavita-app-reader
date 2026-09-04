---
status: done
---

# Task 025 — Correction: Chapter (Phase 5 — Corrections)

## Objective

Unify the duplicated `emitProgressChanged` implementations found in `SeriesModule.kt` and
`ReaderChapterModule.kt` into a single shared function, per the Task 008 Chapter contract.

## Steps

1. Confirm both current implementations' exact triggers and payload shape (per the Task 004
   survey).
2. Extract a single shared function (location decided per the Kotlin layering invariant —
   `core ← tools ← features`, shared code goes as low in the layer stack as its dependencies
   allow).
3. Point both `SeriesModule.kt` and `ReaderChapterModule.kt` at the shared function, removing
   the duplication.
4. Verify both call sites still emit the expected event shape (Library progress reactivity,
   Reader progress reactivity).

## Completion criteria

- Single shared `emitProgressChanged` implementation, used by both call sites.
- Tested on a real device by the user (both Library reactive-progress and Reader progress
  paths).
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.

## Result

Scope changed during the session, in agreement with the user. "Unify the duplication" was the
wrong fix: `emitProgressChanged` derived reading progress from the **local** cache
(`chapterCacheDao`, Room), had no server origin, and did not belong in a Kotlin bridge at all.
Instead of merging the two byte-identical copies into one shared Kotlin function, both were
**removed**, and the cross-screen progress notification was rebuilt on the RN→RN EventBus
(Task 013's Mechanism 3, whose reference implementation had been left pending) — the exact
"real EventBus use case" flagged in Task 024's Result.

### What shipped

**Kotlin — removals (`de72f86`, `bc5bb8f`):**
- `SeriesModule.kt` — deleted `emitProgressChanged`, the `.onSuccess { runCatching { … } }`
  from `markChaptersRead`/`markChaptersUnread`, and the `EVENT_PROGRESS_CHANGED` const.
  `chapterCacheDao` stays injected (still used by `getCachedChapters`).
- `ReaderChapterModule.kt` — same removals from `saveReadingProgress`; the now-orphan
  `chapterCacheDao` constructor param + import dropped.
- `AppReactPackage.kt` — `ReaderChapterModule(chapterDataSource, context)` (one arg fewer).
- `ReaderChapterModuleTest.kt` — dropped `chapterCacheDao` from the test helper and the 2
  "consults the cache" tests; added a rejection-code test in their place.
- `SeriesFollowedEmitter` (`seriesFollowedIds`) left untouched — its origin (Room observing
  `followedSeriesDao`) is genuinely native.

**RN — EventBus (`3b69e72`, `78f628f`, `1bcabf2`, `3b07d95`, plus `dff9e95`):**
- **New: `frontend/src/shared/managers/events/`** — `EventBus` singleton (in-memory pub/sub),
  `createEvent<TPayload>(name)`, hook `useEvent(token, handler)`. Sits next to
  `managers/caches` / `managers/preferences` (communication infra, not a domain tool), per the
  user's correction that it is not a `shared/tools/` member. Payload shape is per-token, no
  shared contract. Kotlin never emits here.
- **Chain/cycle guard** on `emit`: same-token re-entrancy (`X→X` / `X→Y→X`) throws immediately
  with the trail; a non-repeating chain deeper than `MAX_CHAIN_DEPTH = 50` throws a backstop
  error. Guard errors (prefix `EventBus:`) propagate through nested emits; a normal handler
  error stays contained.
- **`ChapterTool.mark.*`** now emits `ChapterEvents.readStatusChanged` at all three phases
  (`optimistic` / `confirmed` / `reverted`) alongside `onUpdate` — `onUpdate` is the local
  channel (the screen that called it), the EventBus is the cross-screen channel. Return type
  unchanged (`Promise<ChapterMarkUpdate>`). Token declared in `chapters.tool.ts` (next to the
  emitter, per Task 013), payload `{ chapter: {id, seriesId}, changed: {readStatus,
  prevStatus?}, phase }`.
- **`useLibrary`** replaced the removed `SeriesProgressChangedEmitter` listener with
  `useEvent(ChapterEvents.readStatusChanged)`: optimistic local move on the card
  (`ADJUST_SERIES_PROGRESS`, `readChapters ± delta` clamped to `[0, chapterCount]`, delta from
  `prevStatus` when known else optimistic ±1) + a debounced (400 ms) silent `refresh(false)` to
  reconcile the aggregate exactly. `phase: 'confirmed'` ignored; `'reverted'` inverts the delta.
  Whole-list refetch because the Library still runs on the legacy `LibraryBridge.listSeries` /
  `SeriesSummary` stack — a per-series refetch is a Task 036 item.
- `SeriesProgressChangedEmitter` / `SeriesProgressChangedEvent` removed from
  `shared/bridge/series.ts` and the barrel (no callers left).

### Known gaps (deliberately not solved here)

- **Reader still marks read/unread via the legacy `SeriesBridge` path** (`ReaderService` →
  `SeriesModule`), not via `ChapterTool` — so a mark from the Reader does not emit
  `ChapterEvents.readStatusChanged` yet. Closes when the Reader migrates onto `ChapterTool`
  (Task 029/030); emitting in two places now would recreate the duplication this task removed.
- **Library reconcile is a full `refresh(false)`** — per-series refetch deferred to Task 036.
- **Async chains are not cycle-guarded** (a handler that emits inside `setTimeout` leaves the
  sync stack) — intentional, it is not a stack loop.

## Testing

- Automated: `make coverage` (Kotlin + JS) green at every commit. New tests — 16 EventBus
  (`event-bus.tests.ts`, `event-bus.manager.ts` at 100%), 6 `ChapterTool` emission tests, 8
  `useLibrary` progress-reaction tests. JS suite 618 passing. JS floor raised 55→56
  (statements/lines), 73→74 (functions); branches kept at 90. Kotlin floor unchanged (78.29%
  vs. floor 78, does not cross 79).
- Real device: APK `0.8.0-rc4`→`0.8.0-rc5`, bundle `0.9.0-rc4`→`0.9.0-rc5` via
  `make redeploy-log` (`/tmp/reader-log-v1.txt`). Build/install clean, app runs, navigation and
  list interaction with no crash, no JS error or unhandled rejection. The only warning is the
  pre-existing `VirtualizedList` slow-update notice on the large Library list. No positive
  in-log trace of the event itself (no `console.log` on that path) — behaviour covered by the
  automated tests above.

## Approval

User asked to close both stories ("verifica o log e estando tudo certo, pode fechar as duas
histórias") after reviewing the device log for `rc5`, having confirmed the build worked
("Testei, nao sei se funcionou, olhe o log" → log verified clean).

## Notes

- **EventBus location**: `shared/managers/events/`, not `shared/tools/` — user's explicit call
  (it is infra, sibling to the cache/preferences managers).
- **Payload is free per token** — `createEvent<T>` binds `T` to that one token; no cross-event
  contract. Event-name string chosen by the owning module, no enforced convention.
- **Chain-of-events is supported by design** (a handler that emits triggers the next listener,
  synchronously) — the cycle guard exists specifically so a mistaken loop fails loud instead of
  blowing the stack.
- **Follow-ups**: Task 029/030 (Reader onto `ChapterTool` → emits automatically), Task 036
  (Library onto digest stack → per-series refetch). "Follow cross-screen" flagged as a possible
  second EventBus case pending an investigation of whether `FollowedSeriesBridge.toggle` fires
  the existing native `seriesFollowedIds` emitter.
- **`-rc5` version bump is uncommitted on purpose** (project rule: version bumps only when the
  user asks) — `android/app/build.gradle.kts` and `frontend/package.json` carry `-rc5` in the
  working tree.
