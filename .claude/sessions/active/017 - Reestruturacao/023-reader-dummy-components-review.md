# Task 023 — Reader: dumb components review (Phase 5 — Reader)

**Status:** todo (integrates with Task 020)

> This task is the original plan 017 "Task 003 — Revisão do princípio 'componentes burros' no
> Reader", reslotted into Phase 5 unchanged, now explicitly integrated with Task 020 (which
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
2. Review together with the chapter-switch contract (Task 021) — the native-event handler
   decision should move inside the hook, with the component only forwarding the raw event.
3. Coordinate with Task 020 (`toBlock` extraction) so both halves of the Reader's dumb-component
   finding land as one coherent review with the user.
4. Apply in the Reader once approved.

## Completion criteria

- User confirms understanding of the principle.
- Decision recorded on whether to apply it in this plan.
- Coordinated with Task 020 before considering the Reader's dumb-component finding closed.
- Tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.
