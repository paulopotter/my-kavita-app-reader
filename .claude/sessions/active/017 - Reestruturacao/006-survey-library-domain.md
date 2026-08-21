# Task 006 — Survey: Library domain (Phase 1 — Survey)

**Status:** todo (blocked by Task 001)

## Objective

**Survey only — do not propose a contract in this task.** Catalogue what exists today for the
Library domain. This is the domain with the most severe existing violation
(`KavitaLibraryFeature.kt` does not exist, and Library caching is in-memory only), so the
survey needs to be precise about exactly what stands in for the missing pieces today.

## Steps

1. Confirm and document that `KavitaLibraryFeature.kt` does not exist, and that
   `KavitaSeriesFeature.listSeries()` currently assumes that role. List every method on
   `KavitaSeriesFeature` that is really "Library" responsibility, not "Series" responsibility.
2. Document the current in-memory cache (2-minute TTL) used for Library listing — where it
   lives, what invalidates it, and confirm it does not survive an app restart (no
   `LibrarySummaryCacheDao`, no Room table).
3. List every field/operation the Library screen needs (list of series summaries, filters,
   sort order, alphabet index) and where each is currently computed (RN vs. Kotlin).
4. List every consumer (`LibraryScreen.tsx`, `FollowingScreen` per backlog 004, any others).
5. Write findings as a plain inventory — no proposed contract shape, no fix.

## Completion criteria

- Inventory of fields, operations, and consumers for the Library domain is complete, including
  exact confirmation that `KavitaLibraryFeature.kt` and `LibrarySummaryCacheDao` do not exist.
- No contract shape proposed (that is Task 011), no fix applied (that is Task 016).
