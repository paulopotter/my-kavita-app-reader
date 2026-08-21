# Task 016 — Correction: Library (Phase 4 — Corrections)

**Status:** todo (blocked by Task 011, Task 015, Task 002)

## Objective

Implement the Library contract from Task 011: create `KavitaLibraryFeature.kt` (separated from
`KavitaSeriesFeature`), create `LibrarySummaryCacheDao` (Room — today Library caching is
in-memory only and does not survive a restart), apply the cache guideline from Task 015, and
apply provider isolation (Task 002) so nothing outside `KavitaLibraryFeature` knows Kavita
specifics for Library data.

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
