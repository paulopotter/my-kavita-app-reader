# Task 029 — Reader: chapter-switch contract + 3-mechanism consumption (Phase 6 — Reader)

**Status:** doing — core done (2026-09-01). The dual-mechanism root cause is resolved by the
reader rewrite (`screens/reader/`): the `{prev, curr, next}` trio + parallel scroll/arrow flows
were replaced by a single `ReaderWindow { entries[], focusedIndex }` and one `moveFocus(trigger)`
path (reducer owns the transition; arrows reload + remount via `nativeListKey`). Validated on a
real device across rc42–rc45. Remaining: (1) the chapter-order reflow — root cause found, fix
deferred (see below); (2) `architecture.md` updated (done, commit `docs(architecture): contrato
de troca de capítulo do leitor`).

> This task is the original plan 017 "Task 001 — Contrato único de troca de capítulo +
> modelagem dos 3 mecanismos de comunicação", reslotted into Phase 6 and updated per Task 001
> (Phase 0)'s corrected diagnosis. It no longer models the 3 mechanisms from scratch — it
> **consumes** the Chapter contract from Task 008 and the RN→RN mechanism from Task 013. All
> previously-confirmed content (the arrow bug fix, the `loadNeighbor`/`loadMissingNeighbor`
> race, the chapter-reorder reflow) is preserved unchanged below.

## Objective

Using the Chapter contract (Task 008) and the formalized communication mechanisms (Task 013),
finish the Reader's chapter-switch contract — today implemented by two divergent paths (natural
scroll vs. manual arrow navigation).

## Dependency change from the original diagnosis

The original plan 017 Task 001 planned to model the 3 mechanisms (Kotlin→RN, RN→Kotlin, RN→RN)
**itself**, from inside the Reader. That is now wrong for two reasons, both corrected by Task
001 (Phase 0):

1. `SeriesProgressChangedEmitter` — originally cited here as an example of "RN→RN to survey" —
   is actually Kotlin→RN in origin. There was no real RN→RN example to survey.
2. RN→RN does not exist anywhere in the codebase today. It needs to be designed generically
   (Task 013), not designed *inside* the Reader as a Reader-specific mechanism.

This task therefore depends on Task 008 (Chapter contract) and Task 013 (3-mechanisms
formalization, including the RN→RN design and the "one-shot state" fate decision) instead of
producing its own from-scratch contract.

## Draft chapter-switch contract (still to validate against Task 008/013 output)

Proposal discussed in conversation, not yet formalized nor implemented as a refactor — kept as
context for the modeling session, to be reconciled with whatever Task 008/013 produce:

```
switchChapter(chapterId, options?: {
  ignoreSavedProgress?: boolean   // true = manual arrow (forces first page)
                                   // false/omitted = opening from another screen
  knownPhysicalPosition?: {...}   // present only for natural scroll, where the
                                   // list is already physically positioned and
                                   // no programmatic scroll should happen
})
```

Goal: eliminate the divergence between `loadInitialViewer` (full rebuild) and
`advanceToNextChapter`/`retreatToPrevChapter` (incremental `SET_VIEWER` reducer) as two separate
implementations of the same conceptual operation.

## Current state (already applied in the working tree, not committed)

