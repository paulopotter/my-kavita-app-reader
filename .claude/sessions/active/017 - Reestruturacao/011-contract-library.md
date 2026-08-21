# Task 011 — Contract: Library (Phase 2 — Contract modeling)

**Status:** todo (blocked by Task 006, Task 008)

## Objective

**Co-creation session with the user.** Model the formal Library domain contract, reusing the
template shape from Task 008, anchored in real TypeScript data examples. This contract is the
basis for creating `KavitaLibraryFeature.kt` and `LibrarySummaryCacheDao` in Task 016.

## Inputs

- Task 006 survey (confirmed absence of `KavitaLibraryFeature.kt`, in-memory-only cache,
  `KavitaSeriesFeature` methods that really belong to Library).
- The finished Series contract (Task 010) — Library composes Series summaries.
- The cache guideline (Task 015) if already done by this point — otherwise this task notes
  cache-related open questions for Task 015 to resolve, without deciding them here.

## Steps

1. Present the Task 006 survey findings to the user.
2. Model the Library contract using the Task 008 template.
3. Decide the split between `KavitaLibraryFeature.kt` (new) and `KavitaSeriesFeature.kt`
   (existing) — which methods move, which stay, based on the domain composition
   (`Page → Chapter → Series → Library`).
4. Decide the shape of `LibrarySummaryCacheDao` (Room) at a contract level (what it stores, not
   the full migration/DAO code — that is Task 016).
5. Write the contract + any supporting code together with the user, validating feasibility
   before considering it done.
6. Update `.claude/docs/architecture.md` with the formalized contract once approved.

## Completion criteria

- Library contract modeled, reviewed, and approved by the user, including the
  `KavitaLibraryFeature`/`KavitaSeriesFeature` method split decision.
- `architecture.md` updated.
- If code was written: tested on a real device, `make coverage` shows no drop, explicit
  approval before `finalizar-task`.
