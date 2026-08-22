# Task 020 — Contract: Series implementation (Phase 4 — Implementation)

**Status:** todo (blocked by Task 019 — composes `ChapterResult[]`)

## Objective

Implement the Series contract (Layer 3) for real, in idiomatic Kotlin, from the TypeScript
specification already modeled in Task 010 and recorded in `_contract-design-notes.md` §
"Current contract shapes" (`series/contract.ts`) — including `SeriesContract`/`SeriesResult`, the
`chapters.readCount`/`total` fields **derived** from `chapters.list` (never a separately-fetched
number, per Task 010's canonical progress-aggregate decision), and the `resumePoint` 2-level
resolution cascade.

## Inputs

- `_contract-design-notes.md`'s `series/contract.ts` shape, including the real Kavita field
  mappings confirmed via the `kavita-api` skill (`library`, `lastUpdatesUTC`, `otherNames`,
  `otherIds`, `colors`, the second-call `metadata` block from `SeriesMetadataDto`).
- Task 019's `ChapterResult`/`ChapterContract` Kotlin implementation — `SeriesContract.
  chapters.list` is `ChapterResult[]`, built by Series (Kotlin) calling the Chapter domain module
  directly (same-layer composition, per R1 — this is also what fills each chapter's
  `prevChapter`/`nextChapter` neighbor fields, since Series is the one with visibility into
  chapter order).
- Task 017's `Server` module — for series-level metadata not covered by Chapter composition.

## Steps

1. Translate `SeriesContract`/`SeriesResult` into idiomatic Kotlin, mirroring the discriminated-
   union pattern established in Tasks 018/019.
2. Implement `chapters.list` by calling the Chapter module (Task 019) directly, in-process —
   same-layer composition — and use that same call to resolve each chapter's `prevChapter`/
   `nextChapter` neighbor fields (Series has the full chapter order, Chapter alone does not).
3. Implement the canonical `chapters.readCount`/`total` derivation from `chapters.list` (never a
   separately-fetched value) and the `resumePoint` 2-level cascade (first `IN_PROGRESS` chapter
   in order → else first `UNREAD` chapter in order → else `null`), per Task 010's decision.
4. Implement the second network call for `metadata` (`SeriesMetadataDto` — description, genres,
   tags, publication status, age rating, release year, language) as a distinct fetch, same
   pattern already accepted for Page's dimensions requiring their own call.
5. Wire the real implementation to call `Server` (Task 017) directly — no cache layer involved
   yet.

## Completion criteria

- `SeriesContract`/`SeriesResult` implemented in idiomatic Kotlin, matching the TS specification.
- `chapters.list` built via direct same-layer composition with the Chapter module (Task 019).
- Canonical progress-aggregate derivation and `resumePoint` cascade implemented exactly per Task
  010's decision — no divergent recomputation reintroduced.
- Calls `Server` directly for series-level data, with no cache logic.
- Tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.
- Blocks Task 021 (RN Services, which consume Page/Chapter/Series contracts) — Page, Chapter, and
  Series (Tasks 018-020) are all implemented before any RN Service is built on top of them.
