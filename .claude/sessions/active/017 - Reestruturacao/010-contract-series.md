# Task 010 — Contract: Series (Phase 2 — Contract modeling)

**Status:** done

## Objective

**Co-creation session with the user.** Model the formal Series domain contract, reusing the
template shape from Task 008, anchored in real TypeScript data examples.

## Inputs

- Task 005 survey (fields, operations, consumers for Series, including the 3 duplicated
  progress-aggregate computations and the direct `chapterCacheDao` read finding).
- The finished Chapter contract (Task 008) — Series composes Chapter data (progress aggregate
  is derived from chapter-level read state).

## Steps

1. Present the Task 005 survey findings to the user, including the exact 3 locations where
   `readCount`/`progressFraction` are currently recomputed differently.
2. Model the Series contract using the Task 008 template.
3. Decide the single canonical way to compute the series progress aggregate (`readCount`/
   `progressFraction`) — this becomes the one source of truth Task 017 implements.
4. Decide how Series should obtain chapter data going forward (must delegate to the Chapter
   contract/layer, not read `chapterCacheDao` directly — the actual code fix is Task 017, this
   task only decides the contract shape that fix will follow).
5. Write the contract + any supporting code together with the user, validating feasibility
   before considering it done.
6. Update `.claude/docs/architecture.md` with the formalized contract once approved.

## Completion criteria

- Series contract modeled, reviewed, and approved by the user, including the single canonical
  progress-aggregate formula.
- Decision recorded on how Series delegates to Chapter (informs Task 017).
- `architecture.md` updated.
- If code was written: tested on a real device, `make coverage` shows no drop, explicit
  approval before `finalizar-task`.

## Result

Series contract modeled via the same co-creation mini-iteration process, confirmed against
Kavita's real `SeriesDto`/`SeriesMetadataDto` schemas via the `kavita-api` skill. Canonical
progress-aggregate decision: `SeriesContract.chapters.readCount`/`total` are **derived** from
`chapters.list` (never a separately-fetched/duplicated number) — resolves Task 005's finding of
5 independent formulas computing the same thing. Delegation decision: Series (Layer 3) calls the
Chapter domain module (Layer 3) **directly** to build `chapters.list: ChapterResult[]` —
same-layer composition, not routed through RN — this directly informs Task 017's fix (stop
reading `chapterCacheDao` from `KavitaSeriesFeature` directly, delegate to the Chapter module
instead). Also produced, during this session: the 6-layer reference architecture (Layer
0-5, formalized in the design notes' R1) that clarifies where `Server`/`Cache`/`Image` modules,
domain contracts, RN Services, and screens each live and how they're allowed to call each other.
Final shape lives in
`.claude/sessions/active/017 - Reestruturacao/_contract-design-notes.md`.

**Explicit caveats, per user decision (same as Tasks 008/009):**
- **Base contract**, not final — several fields deliberately excluded pending further review
  (e.g. `MangaFormat`/file format at the series level — user judged unnecessary at this level,
  unlike Chapter, where it was kept; the richer `SeriesMetadataDto` fields not yet modeled,
  like `writers`/`characters`/other `PersonDto`-based roles).
- `architecture.md` update deferred, not done — recorded pending item, likely bundled once
  Library's contract is also modeled.
- No production code written this session — coverage/device-testing criterion does not apply.
