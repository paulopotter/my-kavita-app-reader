# Task 019 — Correction: dumb components (Library/SeriesDetail) (Phase 4 — Corrections)

**Status:** todo (blocked by Task 011, Task 010)

## Objective

Move presentation-state logic currently derived inline in `LibraryScreen.tsx` and
`SeriesDetailScreen.tsx` (alphabet index, scroll handling, padding logic) into their respective
hooks/transforms, per the "dumb components" invariant (`CLAUDE.md` Invariants — "Dummy
component never imports a service").

## Steps

1. Identify every place `LibraryScreen.tsx`/`SeriesDetailScreen.tsx` compute derived
   presentation state inline (`alphabetIndex`, `handleScroll`, padding calculations, per the
   original audit finding).
2. Move each to the corresponding hook (`useLibrary.ts`/`useSeriesDetail.ts` or equivalent) or a
   `*Transform.ts` file, following the existing pattern used elsewhere in the project (e.g.
   Reader's `ReaderTransform.ts` once Task 020 lands it).
3. Reduce the screen components to pure rendering + event forwarding.

## Completion criteria

- `LibraryScreen.tsx`/`SeriesDetailScreen.tsx` no longer compute derived presentation state
  inline — it comes from the hook/transform.
- Tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.
