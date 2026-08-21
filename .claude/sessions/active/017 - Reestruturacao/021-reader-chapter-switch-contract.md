# Task 021 — Reader: chapter-switch contract + 3-mechanism consumption (Phase 5 — Reader)

**Status:** todo (blocked by 008, 013 — was `doing` while scoped as standalone; now waits on the Chapter contract and the formalized communication mechanisms)

> This task is the original plan 017 "Task 001 — Contrato único de troca de capítulo +
> modelagem dos 3 mecanismos de comunicação", reslotted into Phase 5 and updated per Task 001
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

## Steps

1. Get the finished Chapter contract (Task 008) and the finished 3-mechanisms formalization
   (Task 013, including the RN→RN design and the "one-shot state" fate decision).
2. Reconcile the draft chapter-switch contract above with Task 008/013's output — adjust as
   needed, do not assume the draft survives unchanged.
3. Decide, with the user, whether the full unification refactor (merging `loadInitialViewer` and
   `advanceToNextChapter`/`retreatToPrevChapter` into a single flow) lands in this task or is
   split further — depends on real size once modeled against Task 008/013.
4. Update `.claude/docs/architecture.md` with the finalized contract, once approved.
5. Fix the `loadNeighbor`/`loadMissingNeighbor` race (guard by `targetChapterId`) and reopen the
   chapter-order reflow investigation — both can be fixed as point corrections ahead of the full
   contract unification, since both already have an identified root cause.

## Completion criteria

- Chapter-switch contract reconciled with Task 008/013 and approved by the user.
- Explicit decision recorded on whether/when the unification refactor is implemented.
- `loadNeighbor`/`loadMissingNeighbor` race fixed.
- Chapter-order reflow investigation reopened and resolved or explicitly re-deferred with a
  reason.
- Tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.
