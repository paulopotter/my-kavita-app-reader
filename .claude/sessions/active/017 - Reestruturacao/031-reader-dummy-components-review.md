# Task 031 — Reader: dumb components review (Phase 6 — Reader)

**Status:** done (2026-09-01) — resolved by the reader rewrite (`screens/reader/`, ex-`reader-v2`).

> This task is the original plan 017 "Task 003 — Revisão do princípio 'componentes burros' no
> Reader", reslotted into Phase 6 unchanged, now explicitly integrated with Task 027 (which
> covers the `toBlock` → `ReaderTransform.ts` half of the same underlying finding).

## Objective

The user asked for an explanation of the "dumb components" concept before deciding whether/how
to apply it. Diagnosis already raised in conversation: `ReaderScreen.tsx` has
`handleVisiblePageChanged`, which **decides** (not just reports) which action to take based on
the native event received — this is decision logic inside the component, when it should live in
the hook.

## Steps (when resumed)

1. Explain the "dumb components" principle with concrete examples from the project itself
   (pattern already used in other screens, e.g. `SeriesDetailScreen.tsx` vs.
   `useSeriesDetail.ts`).
2. Review together with the chapter-switch contract (Task 029) — the native-event handler
   decision should move inside the hook, with the component only forwarding the raw event.
3. Coordinate with Task 027 (`toBlock` extraction) so both halves of the Reader's dumb-component
   finding land as one coherent review with the user.
4. Apply in the Reader once approved.

## Resolution (2026-09-01)

Applied wholesale in the reader rewrite. Every finding is closed:

- **The `handleVisiblePageChanged` decision-in-component finding** — gone. In the new reader
  `frontend/src/screens/reader/reader.screen.tsx:46-52`, `handleVisiblePageChanged` does exactly
  one thing: `reader.onNativePosition(visibleChapterId, pageIndex, pageFraction, chapterFraction)` —
  forwards the four raw values verbatim. Every decision (is this a crossing? which direction?
  drop the report? move focus?) lives in the hook (`reader.hooks.ts` — `onNativePosition` →
  `webtoonReportToTrigger` → `moveFocus` → the reducer). The screen has **zero** domain logic;
  its only branches are the loading/error render gate.

- **`toBlock` → transform (the Task 027 half)** — done: `windowToWebtoonBlocks` /  `toBlock`
  live in `frontend/src/screens/reader/transforms/webtoon-blocks.transform.ts`, a pure module
  with no React, no I/O. The screen calls it in a `useMemo`; the component never builds blocks.

- **Overlay components** — all six migrated to the project's dumb-component structure
  (`components/<name>/<name>.component.tsx` + `.styles.ts` + `index.ts`): `reader-top-bar`,
  `reader-side-progress-bar`, `reader-thin-progress-bar`, `reader-overlay-footer`,
  `reader-offline-banner`, `reader-page-list-view`. Style is always a separate file (no inline
  `StyleSheet.create` in a `.component.tsx`); props are primitives + callbacks only; no
  `useEffect` of business logic, no service imports. `reader-page-list-view` only unwraps the
  native event payload into positional args — no decision.

- **Dead code removed** — `ReaderThinProgressBar`'s `DEBUG_MODE` block (a `const false` branch
  and its orphan styles) was deleted in the corte-final commit.

## Completion criteria

- [x] User confirms understanding of the principle. — the rewrite plan (approved) spelled it out;
  applied as designed.
- [x] Decision recorded on whether to apply it in this plan. — applied, in full.
- [x] Coordinated with Task 027 before considering the Reader's dumb-component finding closed. —
  the `toBlock` half landed in the same rewrite as `webtoon-blocks.transform.ts`.
- [x] Tested on a real device by the user. — rc42–rc45, chapter nav / infinite scroll / overlay
  all validated.
- [x] `make coverage` shows no drop relative to the current floor. — JS branches back to 90.22%
  (floor 90) after the corte final; `yarn test:coverage` exits 0.
- [ ] Explicit user approval before `finalizar-task`.
