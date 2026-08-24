---
status: done
---

# Task 020 — Contract: Series implementation (Phase 4 — Implementation)

**Status:** done

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

## Result

Implemented as `SeriesFields`/`SeriesDigest` (`:content-digest`, `series/SeriesDigest.kt`) — same
sealed `Success`/`Failure` idiom Tasks 018/019 established, not the original TS `SeriesContract`/
`SeriesResult` names. No `SeriesNeighborDigest` exists (a series has no prev/next concept) —
`chapters.list` is `List<ChapterDigest>` directly, and `SeriesDigest` is the one that resolves each
chapter's `prevChapter`/`nextChapter` (`ChapterDigest` alone has no visibility into chapter order).

**Real corrections/decisions found while implementing, on top of the modeling-phase spec:**
- `PluginSerial` and the new `PluginSeriesMetadata` were **split into two `:server` types**,
  reflecting the two real network calls (`SeriesDto` vs. `SeriesMetadataDto`) instead of the
  pre-existing pattern (Task 017) of merging both into one `PluginSerial` via a parallel fetch —
  `Server.Serial.get()` and `Server.Serial.getMetadata()` are now independent calls.
- `KavitaSeriesDto`/`KavitaSeriesMetadataDto` extended to mirror the real Kavita schemas in full
  (same "map everything the API returns" rule already applied to `KavitaChapterDto` in Task 019).
- `PluginSerial.name` is **Vital**: the Kavita adapter throws if `name` comes back null, instead of
  silently defaulting — this is what turns a nameless series into a real `SeriesDigest.Failure`.
- `PluginAgeRating{rating, system}` — `system` is decided by the adapter ("Kavita", not a hardcoded
  "ESRB"), since Kavita's real `AgeRating` enum names (`Unknown`/`Teen`/`Mature17Plus`/...) aren't
  actual ESRB vocabulary.
- **`number` (Chapter's own field, Task 019) is now resolved for real when built inside
  `SeriesDigest.chapters.list`**: the chapter's 1-indexed position in the `decimalNumber`-sorted
  list, superseding `buildChapterDigest`'s own isolated-call fallback (`decimalNumber` truncated,
  or `null`) — this was flagged as pending in Task 019's own README and closes it here.
- New `buildChapterDigest(..., knownChapter: PluginChapter? = null, ...)` parameter (Task 019's
  file, closed as part of this task): a **completeness check**, not a fallback/merge — `Series`
  passes the `PluginChapter` it already fetched via `chapters.list()`, and `chapter.get()` is
  skipped only when every field `buildChapterDigest` itself reads is non-null on that value;
  otherwise the passed-in value is discarded entirely and `get()` runs from scratch. A dedicated
  reflection-based test (`PluginChapterCompletenessTest.kt`) guards this from silently going stale
  if `PluginChapter` ever gains a new field.
- `chapters.readCount` counts **chapters** with `readStatus == READ` (not pages) — `null` only for
  a genuinely empty `chapters.list`, distinct from a real `0` (chapters exist, none read yet).
- `chapters.resumePoint`'s 2-level cascade (first `IN_PROGRESS` → first `UNREAD` → `null`) reads
  each chapter's already-computed `ChapterDigest.Success.readStatus` — no recomputation.

**Testing:**
- `make coverage` (Kotlin): floor raised from 74 to 76 (measured ~76.50%, `:content-digest` module
  at ~99% line coverage, excluding generated `BuildConfig`). `SeriesDigestTest.kt` covers every
  derivation rule above (chapter sort with a special/extra chapter, `number` as sorted position,
  `prevChapter`/`nextChapter` correctness, `chapters.status`'s 3 states including a real per-chapter
  failure inside the list, `readCount`'s empty-vs-zero distinction, `resumePoint`'s full cascade).
  `PluginChapterCompletenessTest.kt` covers the `knownChapter` staleness guard.
- **Not tested on a physical Android device** — same Phase 4 decision as Tasks 018/019.
- **Validated against a real, live Kavita server** — a manual smoke test (kept outside the repo,
  same pattern as Tasks 018/019 — see `project_kavita_real_server`/`feedback_validar_com_smoke_test_real`
  memories) called `buildSeriesDigest` end to end. A 17-chapter series came back with
  `chapters.status=SUCCESS`, `readCount=17`, chapters numbered `1..17` in sorted order,
  `library`/`lastUpdatesUTC`/`otherNames`/`otherIds`/`colors`/`metadata` all populated correctly,
  and `ageRating={rating: "Unknown", system: "Kavita"}` confirming the ESRB-naming correction above.

## Approval

User reviewed the design in multiple mini-iterations throughout the session (the `chapters`/
`metadata` Necessary/Aggregating failure handling, the `knownChapter` completeness-check design
after two rounds of correction, the 2-pass `number`/neighbor resolution after a real bug was found
and fixed during self-review, `readCount`'s empty-list-is-null rule), reviewed the real-server
smoke test output (as a downloaded JSON file), then explicitly approved: "Faz o Readme, se ja tem
os testes, pode commitar (pequenos commits), e pode fechar a task".

**Post-close correction (2026-08-24):** the real smoke test output (~3MB for one 17-chapter
series) turned out to be too large for mobile use once scaled across a real library (119 series).
Added a `full: Boolean = false` parameter to `buildChapterDigest`/`buildSeriesDigest` — see the
"Pós-fechamento" section in this task's completion doc
(`.claude/completions/2026-08-23_020-contract-series-implementation.md`) for the full writeup.
