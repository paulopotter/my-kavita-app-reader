# Task 008 — Contract: Chapter (pilot) (Phase 2 — Contract modeling)

**Status:** done

## Objective

**Co-creation session with the user — conversation + code together.** Model the formal Chapter
domain contract, using real TypeScript data examples (how the app receives and uses chapter
data today) as the anchor. This is the **pilot task**: the contract template itself (what
sections a domain contract document has, what level of detail, how Kotlin/TS sides are
reconciled) is defined *during* this session, not before it — Tasks 009/010/011 reuse whatever
shape comes out of this one, adjusting when a new domain does not fit.

## Why Chapter first

Chapter has the most existing structure to anchor against (`ChapterDataSource`,
`ViewerChapters`, the Reader's trio-of-chapters model) and is the domain the original plan 017
was already circling. It also directly informs the reslotted Reader tasks (021/023), so having
it done early unblocks Phase 5.

## Inputs

- Task 004 survey (fields, operations, consumers, the `ViewerChapters` vs. `SeriesBridge`
  divergence, the duplicated `emitProgressChanged`).
- The provider isolation premise (Task 002) — the contract must be provider-agnostic; Kavita
  specifics stay inside `KavitaChapterFeature`.

## Steps

1. Present the Task 004 survey findings to the user as the starting point for the conversation.
2. Together, define the contract template shape (sections, level of Kotlin/TS reconciliation,
   how progress/read-state is represented) — write it down as reusable guidance for Tasks
   009-011.
3. Model the Chapter contract itself: canonical field shape, operations exposed, how
   `ViewerChapters` (Reader-internal) relates to the new formal contract (does it get replaced,
   or does it become a Reader-local view built on top of the contract? — user decides).
4. Decide the fate of the `SeriesBridge` chapter modeling divergence — reconcile with the new
   contract or keep as an intentionally separate simplified view (user decides, do not assume).
5. Write the contract + any supporting code together with the user, validating feasibility
   before considering it done — never hand over a finished contract without validation.
6. Update `.claude/docs/architecture.md` with the formalized contract once approved.

## Completion criteria

- Contract template shape agreed and documented (reusable by Tasks 009-011).
- Chapter contract modeled, reviewed, and approved by the user.
- Decision recorded on `ViewerChapters` and `SeriesBridge`'s relationship to the new contract.
- `architecture.md` updated.
- If code was written as part of the session: tested on a real device, `make coverage` shows no
  drop, explicit approval before `finalizar-task`.

## Result

Chapter contract modeled through an extended co-creation mini-iteration with the user —
conversation-first, field-by-field, real Kavita API schemas confirmed via the `kavita-api`
skill where relevant (e.g. `Range`/`SortOrder`/`MinNumber`/`IsSpecial`/cover image/
`LastReadingProgressUtc`). Final shape (`ChapterContract`, `ChapterResult`,
`ChapterNeighborContract`) lives in
`.claude/sessions/active/017 - Reestruturacao/_contract-design-notes.md`, alongside the general
rules (R1-R10) established during this and the Page/Series sessions — this file is the reusable
template Tasks 009/010 (and future 011) draw from, fulfilling this task's "contract template"
deliverable.

**Explicit caveats, per user decision:**
- This is a **base contract**, approved as a starting point — not final. It is expected to be
  enriched/revised in future sessions (e.g. when Library is modeled, when `ErrorContract`/
  `ServerDescriptor`/`CacheDescriptor` get their own detailed design, when method signatures
  are eventually defined per R9).
- `architecture.md` was **not** updated as part of closing this task — the user explicitly
  deferred that to a later point (likely after Library is also modeled, to update
  `architecture.md` once with a more complete contract set instead of piecemeal). This is a
  recorded pending item, not an oversight.
- No production code was written in this session — only planning/design artifacts
  (`_contract-design-notes.md`). The "tested on real device / `make coverage`" criterion does
  not apply; there is no code to test yet.

`ViewerChapters`/`SeriesBridge`'s fate: not explicitly resolved as a migration decision in this
session — the new `ChapterContract` was modeled from first principles (real API + domain
reasoning), not as a reconciliation of the two existing divergent shapes found in Task 004's
survey. That reconciliation is implementation work, not contract-shape work — flagged for
whichever task actually migrates the Reader/Series screens onto the new contract.
