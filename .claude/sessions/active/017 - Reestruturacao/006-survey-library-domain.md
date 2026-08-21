# Task 006 — Survey: Library domain (Phase 1 — Survey)

**Status:** done

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

## Findings

### 1. `KavitaSeriesFeature.kt` methods that are really "Library" responsibility

`android/features/src/main/kotlin/com/mymangareader/features/kavita/series/KavitaSeriesFeature.kt`

| Method | Lines | Why it's "Library", not "Series" |
|---|---|---|
| `listSeries()` | 91-133 | Fetches **all** series at once (`POST /api/Series/all-v2`, lines 17-19, 100-107), builds an aggregated `List<SeriesSummary>`, cross-referencing `chapterCacheDao.getBySeriesId` (112) and `bffMatchDao.getBySeriesId` (113) per item — listing/collection aggregation, not a single-series operation. This is the role the earlier audit already flagged as belonging to a non-existent `KavitaLibraryFeature`. |
| `deriveReadStatus(pagesRead, pages)` | 235-239 | Private, only used inside `listSeries()` to compute each list item's `readStatus`. |
| `resolveProgress(localChapters, pagesRead, pages)` | 241-252 | Same — only used inside `listSeries()`. |
| `String.toPublicationStatus()` | 254-261 | Same — maps BFF status per list item inside `listSeries()`. |
| `SeriesSummary` type | 23-39 | The output DTO of `listSeries()` — models "one library-list row" (aggregated progress/cover/publication status), not single-series data (that's `SeriesDetail`, lines 41-45). |

Legitimately "Series" (single-series detail, not listing): `getSeriesDetail`, `getSeriesMetadata`,
`getCachedSeriesDetail`, `getCachedSeriesMetadata`, `cacheSeriesDetail`/`cacheSeriesMetadata`.

Confirmed by direct search: `KavitaLibraryFeature.kt` does **not exist** anywhere in the repo.

### 2. In-memory Library cache

`android/app/src/main/kotlin/com/mymangareader/LibraryModule.kt`

| Aspect | Location | Detail |
|---|---|---|
| Cache state | `lines 33-35` | `@Volatile lastSeries: List<SeriesSummary>`, `@Volatile lastFetchMs: Long`, `cacheTtlMs = 2 * 60 * 1000L` — instance fields on a `@Singleton` module, no disk persistence whatsoever. |
| Read/write path | `listSeries()`, lines 38-55 | If `!forceRefresh && cached.isNotEmpty() && (now - lastFetchMs) < cacheTtlMs`, resolves from memory; otherwise calls `kavitaSeriesFeature.listSeries()` and reassigns both fields. |
| Invalidation | — | No event-driven invalidation (follow/unfollow, progress change don't reset the TTL). Only `forceRefresh=true` (RN pull-to-refresh/retry) forces a refetch; otherwise the TTL just expires. |
| Survives process restart? | — | **No.** Plain Kotlin instance fields — confirmed no `LibrarySummaryCacheDao`, no Room table, no `SharedPreferences` anywhere in the repo. A killed app always hits network on the next `listSeries()` call (`lastFetchMs=0`). |
| Adjacent `@ReactMethod`s in the same file | lines 57-76 | `syncBff`/`toggleFollow`/`saveReadingProgress` also live in `LibraryModule.kt` but delegate to `BffFeature`/`FollowedSeriesDao`/`KavitaChapterFeature` respectively — hosted here for RN API surface convenience, not Library's own cache/domain. |

### 3. Fields/operations the Library screen needs today, and where each is computed

| Field/operation | Computed where | File:line |
|---|---|---|
| List of series summaries (`SeriesSummary[]`) | Kotlin (`listSeries()`) → bridge → RN consumes as-is | `KavitaSeriesFeature.kt:91-133`, exposed via `LibraryModule.kt:37-55`, typed in `frontend/src/shared/bridge/library.ts:6-23` |
| `isFollowed` per item | Kotlin, at response-serialization time | `LibraryModule.kt:78-100` (line 97), cross-referenced with `followedSeriesDao.getAllIds()` (line 42) |
| Reactive `isFollowed` update without refetch | RN | `useLibrary.ts:63-69` (`SET_FOLLOWED_IDS`), driven by `SeriesFollowedEmitter` event |
| Reactive progress update without refetch | RN | `useLibrary.ts:70-79` (`PROGRESS_CHANGED`), driven by `SeriesProgressChangedEmitter` event |
| Sort (`RECENTLY_UPDATED` / `ALPHABETICAL`) | RN, 100% client-side | `useLibrary.ts:31-42` (`sortSeries`) |
| View mode (`GRID`/`LIST`) | RN state + persisted via `ConfigRepository` (generic UI prefs, not Library-specific) | `useLibrary.ts:17,52-53,146-149` |
| Filter (used by `FollowingScreen`) | RN, function prop applied in `useMemo` | `useLibrary.ts:170-173`; filter itself (`s => s.isFollowed`) in `frontend/src/screens/following/FollowingScreen.tsx:6` |
| Alphabet index | RN, inline in the screen component | `LibraryScreen.tsx:44-52` — matches the earlier "dumb components" finding |
| Scroll-to-top handling | RN, inline in the screen component | `LibraryScreen.tsx:54-59` — UI-only state, not domain data |
| Series count shown | RN, derived from `data.length` | `LibraryScreen.tsx:108` |
| BFF sync (downloaded/status badges) | Kotlin, triggered after each successful refresh | `useLibrary.ts:114` → `LibraryService.ts:7-9` → `LibraryModule.kt:64-69` → `BffFeature` |

### 4. Consumers

`LibraryScreen.tsx` (main), `useLibrary.ts` (central hook — fetch/sort/filter/follow/BFF sync),
`LibraryService.ts` (thin bridge delegation), `LibraryTransform.ts` (pure formatting helpers),
`SeriesCard.tsx`/`SeriesListItem.tsx` (dumb components consuming ready `SeriesSummary`),
`shared/bridge/library.ts` (types + `LibraryBridge` native interface).

**`FollowingScreen.tsx` already exists today** (not just planned in the backlog) — reuses the
entire `LibraryScreen` component, passing `filter={s => s.isFollowed}` and `prefsKey="following"`.
No dedicated hook/service; it's 100% the same Library pipeline with a client-side filter on top
of the same data. Registered in `routes.ts`.

No other screen (Search, Config, Reader, SeriesDetail) consumes `LibraryBridge`/`listSeries()`
directly.

### 5. Real "library" concept (multiple Kavita libraries) — does not exist in the app

Confirmed via the real Kavita API (`kavita-api` skill): Kavita has a genuine **Library** domain
— 23 endpoints (`GET /api/Library/libraries`, `GET /api/Library/user-libraries`, etc.), a rich
`LibraryDto` (`id`, `name`, `type: LibraryType`, `lastScanned`, `coverImage`, watched folders,
scan settings, `metadataProvider`, etc.). Real `LibraryType` enum (6 values, confirmed against
`openapi.json`): `Manga`, `Comic` (Flexible), `Book`, `Image`, `LightNovel`, `ComicVine`.

**None of this exists in our app.** Exhaustive search for `libraryId`, `libraryName`,
`LibraryDto`, `LibraryType`, `activeLibrary`/`selectedLibrary`, `user-libraries`, `api/Library`
across `android/` and `frontend/src/` returned zero production-code hits. `listSeries()` calls
`POST /api/Series/all-v2` with an empty filter (`"id":0`) — returns series across **all**
libraries on the server indistinctly, no `libraryId` parameter used anywhere. No library
selector exists in any screen.

**Conclusion**: today "Library" in the app is **synonymous with "the full list of all series on
the server"** (with a client-side "followed" filter for `FollowingScreen`), not a model of
Kavita's real multi-library concept.

### 6. `libraryId`/`libraryName` on `SeriesSummary`/`SeriesDetail`

Neither `SeriesSummary` (`KavitaSeriesFeature.kt:23-39` / `frontend/src/shared/bridge/library.ts:6-23`)
nor `SeriesDetail` (`KavitaSeriesFeature.kt:41-45`) has a `libraryId`/`libraryName` field. No
screen filters or switches by library anywhere in the codebase.

No contract shape proposed here — this inventory is the input for Task 011 (Library contract
modeling).
