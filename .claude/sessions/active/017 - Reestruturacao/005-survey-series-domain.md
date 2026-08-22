# Task 005 — Survey: Series domain (Phase 1 — Survey)

**Status:** done

## Objective

**Survey only — do not propose a contract in this task.** Catalogue what exists today for the
Series domain.

## Steps

1. List every field associated with "series" today across Kotlin (`KavitaSeriesFeature`, Room
   entities) and RN (`SeriesDetailScreen.tsx`, `useSeriesDetail.ts`, `SeriesBridge`).
2. List every operation — list series, fetch series detail, compute series-level progress
   aggregate (`readCount`/`progressFraction`).
3. Record the 3 places `readCount`/`progressFraction` are currently (re)computed, with
   file:line, and note any difference in the formula/result between them (known finding from
   the original audit — this survey formalizes it with exact locations, does not fix it).
4. Record that `KavitaSeriesFeature.listSeries()` reads `chapterCacheDao` directly instead of
   delegating to the Chapter layer (known finding — exact call sites for Task 024 to use).
5. List every consumer of series data (Library screen, Series Detail screen, any others).
6. Write findings as a plain inventory — no proposed contract shape, no fix.

## Completion criteria

- Inventory of fields, operations, and consumers for the Series domain is complete, including
  exact file:line locations for the 3 duplicated progress-aggregate computations and the direct
  `chapterCacheDao` read.
- No contract shape proposed (that is Task 010), no fix applied (that is Task 024).

## Findings

Full inventory (fields, operations, consumers, per-file findings) gathered via Explore agent —
mirrors the format of Task 003/004's surveys. Key points, cross-checked against Kavita's real
`SeriesDto`/`SeriesMetadataDto` schemas (via the `kavita-api` skill, `references/schemas.md`):

### Confirmed against real Kavita schema

`SeriesDto` (real, `GET /api/Series/{id}` and `POST /api/Series/all-v2`) has **no**
`readChapters`/`chapterCount`/`readStatus`/`progressFraction` fields — only `pages`/`pagesRead`
(page-granularity), plus a large set of metadata fields (`name`, `originalName`,
`localizedName`, `sortName`, `format: MangaFormat`, `libraryId`, `coverImage`, provider ids,
etc.) our `SeriesDto`/`SeriesDetailDto` (private, `KavitaSeriesFeature.kt`) don't map at all.
`SeriesMetadataDto` (real, `GET /api/Series/metadata`) is much richer than our mapped
`summary`/`genres`/`tags` — also has `writers`/`coverArtists`/`publishers`/`characters`/etc.
(same `PersonDto` shape seen inside `ChapterDto` during the Chapter survey), `ageRating`,
`releaseYear`, `language`, `publicationStatus`, and per-field `*Locked` flags. Confirms: **every**
chapter-count-based progress aggregate in this app (`readChapters`, `chapterCount`,
`progressFraction` when derived from chapter counts) is 100% our own computation — Kavita never
provides it pre-aggregated at any granularity beyond raw page counts.

### 1. Fields — summary (full detail in the agent's report, condensed here)

- Two unrelated, non-shared shapes for "a series" today: `SeriesDetail` (`id: string`, `name`,
  `coverImageUrl` — from `GET /api/Series/{id}`) vs. `SeriesSummary` (`id: number`, `name`,
  `coverUrl`, plus ~13 more fields including progress/BFF/follow data — from
  `POST /api/Series/all-v2`). Different id *types* (`string` vs `number`), different field
  names for the same concept (`coverImageUrl` vs `coverUrl`), no shared type, no conversion
  helper — each screen assumes its own shape.
- `SeriesMetadata` (`summary`, `genres: string[]`, `tags: string[]`) is a third, separate type,
  backed by its own endpoint and its own Room columns (`genresJson`/`tagsJson`, serialized) —
  `id`/`title` discarded from `GenreDto`/`TagDto` server responses, only `.title` kept.
- `SeriesDetailCacheEntity` (Room) merges `SeriesDetail` + `SeriesMetadata` fields into one
  table row; `SeriesSummary` is never persisted to Room at all — only an in-memory cache with a
  2-minute TTL (`LibraryModule.kt:33-46`), lost on process restart.
- `series_sort_prefs` (Room) and `ChapterSortPrefs` (TS) are named "series" but hold 100%
  chapter-sort-related fields (`chapterSortMode`/`chapterSortFixedThreshold`/
  `chapterSortProgressPercent`) — same ambiguous-naming pattern already found in Chapter's
  survey.

### 2. Operations — summary

List series (Library, cached in-memory only), get series detail (network+Room cache), get
cached series detail, get series metadata (network+Room cache), get cached series metadata,
follow/unfollow (duplicated as two separate `@ReactMethod`s in `SeriesModule` and
`LibraryModule`, same underlying DAO), check-is-followed, observe followed-ids (event), global
chapter-sort prefs, per-series chapter-sort override, compute "continue reading" chapter
(`computeContinueChapter`), action-button label derivation, splash-time background sync,
BFF external sync.

