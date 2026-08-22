# Task 019 — Contract: Chapter implementation (Phase 4 — Implementation)

**Status:** todo (blocked by Task 018 — composes `PageResult[]`)

## Objective

Implement the Chapter contract (Layer 3) for real, in idiomatic Kotlin, from the TypeScript
specification already modeled in Task 008 and recorded in `_contract-design-notes.md` §
"Current contract shapes" (`chapter/contract.ts`) — including `ChapterContract`, `ChapterResult`,
and `ChapterNeighborContract` (the `Omit<ChapterContract, "prevChapter" | "nextChapter">` shape
used to avoid unbounded recursion when a chapter references its neighbors).

## Inputs

- `_contract-design-notes.md`'s `chapter/contract.ts` shape — including the real Kavita field
  mappings already confirmed via the `kavita-api` skill (`decimalNumber`/`SortOrder`,
  `specialLabel`/`Range`, `isSpecial`, `pages.fileFormat`/`MangaFormat`, `resumePoint` from
  `ProgressDto`).
- Task 018's `PageResult`/`PageContract` Kotlin implementation — `ChapterContract.pages.list` is
  `PageResult[]`, built by Chapter (Kotlin) calling the Page domain module directly (same-layer
  composition per R1, not routed through RN).
- Task 017's `Server` module — for the parts of Chapter data not covered by Page composition
  (chapter metadata, `resumePoint`, neighbor resolution).

## Steps

1. Translate `ChapterContract`/`ChapterResult`/`ChapterNeighborContract` into idiomatic Kotlin,
   mirroring the discriminated-union pattern established in Task 018 for `PageResult`.
2. Implement `pages.list` by calling the Page module (Task 018) directly, in-process — same-layer
   composition, never routed back through RN (per R1, already established in the design notes).
3. Implement `prevChapter`/`nextChapter` as `ChapterNeighborContract | null`, filled by Series
   later (R1, optional param) — Chapter itself does not resolve its own neighbors when called in
   isolation; only when Series (Task 020) supplies them.
4. Wire the real implementation to call `Server` (Task 017) directly for chapter-level data — no
   cache layer involved yet.
5. Validate against real data, in particular the `readStatus` derivation (`pages.count`/
   `pages.readCount`, per R4) and the `resumePoint` resolution from `ProgressDto`.

## Completion criteria

- `ChapterContract`/`ChapterResult`/`ChapterNeighborContract` implemented in idiomatic Kotlin,
  matching the TS specification.
- `pages.list` built via direct same-layer composition with the Page module (Task 018), not via
  RN orchestration.
- Calls `Server` directly for chapter-level data, with no cache logic.
- Tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.
- Blocks Task 020 (Series contract, which composes `ChapterResult[]`).
