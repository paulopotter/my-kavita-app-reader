# Task 004 — Survey: Chapter domain (Phase 1 — Survey)

**Status:** todo (blocked by Task 001)

## Objective

**Survey only — do not propose a contract in this task.** Catalogue what exists today for the
Chapter domain. This is the most advanced domain in terms of existing structure (via the
Reader's `ChapterDataSource`/`ViewerChapters`), which is why the contract-modeling pilot
(Task 008) starts here.

## Steps

1. List every field associated with "chapter" today across Kotlin (`ChapterDataSource`,
   `KavitaChapterFeature`, `chapterCacheDao`/Room entities) and RN (`ViewerChapters`, hook
   state in `useReader.ts`, `SeriesBridge`'s own chapter modeling for the Series screen).
2. List every operation — fetch single chapter, fetch neighbor, fetch page list, mark read,
   save/read progress (local + remote), emit progress-changed event.
3. List every consumer — Reader screen/hook, Series screen (which has its *own* chapter
   modeling via `SeriesBridge`, unrelated to `ViewerChapters` — flag this divergence explicitly,
   it is a known "no single contract" finding from the original audit).
4. Note the duplicated `emitProgressChanged` implementations (`SeriesModule.kt` vs.
   `ReaderChapterModule.kt`) as a data point for this survey (the actual fix is Task 018) —
   record where each one lives and what triggers it.
5. Write findings as a plain inventory — no proposed contract shape.

## Completion criteria

- Inventory of fields, operations, and consumers for the Chapter domain is complete, including
  the `ViewerChapters` vs. `SeriesBridge` divergence and the duplicated `emitProgressChanged`.
- No contract shape proposed (that is Task 008).