### 3. Finding — `readCount`/`progressFraction` computed independently in (at least) 5 places

Extends Task 004's Chapter-domain finding (§5.1, 3 Kotlin implementations) with 2 more,
TS-side, specific to Series:

| # | Location | Formula | Trigger |
|---|---|---|---|
| 1 | `KavitaSeriesFeature.kt:241-252` `resolveProgress()` | chapter-cache-based if available, else falls back to page-based (`pagesRead/pages`) — the only one of the 5 with a fallback | `listSeries()` |
| 2 | `SeriesModule.kt:161-173` `emitProgressChanged()` | chapter-cache-based, no fallback — silently emits nothing if `chapter_cache` is empty for that series | `markChaptersRead`/`Unread` |
| 3 | `ReaderChapterModule.kt:127-139` `emitProgressChanged()` | byte-for-byte identical to #2 | `saveReadingProgress` (Room-only, no network) |
| 4 | `useLibrary.ts:70-78` reducer | re-derives `readStatus` (not `progressFraction`) from the event's own `readChapters`/`chapterCount`, independently of Kotlin's `deriveReadStatus` | on `seriesProgressChanged` event |
| 5 | `SeriesDetailScreen.tsx:198` and `SeriesDetailHeader.tsx:24` | identical `chapters.filter(c => c.readStatus === 'READ').length` expression, computed independently in each of two sibling files | every render |

Combined with Chapter's own `readStatus` formula (Task 004 §5.2) and Series' `deriveReadStatus`
(page-based, `KavitaSeriesFeature.kt:235-239`), that's **5 independent formulas** of the same
general shape (`<=0→UNREAD`, `>=total→READ`, else `IN_PROGRESS`) applied across different
granularities (page vs. chapter, per-chapter vs. per-series) with zero shared code.

### 4. Finding — `KavitaSeriesFeature.listSeries()` reads `chapterCacheDao` directly

Exact call sites, all inside `KavitaSeriesFeature.kt`:
- `kt:58` — `chapterCacheDao: ChapterCacheDao` injected into the Series-domain feature's
  constructor.
- `kt:112` — inside `listSeries()`, for **every** series returned by the API, a synchronous read
  to `chapter_cache` (owned by the Chapter domain), in a loop — N series → N un-batched queries.
- `kt:119` — `resolveProgress(localChapters, ...)` consumes that read.
- `kt:125-126` — `readChapters`/`chapterCount` also derived straight from `localChapters`,
  bypassing `KavitaChapterFeature`/`ChapterDataSource` entirely (no delegation to the Chapter
  domain's own methods, e.g. `listChaptersForSeries`).

For context (not the same finding, but related): `SeriesModule.kt`/`ReaderChapterModule.kt`
(app-layer RPC bridges, not domain features) also read `chapterCacheDao` directly from 5+
call sites — expected for thin bridge modules, but reinforces how widely this table is touched
outside the Chapter domain's own feature.

### 5. Other inconsistencies found

- `toggleFollow` duplicated as two separate `@ReactMethod`s (`SeriesModule.kt:176-180`,
  `LibraryModule.kt:57-62`) — identical one-line body (`followedSeriesDao.toggle`), exposed
  twice on the bridge surface. `isSeriesFollowed` only exists on `SeriesModule`; `LibraryModule`
  resolves `isFollowed` via a different path (`getAllIds()` + `Set.contains`).
- `id` type inconsistency: `SeriesSummary.id: Int`/`number` vs. `SeriesDetail.id: String`/
  `string`, while every Room table (`chapter_cache`, `followed_series`, `series_sort_prefs`,
  `series_detail_cache`, `bff_match`) stores `seriesId` as `String` — conversion happens
  ad-hoc at multiple call sites (`dto.id.toString()`, `s.id.toString()`), no shared helper.
- `GenreDto.id`/`TagDto.id` deserialized and discarded — same dead-field pattern as Chapter's
  `createdUtc` finding (Task 004 §5.5).
- Two unrelated cache-freshness policies for the same general concept ("is this series data
  stale?"): `series_detail_cache` (Room, never expires on its own) vs. `LibraryModule.lastSeries`
  (in-memory, 2-minute TTL) — no relationship between the two, covering different fields of what
  a user would consider "the same series."
- `SplashSyncCoordinator.kt:53-57` manipulates `chapterCacheDao.deleteBySeriesId`/`insertAll`
  directly (two non-transactional calls) instead of reusing `chapterCacheDao.replaceForSeries`
  (already exists, transactional, used elsewhere for the same effect in `SeriesModule.kt:129`).

No contract shape proposed here — this inventory is the input for Task 010 (Series contract
modeling).
