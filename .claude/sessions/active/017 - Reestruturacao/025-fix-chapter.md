# Task 025 — Correction: Chapter (Phase 5 — Corrections)

**Status:** todo (blocked by Task 008, and Tasks 016-023 — lands after the real Chapter contract
(Task 019) and Chapter Service (Task 021) implementations exist)

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
