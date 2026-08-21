# Task 005 — Survey: Series domain (Phase 1 — Survey)

**Status:** todo (blocked by Task 001)

## Objective

**Survey only — do not propose a contract in this task.** Catalogue what exists today for the
Series domain.

## Steps

1. List every field associated with "series" today across Kotlin (`KavitaSeriesFeature`, Room
   entities) and RN (`SeriesDetailScreen.tsx`, `useSeriesDetail.ts`, `SeriesBridge`).
2. List every operation — list series, fetch series detail, compute series-level progress
   aggregate (`readCount`/`progressFraction`).
3. Record the 3 places `readCount`/`progressFraction` are currently (re)computed, with
   file:line, and note any difference in the formula/result between them (known finding from
   the original audit — this survey formalizes it with exact locations, does not fix it).
4. Record that `KavitaSeriesFeature.listSeries()` reads `chapterCacheDao` directly instead of
   delegating to the Chapter layer (known finding — exact call sites for Task 017 to use).
5. List every consumer of series data (Library screen, Series Detail screen, any others).
6. Write findings as a plain inventory — no proposed contract shape, no fix.

## Completion criteria

- Inventory of fields, operations, and consumers for the Series domain is complete, including
  exact file:line locations for the 3 duplicated progress-aggregate computations and the direct
  `chapterCacheDao` read.
- No contract shape proposed (that is Task 010), no fix applied (that is Task 017).
