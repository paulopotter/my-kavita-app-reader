# Task 017 — Correction: Series (Phase 4 — Corrections)

**Status:** todo (blocked by Task 010, Task 008)

## Objective

Implement the Series contract from Task 010: stop `KavitaSeriesFeature.listSeries()` from
reading `chapterCacheDao` directly (delegate to the Chapter layer instead), and unify
`SeriesSummary`'s progress aggregate (`readCount`/`progressFraction`) into the single canonical
computation decided in Task 010, replacing the 3 divergent implementations found in the Task
005 survey.

## Steps

1. Replace the direct `chapterCacheDao` read in `KavitaSeriesFeature.listSeries()` with a call
   through the Chapter contract/layer (per Task 008/010 decisions).
2. Implement the single canonical `readCount`/`progressFraction` computation (per Task 010) and
   remove the 2 other divergent implementations found in Task 005, pointing all 3 former call
   sites at the single one.
3. Verify no behavior regression in Series Detail and Library screens that consume this data.

## Completion criteria

- `KavitaSeriesFeature.listSeries()` no longer reads `chapterCacheDao` directly.
- Only one implementation of the series progress aggregate exists in the codebase.
- Tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.