As an intermediate step — explicit user request to test before formalizing the full contract —
the overlay arrow (`goToNextChapterManual`/`goToPrevChapterManual`) and overscroll were already
changed to call `loadInitialViewer(chapterId, startAtBeginning=true)`, the same path used to
open the screen, ignoring saved progress. This fixes the symptom ("the arrow should always go to
the first page") but **does not fix the root cause** (two parallel mechanisms) — it is a point
fix, not the unified contract.

- 45 passing tests in `frontend/src/screens/reader/__tests__/useReader.test.ts`.
- Pending: user validation on a real device.
- **Do not commit** until explicit approval.

## Confirmed bug via real log (rc3, `/tmp/reader-log-v10.txt`, 2026-08-20 18:59) — "arrow skips 2 chapters"

User reported: clicking the "next" arrow going from chapter 26 to the next one, the app jumped
straight to 28 (should have gone to 27). The log confirms the real jump (not a false impression):
`resolved curr=...(n=27)` never appears between opening 26 and opening 28.

Root cause identified (log lines 833-848):

1. The arrow dispatches `loadInitialViewer('20506', true)` (opens chapter 26, n=26) →
   `VIEWER_READY` with `viewer = {prev:null, curr:26, next:null}`.
2. This triggers `loadNeighbor('prev', 25)` and `loadNeighbor('next', 27)` in parallel.
3. `loadNeighbor('next', 27)` resolves and dispatches `UPDATE_VIEWER` with `next:27` — correct
   so far.
4. **Meanwhile**, the physical list in Kotlin (`ReaderPageList.kt`) had not yet been
   repositioned to chapter 26 (the `blocks`/`scrollToChapterId` swap was still in flight) — Kotlin
   kept reporting `onVisiblePageChanged` as if the user were approaching the end of the
   **previous** chapter (25 or the old 26), which made `handleVisiblePageChanged`
   (`ReaderScreen.tsx:46`) dispatch `advanceToNextChapter` **concurrently** with the arrow's own
   effect — the natural-scroll path, which should not have been active at that moment.
5. `advanceToNextChapter` calls `loadMissingNeighbor('next', ...)`, which fetches the next
   neighbor (28) and dispatches another `UPDATE_VIEWER` with `next:28` — using
   `viewerRef.current` captured asynchronously (read-modify-write with no lock, see
   `loadNeighbor` in `useReader.ts:323-343`), **overwriting** the `next:27` the arrow had just
   correctly set.
6. Result: `viewer.next` ends up pointing at 28 instead of 27; the next click on "next" goes
   straight to 28, skipping 27.

**This is concrete proof that the dual-mechanism design (natural scroll vs. manual arrow as two
parallel, uncoordinated flows both writing the same state) is the root cause of the recurring
navigation bugs** — not a theoretical suspicion. The unified contract in this task must
necessarily resolve this race (`loadNeighbor`/`loadMissingNeighbor` cannot overwrite a trio that
already changed to a different chapter while the promise was in flight — needs a guard by
`targetChapterId`, analogous to the `latestRequestedChapterIdRef` `loadInitialViewer` already
uses) — designing the "switch chapter" contract alone is not enough: both mechanisms also need
mutual exclusion (e.g. `isAdvancing` or an equivalent guard also covering the arrow path, which
today sets no such guard).

## Bug still not fixed: visible chapter-order reflow on screen entry

User reported still seeing the chapter list visually reordering on screen entry (original bug
from the earlier fix batch, previously treated as resolved but not confirmed in more recent
real-device testing). Needs to be reopened and confirmed whether the earlier fix (ordering via
`sortOrder` + `ORDER BY` in Room) is actually being used on the path the screen consumes, or
whether there is a second point (e.g. re-sort on the RN side after the cache already comes
sorted, causing a visible re-sort again) still uncovered.

### Investigation result (2026-09-01) — RESOLVED (root cause found, fix deferred)

Not a Room `ORDER BY` issue. It's an RN double-sort on the SerieScreen mount:

- `frontend/src/screens/serie/hooks/serie.hooks.ts:64-66` — `sortMode` /
  `sortFixedThreshold` / `sortProgressPercent` `useState` all start at
  `DEFAULT_SORT_PREFS` (`mode = 'ASCENDING'`).
- `serie.hooks.ts:87-113` (`load`) resolves **cache-first and fast** →
  `setSerie(normalized)`. At that instant `sortMode` is still the default.
- `serie.hooks.ts:146-149` — `const chapters = useMemo(() => sortChapters(serie.chapters, sortMode, …), [serie, sortMode, …])`.
  First paint therefore renders the list **ascending** (the default).
- `serie.hooks.ts:139-144` — a *separate* effect calls
  `ChaptersTool.sort.get({ domain: 'series', seriesId })` (async, goes to
  `PreferencesManager` → native bridge, no sync path) → `applySortPrefs` →
  `setSortMode(prefs.mode)`. When the series' saved sort is `DESCENDING` (or
  an `AUTO_*` mode that resolves to reverse), `sortMode` changes and the
  `useMemo` re-runs → the list **re-sorts on screen, one frame later**.

So on every entry into a series the user reads in `DESCENDING`, the list
flashes ascending → descending. `PreferencesManager.get` is always a
Promise (native bridge), so there is no "read the saved sort synchronously
on first paint" option.

**Fix options (not implemented — user decision pending):**
- (A) Gate the list: keep `chapters` empty (or a spinner) until a
  `sortPrefsLoaded` flag flips. Simplest; adds a brief empty state.
- (B) Persist the last-used `sortMode` somewhere readable synchronously and
  seed the `useState` with it. More moving parts.
- (C) Have `ChaptersTool.sort.get` serve a warm in-memory value on first
  call. Needs a `PreferencesManager` change beyond this screen.

Recommend (A). This is a SerieScreen bug, not a reader bug — it can move to
its own task if preferred.

## Steps

1. ~~Get the finished Chapter contract (Task 008) and 3-mechanisms formalization (Task 013).~~ —
   consumed: the reader now uses `ChapterService.getFull` / `SerialService.get` (over the
   `:content-digest` Kotlin layer) and `EventBus.emit(ReaderEvents.progressChanged)` for RN→RN.
2. ~~Reconcile the draft chapter-switch contract.~~ — the draft `switchChapter(chapterId,
   options?)` was superseded, not adjusted: there is no `switchChapter` — a scroll crossing goes
   through `moveFocus(trigger)` + the reducer; an arrow goes through `openChapter(id,
   {startAtBeginning:true})` + `nativeListKey` remount. The two are deliberately different flows
   with no shared mutable state to race over (the whole point).
3. ~~Decide whether the full unification refactor lands here.~~ — the rewrite replaced both
   `loadInitialViewer` and `advanceToNextChapter`/`retreatToPrevChapter` outright; there is
   nothing left to "unify".
4. ~~Update `architecture.md`.~~ — done (§ "Chapter-switch contract (`ReaderWindow` +
   `moveFocus`)").
5. ~~Fix the `loadNeighbor`/`loadMissingNeighbor` race.~~ — those functions no longer exist; the
   window is append-only and the reducer owns the transition, so there is no read-modify-write
   to guard. **Chapter-order reflow: investigated, root cause found, fix deferred** (see
   above) — it is a SerieScreen double-sort, not a reader or Room issue.

## Completion criteria

- Chapter-switch contract reconciled with Task 008/013 and approved by the user.
- Explicit decision recorded on whether/when the unification refactor is implemented.
- `loadNeighbor`/`loadMissingNeighbor` race fixed.
- Chapter-order reflow investigation reopened and resolved or explicitly re-deferred with a
  reason.
- Tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.
