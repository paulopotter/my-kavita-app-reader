# Task 016 — Correction: Library (Phase 4 — Corrections)

**Status:** todo (blocked by Task 015, Task 002) — ⚠️ **scope stale, needs revision before
implementation**: Task 011 closed with the decision that no `LibraryContract`/`KavitaLibraryFeature`
is created — Library is a listing operation on the Series module, not its own Layer 3 domain
(see `011-contract-library.md` § Result). Steps below still describe the pre-decision
assumption (`KavitaLibraryFeature.kt` as a separate feature) — re-read Task 011 and revise this
task's steps (likely: a listing method on the Series feature/module instead of a new class)
before starting implementation.

## Objective

Fix Library's actual gap found by Task 006's survey: caching is in-memory only (2-minute TTL,
`LibraryModule.kt`) and does not survive an app restart — no `LibrarySummaryCacheDao`/Room table
exists. Apply the cache guideline from Task 015 and provider isolation (Task 002). The original
framing ("create `KavitaLibraryFeature.kt` separated from `KavitaSeriesFeature`") is superseded
by Task 011's decision — see the warning above.

## Steps

1. Create `KavitaLibraryFeature.kt`, moving the Library-scoped methods currently living in
   `KavitaSeriesFeature.listSeries()` (per the Task 011 split decision).
2. Create `LibrarySummaryCacheDao` (Room) and the corresponding migration, per the Task 011
   contract shape and the Task 015 cache guideline.
3. Wire the new feature/DAO following the existing `DataSource` + Hilt `@Binds` pattern (or the
   Task 014 manager module, if Task 011/014 decided Library should go through it).
4. Update `LibraryScreen.tsx`/its hook to consume the new contract if the shape changed from
   what it consumes today.
5. Remove the in-memory-only cache path once Room is in place and verified working.

## Completion criteria

- `KavitaLibraryFeature.kt` and `LibrarySummaryCacheDao` exist and are wired per the approved
  contract.
- Library data survives an app restart (manual verification on device).
- Tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.
