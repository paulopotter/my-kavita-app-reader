---
status: done
---

# Task 019 — Contract: Chapter implementation (Phase 4 — Implementation)

**Status:** done

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

## Result

Implemented as `ChapterFields`/`ChapterDigest`/`ChapterNeighborDigest` (`:content-digest`,
`chapter/ChapterDigest.kt`) — same real-Kotlin-implementation idiom Task 018 established for
`PageDigest` (sealed `Success`/`Failure`, no separate `XResult` wrapper), not the original TS
`ChapterContract`/`ChapterResult` names. `ChapterFields` is a shared interface both `ChapterDigest.
Success` and `ChapterNeighborDigest.Success` implement, avoiding duplicating every field
declaration across the two hierarchies (`ChapterNeighborDigest` = `ChapterFields` minus
`prevChapter`/`nextChapter`, the only recursion-causing fields).

**Real corrections found while implementing, on top of the modeling-phase spec:**
- `KavitaChapterDto` was mapping only a handful of `ChapterDto`'s real fields — extended to mirror
  the full schema (~78 properties), even ones no `ChapterContract` field reads yet, per the user's
  explicit call ("map everything the API returns, decide usage one layer up").
- `PluginChapter.decimalNumber`/`isSpecial`/`pageCount`/`pagesRead` all became nullable in
  `:server` itself (not just in the digest) — the nullability is about a future non-Kavita
  provider possibly lacking the concept, not about today's Kavita omitting values.
- `specialLabel` (`Range`) is populated **only when `isSpecial == true`** — a real-server smoke
  test showed `Range` comes back populated with the same value as a normal chapter's number even
  for non-special chapters, so gating on `isSpecial` (not a string comparison against `number`)
  was the correct rule, not the originally-assumed "diverges from number" heuristic.
- `pages.totalWidthPx`/`totalHeightPx` — spec originally assumed these always stay `null` (fetching
  per-page width assumed costly); in practice `pages.list` already carries `width`/`height` for
  free (Task 018's `PageDigest` fetches dimensions by default), so these are now really computed —
  summed only when every page succeeded **and** has usable (non-zero) dimensions.
- `coverImage` ended up richer than the modeling-phase spec expected: `:server` gained a genuine
  `ImageDescriptor` type (`aspectRatio`/`orientation` already computed) plus `Serial.
  getCoverImage()`/`Chapter.getCoverImage()`, reusing the same derivation formula `PageDigest`
  already had instead of duplicating it — cover URLs are pure string concatenation (Kavita's
  `/api/Image/{series,chapter}-cover`), no network call, same idiom as `page().getUrl()`.
- `PageDigest.chapter`'s Task-018 placeholder (`Chapter{id, serial.id}`) is gone — replaced by
  `ChapterSummary`, the subset of `ChapterFields` resolvable *before* `pages.list` exists (avoids a
  circular dependency: `ChapterDigest` needs `PageDigest`, which would need a complete
  `ChapterDigest` if it required the full type).
- New `parseIsoUtcToEpochMs` (`:tools/datetime`) — no existing ISO date parser in the codebase;
  Kavita's `*Utc` fields have no timezone in the value itself and variable fractional-second
  precision, so `Instant.parse()` doesn't apply directly.

**Testing:**
- `make coverage` (Kotlin): floor raised from 71 to 74 (measured ~74.89%, `:content-digest` itself
  at ~99% line coverage). All existing tests still pass; `ChapterDigestTest.kt` covers every
  derivation rule above (readStatus's 3 states + null fallback, pages.status's 3 states,
  number/specialLabel edge cases, totalWidthPx/totalHeightPx's success/failure/empty cases,
  prevChapter/nextChapter passthrough for both Success and Failure neighbors).
- **Not tested on a physical Android device** — per this plan's Phase 4 decision (already recorded
  earlier in this session): Contract-implementation tasks don't get real-device testing.
- **Validated against a real, live Kavita server instead** (user's own instance) — a manual smoke
  test (kept outside the repo, in this project's memory/scratchpad — see `project_kavita_real_server`
  and `feedback_validar_com_smoke_test_real` memories) called `buildChapterDigest` end to end and
  confirmed real values (37-page chapter, `readStatus=READ`, `totalWidthPx=26640`/
  `totalHeightPx=246145`, `specialLabel=null` with `isSpecial=false`, real cover URLs). This is the
  test that surfaced the `specialLabel` correction above.

## Approval

User reviewed the design in multiple mini-iterations (types, nullability, `ImageDescriptor`
placement, `totalWidthPx`/`totalHeightPx` calculation) throughout the session, requested and
reviewed the real-server smoke test output, then explicitly said "faça os commits pequenos ... e
pode fechar esse plano".
