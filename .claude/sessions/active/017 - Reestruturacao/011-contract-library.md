# Task 011 — Contract: Library (Phase 2 — Contract modeling)

**Status:** done (decision: no Library contract exists — see Result)

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

## Result

**Decision, reached with the user during this session: no `LibraryContract` exists.** Per R1
(Layer 3 is optional per domain, not mandatory), and per Task 006's survey finding that
"Library" today is entirely `KavitaSeriesFeature.listSeries()` (a batch fetch) plus
in-memory-only caching — with no distinct Library domain logic anywhere — the conclusion is
that Library never structurally needed its own Layer 3 contract. "Library" is a **listing
operation on the Series module** (e.g. `Series.listAll()` returning `SeriesResult[]`), consumed
by a Library **Service** (Layer 4) that applies sort/filter/aggregation client-side — mirroring
what the app already does today (confirmed via `FollowingScreen.tsx`, which already reuses this
exact pattern with a client-side filter, no separate contract).

Also investigated: the real Kavita API does have a genuine multi-library concept (23 endpoints,
rich `LibraryDto` with 6 real `LibraryType` values — `Manga`/`Comic`/`Book`/`Image`/
`LightNovel`/`ComicVine` — used server-side for parsing/reading-mode/metadata-provider
selection per content type). Confirmed this is **structural server configuration**, not
something the app's reader-facing UI would typically expose to the end user (no library
switcher use case identified). Deliberately **not** modeled now — if multi-library filtering is
ever needed, it becomes a parameter on the Series listing operation, not a contract to
retrofit, since there's no `LibraryContract` to redesign.

Full reasoning recorded in
`.claude/sessions/active/017 - Reestruturacao/_contract-design-notes.md` § "Library — no Layer
3 contract exists."

**Consequence for downstream tasks (flag, not resolved here):**
- Task 016 ("Correction — Library: `KavitaLibraryFeature.kt`, `LibrarySummaryCacheDao`") was
  written assuming a `KavitaLibraryFeature.kt` would be created — that assumption is now
  **stale**. The real fix is moving `listSeries()`/its supporting private methods from
  `KavitaSeriesFeature.kt` into a dedicated **listing method on the Series module** (still
  Series' own domain, not a new Library domain) — Task 016 needs its description revisited
  before implementation, not before this task closes.
- `LibrarySummaryCacheDao`'s fate (in-memory-only cache found in Task 006) is unresolved — it
  still needs *a* cache-layer fix (the in-memory TTL not surviving restart is a real gap
  regardless of the "no Library domain" decision), but whether that's a Room table under
  Series' own cache module or something else is Task 015/016's call, informed by the cache
  guideline (Task 015), not decided here.
