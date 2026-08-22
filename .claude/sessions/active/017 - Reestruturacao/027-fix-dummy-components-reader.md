# Task 027 — Correction: dumb components (Reader) (Phase 5 — Corrections)

**Status:** todo (blocked by Task 008, and Tasks 016-023 — the Chapter shape it transforms from
is now the real Chapter contract from Task 019, not just its design)

## Objective

Move `toBlock` out of `ReaderScreen.tsx` into `ReaderTransform.ts`, per the "dumb components"
invariant — the screen currently builds domain structure inline instead of receiving it
pre-transformed. This task integrates with Task 031 (Reader dumb-components review, reslotted
from the original plan 017 Task 003), which covers the event-handling-decision half of the same
underlying issue (`handleVisiblePageChanged` deciding actions instead of forwarding events).

## Steps

1. Move `toBlock` (and any other inline domain-structure construction found in
   `ReaderScreen.tsx`) into `ReaderTransform.ts`, following the pattern already used for other
   Reader transforms (`page.ts`, `chapter.ts`).
2. Confirm the Chapter contract (Task 008) is the source shape `toBlock` should transform from,
   so this doesn't get re-done once the contract lands.
3. Coordinate with Task 031 so the two Reader dumb-component fixes (data transform here vs.
   event-handling decision there) land as a coherent single review with the user, not two
   disconnected diffs.

## Completion criteria

- `toBlock` lives in `ReaderTransform.ts`, not inline in `ReaderScreen.tsx`.
- Coordinated with Task 031 before considering the Reader's "dumb components" finding fully
  closed.
- Tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.
