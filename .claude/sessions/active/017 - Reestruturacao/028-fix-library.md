# Task 028 — Correction: Library (Phase 5 — Corrections)

**Status:** todo (blocked by Task 015, Task 011, Task 002, and Tasks 016-023 — Library's series
listing now goes through the real `Server` module (Task 017) and the real `Cache`/`CacheManager`
implementation (Task 023), not just their design) — scope revised 2026-08-21 in a
mini-iteration with the user, superseding the original framing below. Do not follow the old
"create `KavitaLibraryFeature.kt`" plan — see **Revised scope** for what actually applies.

## Original objective (superseded, kept for history)

Fix Library's actual gap found by Task 006's survey: caching is in-memory only (2-minute TTL,
`LibraryModule.kt`) and does not survive an app restart — no `LibrarySummaryCacheDao`/Room table
exists.

## Revised scope (2026-08-21 — supersedes the steps below)

**Confirmed real code, via Explore agent (paths/lines are real, not inferred):**

- `LibraryModule.kt` (`android/app/src/main/kotlin/com/mymangareader/LibraryModule.kt`) is a
  `NativeModule` exposing 4 `@ReactMethod`s: `listSeries` (lines 37-55, holds its own
  `@Volatile var lastSeries`/`lastFetchMs` cache, 2-min TTL), `toggleFollow` (lines 57-62,
  **duplicated** — identical method already exists in `SeriesModule`), `syncBff` (lines 64-69,
  delegates to `BffFeature.syncBff(lastSeries)` — depends on the Module's own cached list),
  `saveReadingProgress` (lines 71-76, already 100% delegates to `KavitaChapterFeature`).
- The feature behind it (name pending — see below) already has a stateless `listSeries()` doing
  the real HTTP call, progress/BFF-match resolution, and returning `SeriesSummary` (an ad-hoc
  DTO, not the modeled `SeriesContract`) — no TTL logic lives there.
- `FollowingScreen.tsx` doesn't call any NativeModule directly — it wraps `LibraryScreen` with a
  client-side filter (`s.isFollowed`). `LibraryScreen` consumes `NativeModules.LibraryModule` via
  `frontend/src/shared/bridge/library.ts`. Only that bridge file needs to point elsewhere if the
  native module's name changes — no change needed in `FollowingScreen.tsx`/`LibraryScreen.tsx`'s
  own logic.

**Decisions confirmed with the user for this task:**

1. **`LibraryModule.kt` is deleted outright** — no NativeModule named "Library" survives, thin or
   otherwise. Per Task 011, "Library" isn't a domain — it's a listing operation on Series plus a
   client-side filter (Following). There's no reason to keep a NativeModule named after a
   non-domain.
2. **The listing operation moves into the `Server` module (Layer 2, per Task 014's manager
   design)**, not into any Kavita-named class — `Server` is the generalizer; the Kavita adapter
   is an internal implementation detail behind it, never named directly at this level.
3. **The wire format is always the already-modeled contract, never an ad-hoc DTO.** Today's
   `SeriesSummary` is replaced by `SeriesResult[]` (the real `SeriesContract`/`SeriesResult`
   shape from `_contract-design-notes.md`) — whatever the listing method is called, it returns
   an array of the same shape already agreed on for a single series.
4. **Whether the listing is 1 batch call or N individual calls behind that method is an
   implementation-time decision, not fixed here** — Kavita's real API only offers a batch
   endpoint (`POST /api/Series/all-v2`), so per R7 the natural shape is one real batch call
   producing `SeriesResult[]`, but this gets modeled for real during implementation, not
   speculated now.
5. **Cache TTL moves entirely to `CacheManager` (Task 015)** — no `@Volatile var`/ad-hoc TTL
   field survives anywhere. The listing's `SeriesResult[]`, once fetched, carries its own
   `.cache: CacheDescriptor` per item (already part of `SeriesContract`); `CacheManager` is what
   decides how long a cache entry is considered fresh, not a hardcoded constant in a module.
6. **RN owns orchestration by default; Kotlin stays a thin layer** — this generalizes beyond
   Library, per the user's explicit correction: "o RN que é responsavel por tudo, o kotlin é só
   uma camada fina." Concretely for this task:
   - `saveReadingProgress` — RN decides when to save; Kotlin only exposes the atomic operation
     (already the case, it just needs a new home — likely wherever `ChapterModule`/Chapter's own
     Server-backed method lives, not a Library-named class).
   - `syncBff` — RN decides *when* to trigger a sync (e.g. on screen open), but the actual
     composition (Series module asking the BFF/`ExternalMetadata` module for its part) can
     happen **inside Kotlin**, same-layer composition per R1 ("a domain may call another
     same-layer module directly, e.g. Series asking Chapter") — this is not "business logic in
     Kotlin," it's the same structural delegation already allowed between Layer 2/3 modules.
     RN never needs to fetch the list and hand it to Kotlin as a parameter for this to work.
   - `toggleFollow` — the duplicate in the old `LibraryModule` is removed; only the one already
     in `SeriesModule` survives.

## Steps (revised)

1. Delete `LibraryModule.kt`. Confirm nothing else references it (`AppReactPackage.kt`'s
   `createNativeModules` list, any remaining bridge import).
2. Add the series-listing operation to the `Server` module (or wherever Layer 2/3 for Series
   ends up living per Task 014's design), returning `SeriesResult[]` — not `SeriesSummary`.
   Decide at this point whether it's a single real batch call or another shape, per Task 014's
   already-modeled `Server.getX(id)` pattern extended to a list operation.
3. Wire `CacheManager` (RN) to own the cache-then-network sequence and TTL for this listing,
   per the Task 015 guideline — no cache logic left inside the Kotlin listing method itself.
4. Relocate `saveReadingProgress` to wherever Chapter's own Server-backed bridge method lives.
5. Relocate/keep `syncBff` orchestration: RN decides when to call it; the Series↔BFF
   (`ExternalMetadata`) composition may happen inside Kotlin as same-layer delegation.
6. Remove the duplicate `toggleFollow` from the old Library path — `SeriesModule`'s existing one
   is the only one left.
7. Update `frontend/src/shared/bridge/library.ts` (or fold it into `shared/bridge/series.ts`) to
   point at the new native module/method names. Update `LibraryScreen.tsx`'s hook to consume
   `SeriesResult[]` instead of `SeriesSummary[]` if the shape changed.
8. Verify `FollowingScreen.tsx` still works unchanged (it should — it only filters whatever
   `LibraryScreen` now receives).

## Completion criteria

- `LibraryModule.kt` no longer exists; its 4 responsibilities are relocated per the decisions
  above, with no duplicated logic left behind.
- Library's series listing returns `SeriesResult[]` (the modeled contract), not an ad-hoc DTO.
- Cache-then-network sequencing and TTL for the listing are owned by `CacheManager`, not by any
  `@Volatile var`/hardcoded constant in Kotlin.
- Library data survives an app restart (manual verification on device).
- Tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.
