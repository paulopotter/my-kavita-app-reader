# Task 027 — Correction: dumb components (Reader) (Phase 5 — Corrections)

**Status:** done (2026-09-01) — resolved by the reader rewrite (Task 029). `toBlock` moved out
of the screen into a pure transform module.

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

- [x] `toBlock` lives in a transform module, not inline in the screen — now
  `frontend/src/screens/reader/transforms/webtoon-blocks.transform.ts` (`windowToWebtoonBlocks` /
  `toBlock`), a pure module (no React, no I/O). The screen calls it in a `useMemo`.
- [x] Coordinated with Task 031 — both halves (data transform here, event-handling decision
  there) landed in the same rewrite.
- [x] Tested on a real device by the user (rc42–rc45).
- [x] `make coverage` — JS branch coverage back to 90.51% (floor 90).
- [x] Explicit user approval before `finalizar-task`.

## Result

`toBlock` (chapter block construction) is out of the screen and in
`frontend/src/screens/reader/transforms/webtoon-blocks.transform.ts` as `windowToWebtoonBlocks` /
`toBlock` — a pure module the screen consumes via `useMemo`. Delivered as part of the reader
rewrite (Task 029), not as a standalone diff, per the coordination note with Task 031.

**Open note for a future refactor task:** the user believes the RN "Transform" layer was meant
to be dropped in the new architecture — the docs (`architecture.md` § Domain Composition) still
describe it and this task's own criteria required it, so it was applied that way. If Transform
is indeed being killed RN-side, `reader/transforms/*` (and `shared/transforms/*`) should be
revisited in its own task; not a blocker for closing this one.
