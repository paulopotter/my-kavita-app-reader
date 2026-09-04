# Task 004 — Survey: Chapter domain (Phase 1 — Survey)

**Status:** done

## Objective

**Survey only — do not propose a contract in this task.** Catalogue what exists today for the
Chapter domain. This is the most advanced domain in terms of existing structure (via the
Reader's `ChapterDataSource`/`ViewerChapters`), which is why the contract-modeling pilot
(Task 008) starts here.

## Steps

1. List every field associated with "chapter" today across Kotlin (`ChapterDataSource`,
   `KavitaChapterFeature`, `chapterCacheDao`/Room entities) and RN (`ViewerChapters`, hook
   state in `useReader.ts`, `SeriesBridge`'s own chapter modeling for the Series screen).
2. List every operation — fetch single chapter, fetch neighbor, fetch page list, mark read,
   save/read progress (local + remote), emit progress-changed event.
3. List every consumer — Reader screen/hook, Series screen (which has its *own* chapter
   modeling via `SeriesBridge`, unrelated to `ViewerChapters` — flag this divergence explicitly,
   it is a known "no single contract" finding from the original audit).
4. Note the duplicated `emitProgressChanged` implementations (`SeriesModule.kt` vs.
   `ReaderChapterModule.kt`) as a data point for this survey (the actual fix is Task 025) —
   record where each one lives and what triggers it.
5. Write findings as a plain inventory — no proposed contract shape.

## Completion criteria

- Inventory of fields, operations, and consumers for the Chapter domain is complete, including
  the `ViewerChapters` vs. `SeriesBridge` divergence and the duplicated `emitProgressChanged`.
- No contract shape proposed (that is Task 008).

## Findings

### 1. Fields associated with "chapter" today

**Kotlin — network DTOs**

| Location | Fields | Note |
|---|---|---|
| `KavitaChapterFeature.kt:40-48` `ChapterDto` (private, `/api/Series/volumes` response) | `id: Int`, `number: String`, `title: String`, `pages: Int`, `pagesRead: Int`, `sortOrder: Double`, `createdUtc: String?` | `createdUtc` is read but **never used** anywhere (never reaches `ChapterCacheEntity`) |
| `KavitaChapterFeature.kt:50-54` `VolumeDto` | `id: Int`, `chapters: List<ChapterDto>` | Volume gets flattened (`flatMap`) — volume `id` is discarded, never reaches `ChapterCacheEntity` |
| `KavitaChapterFeature.kt:56-59` `ProgressDto` | `pageNum: Int` | from `/api/Reader/get-progress` |
| `KavitaChapterFeature.kt:26` `LocalProgress` (public) | `page: Int`, `scrollFraction: Float` | |

**Kotlin — Room cache**

| Location | Fields |
|---|---|
| `android/core/.../ChapterCacheEntity.kt:6-17` (`@Entity chapter_cache`) | `id: String` (PK), `seriesId: String`, `title: String`, `number: String`, `pageCount: Int`, `sortOrder: Double`, `readStatus: String` (free string, not a Kotlin enum — `"READ"/"IN_PROGRESS"/"UNREAD"` only by convention), `pagesRead: Int`, `updatedAtLocalMs: Long?` |
| `android/core/.../ReadingProgressEntity.kt:6-13` (`@Entity reading_progress`) | `chapterId: String` (PK), `seriesId: String`, `page: Int`, `updatedAtLocalMs: Long`, `scrollFraction: Float = 0f` |

`ChapterCacheEntity` and `ReadingProgressEntity` are two **distinct** Room tables, no FK between
them, both indexed by `chapterId`/`id` as string, manually kept in sync at several call sites.

**Kotlin — bridge shapes crossing to RN**

| Location | Method | Fields |
|---|---|---|
| `SeriesModule.kt:280-294` `toWritableArray()` | `getChapters`/`getCachedChapters` | 1:1 mirror of `ChapterCacheEntity` |
| `SeriesModule.kt:108-132` `replaceCachedChapters` | (RN→Kotlin direction) | same shape, with defaults (`?: ""`, `?: 0`, `?: "UNREAD"`) if a key is missing |
| `SeriesModule.kt:161-173` / `ReaderChapterModule.kt:127-139` `seriesProgressChanged` event payload | `seriesId`, `progressFraction`, `readChapters`, `chapterCount` | **byte-for-byte duplicated** — see Finding 4.2 |
| `ReaderChapterModule.kt:90-102` `getLocalProgress` | `page`, `scrollFraction` | mirrors `LocalProgress` |
| `SeriesModule.kt:190-201` / `222-235` sort prefs | `mode`, `fixedThreshold?`, `progressPercent` | not per-chapter, but affects chapter list ordering |

**TS — bridge types**

| Location | Type | Fields |
|---|---|---|
| `frontend/src/shared/bridge/series.ts:17-27` `Chapter` | `id`, `seriesId`, `title`, `number: string`, `pageCount`, `sortOrder`, `readStatus: ChapterReadStatus`, `pagesRead`, `updatedAtLocalMs: number \| null` |
| `frontend/src/shared/bridge/series.ts:15` `ChapterReadStatus` | `'UNREAD' \| 'IN_PROGRESS' \| 'READ'` |
| `frontend/src/shared/bridge/chapter.ts:3` | `export type { Chapter, ChapterReadStatus } from './series'` — **re-export**, not a redefinition |
| `frontend/src/shared/bridge/series.ts:69-74` `SeriesProgressChangedEvent` | `seriesId`, `progressFraction`, `readChapters`, `chapterCount` |

**TS — transforms**

| Location | Type |
|---|---|
| `frontend/src/shared/transforms/page.ts:7-16` `ChapterWithPages` | `{ chapter: Chapter; pages: string[]; pageAspectRatios?: (number \| null)[] }` — **envelopes** `Chapter`, does not redefine its fields |
| `frontend/src/shared/transforms/page.ts:18-22` `ViewerChapters` | `{ prev: ChapterWithPages \| null; curr: ChapterWithPages; next: ChapterWithPages \| null }` |

**Important correction to the original premise**: `ViewerChapters`/`ChapterWithPages` import and
reuse the exact same `Chapter` type from `bridge/series.ts` that `useSeriesDetail.ts` uses.
There is no second, divergent `Chapter` field-shape in TS today — see Finding 4.1 for where the
real divergence actually is.

**TS — hook state**

| Location | Field | Note |
|---|---|---|
| `useReader.ts:56` `State.chapterFraction: number` | exclusive to the Reader, not persisted, doesn't exist on `Chapter` or `SeriesSummary` — continuous in-page-scroll fraction |
| `useSeriesDetail.ts:311-318` `applyOptimisticReadStatus` | builds a partial local `Chapter` — same pattern as `updateChapterReadStatusInViewer` (`useReader.ts:78-99`), implemented separately |
| `frontend/src/shared/bridge/library.ts` `SeriesSummary` | `readChapters?`, `chapterCount?`, `progressFraction` — series-level aggregates fed by the same `chapter_cache` data |

### 2. Operations on chapter data

| Operation | Kotlin | TS | Network? |
|---|---|---|---|
| List chapters for a series (network) | `KavitaChapterFeature.listChaptersForSeries` (`GET /api/Series/volumes`) | `SeriesModule.getChapters`, `SeriesDetailService.fetchChapters` | yes |
| List cached chapters | `chapterCacheDao.getBySeriesId` | `SeriesModule.getCachedChapters`, `SeriesDetailService.fetchCachedChapters` | no |
| Replace cached chapters | `chapterCacheDao.replaceForSeries` (delete+insert, transactional) | `SeriesModule.replaceCachedChapters`, called from `useSeriesDetail.ts:233,325,336` | no |
| Mark chapter(s) read | `KavitaChapterFeature.markChaptersRead` (`POST /api/Reader/mark-multiple-read`) | `SeriesModule.markChaptersRead`, `useSeriesDetail.ts:320-329`, also via `ReaderService.markChapterRead` | **yes** |
| Mark chapter(s) unread | `KavitaChapterFeature.markChaptersUnread` (`POST /api/Reader/mark-multiple-unread`) | `SeriesModule.markChaptersUnread`, `useSeriesDetail.ts:331-340`, `ReaderService.markChapterUnread` | **yes** |
| "Save reading progress" (called every 20s / continuous reading) | `ChapterDataSource.saveReadingProgress` (`KavitaChapterFeature.kt:110-127`) | `ReaderChapterModule.kt:112-119`, `ReaderService.ts:45-47` | **no network call** — only writes `ReadingProgressEntity` + `chapterCacheDao.updateReadStatus`. Confirms Task 003's finding (§5.2 step 19) at the chapter-mark level too |
| Save/read local progress (Room) | `ChapterDataSource.saveLocalProgress/getLocalProgress` | `ReaderChapterModule.kt:90-110` | no |
| Get server read progress | `ChapterDataSource.getServerReadProgress` (`GET /api/Reader/get-progress`) | `ReaderChapterModule.kt:83-88` | yes |
| Emit "progress changed" | `SeriesModule.emitProgressChanged` (from `markChaptersRead/Unread`); `ReaderChapterModule.emitProgressChanged` (from `saveReadingProgress`) | `SeriesProgressChangedEmitter`, consumed by `useLibrary.ts:137-143` | no (local RN event) |
| Sort chapters (client-side) | — | `sortChapters`/`chapterNumberComparator` (`transforms/chapter.ts:18-57`) | no |
| Chapter display title | — | `chapterDisplayTitle` (`transforms/chapter.ts:7-16`) | no |
| "Effectively read" (98% threshold) | — | `isChapterEffectivelyRead` (`transforms/chapter.ts:59-63`) | no |
| Resolve initial page on chapter open | — | `resolveInitialPage` (`transforms/chapter.ts:65-74`), called from `useReader.ts:409` | no |
| Unmark on reread | via `markChaptersUnread` | `shouldUnmarkOnReread` (`transforms/chapter.ts:76-84`), `useReader.ts:227-244` | yes (via markChaptersUnread) |
| Continue-reading chapter resolution | — | `computeContinueChapter` (`shared/transforms/series.ts:6-26`) | no |
| Sort preferences (global/per-series) | `SeriesModule.kt:190-260` | `SeriesDetailService.ts:54-81` | no |

### 3. Consumers

| Consumer | How |
|---|---|
| `useReader.ts` | RPC via `ReaderChapterBridge`/`SeriesBridge`; in-memory `ViewerChapters` state; writes Room via `saveLocalProgress`/`saveReadingProgress` |
| `ReaderScreen.tsx` + `ReaderPageListView.tsx` | consume `Chapter` fields inside `ChapterWithPages` |
| `useSeriesDetail.ts` | RPC via `SeriesBridge`; in-memory flat `Chapter[]`; writes Room via `replaceCachedChapters` |
| `SeriesDetailScreen.tsx`, `ChapterListItem.tsx`, `SeriesDetailHeader.tsx` | consume `Chapter[]`/`continueChapter` as props |
| `useLibrary.ts`, `SeriesCard.tsx`, `SeriesListItem.tsx` | consume `SeriesSummary` aggregates, not individual `Chapter`; listen to `SeriesProgressChangedEmitter` |
| `SeriesModule.kt` | RPC + direct `ChapterCacheDao`/`KavitaChapterFeature` access; emits `seriesProgressChanged` |
| `ReaderChapterModule.kt` | RPC + direct `ChapterDataSource`/`ChapterCacheDao` access; emits the same `seriesProgressChanged` |
| `LibraryModule.kt` / `KavitaSeriesFeature.kt` | indirect consumer — `KavitaSeriesFeature.resolveProgress` reads `ChapterCacheDao.getBySeriesId` to aggregate `SeriesSummary` fields |

### 4. The two known divergences, detailed

**4.1 — `ViewerChapters` (Reader) vs. `SeriesBridge` chapter modeling (Series)**

Correction to the original premise, with evidence: there are **no two divergent field shapes**
— `ChapterWithPages`/`ViewerChapters` import and use the exact same `Chapter` type as
`useSeriesDetail.ts` (confirmed via grep — the only `interface Chapter` in the codebase is
`series.ts:17`). The real divergence is structural, one level up:

| Aspect | Reader | Series |
|---|---|---|
| Chapter type used | `Chapter` (identical) | `Chapter` (identical) |
| State shape | `ViewerChapters{prev,curr,next}`, each slot a `ChapterWithPages` envelope with `pages`/`pageAspectRatios` | flat `Chapter[]`, no envelope, no page data |
| Data origin | 3 chapters at a time via `loadNeighbor`/`loadInitialViewer`, each fetching pages+aspect ratios too | full series list at once (`fetchChapters`/`fetchCachedChapters`), never fetches pages |
| Extra field outside `Chapter` | `chapterFraction: number` in Reader's `State` — not persisted, not on `Chapter`/`SeriesSummary` | none — only derived state is `continueChapter: Chapter \| null` |
| Optimistic read-status update | `updateChapterReadStatusInViewer` (`useReader.ts:78-99`) — manual prev/curr/next traversal | `applyOptimisticReadStatus` (`useSeriesDetail.ts:311-318`) — flat `.map` |
| "Ordered chapter list" source | `orderedChaptersRef`, from `getCachedChapters` + local `chapterNumberComparator` — **never** hits network | `state.chapters`, from cache-first **and** network with `updatedAtLocalMs` merge (`syncChapters`, `useSeriesDetail.ts:220-246`) |

The real divergence is agregation/state policy, not `Chapter`'s fields — the Reader never
fetches the full chapter list from network (cache-only) and always envelopes each chapter with
page data; Series always fetches the full list (cache+network merge) and never fetches any page
data. No shared sort/merge logic between the two hooks — each implements its own "which copy of
a chapter is freshest" policy independently.

**4.2 — Duplicated `emitProgressChanged`**

Byte-for-byte identical code in both files (`SeriesModule.kt:161-173`,
`ReaderChapterModule.kt:127-139`): reads `chapterCacheDao.getBySeriesId(seriesId)`, computes
`readCount = chapters.count{readStatus=="READ"}`, `progressFraction = readCount/size`, emits
`seriesProgressChanged` with `{seriesId, progressFraction, readChapters, chapterCount}`.

- `SeriesModule`'s copy is called from `markChaptersRead`/`markChaptersUnread` (after a real
  network call succeeds).
- `ReaderChapterModule`'s copy is called from `saveReadingProgress` (which makes **no** network
  call — Room-only, per Finding 2 above).
- Both use the same `EVENT_PROGRESS_CHANGED` constant, redeclared independently in each file.
- The calculation itself is identical — no scenario found where the two *emitters* disagree
  with each other for the same DB state, since the formula was copied exactly.
- Where the result **can** diverge from what's observable elsewhere is against a *third*
  implementation — see Finding 5.1.

### 5. Other inconsistencies found

**5.1 — Third implementation of readChapters/chapterCount/progressFraction:
`KavitaSeriesFeature.resolveProgress`**

```kotlin
// KavitaSeriesFeature.kt:241-252
private fun resolveProgress(localChapters: List<ChapterCacheEntity>, pagesRead: Int, pages: Int): Float {
    if (localChapters.isNotEmpty()) {
        val readCount = localChapters.count { it.readStatus == "READ" }
        return readCount.toFloat() / localChapters.size
    }
    if (pages <= 0) return 0f
    return (pagesRead.toFloat() / pages).coerceIn(0f, 1f)
}
```

Used by `listSeries()` to build `SeriesSummary.progressFraction/readChapters/chapterCount`,
consumed by `LibraryModule.kt` and exposed to TS as `SeriesSummary`. A comment in
`SeriesModule.kt:157-158` claims this reuses `resolveProgress`'s logic — inaccurate: the
"cache not empty" branch's formula is replicated, not reused via a shared function; only the
fallback (`pagesRead/pages` when `localChapters` is empty) has no equivalent in
`emitProgressChanged` (which returns early with no event at all when chapters are empty).

**Scenario where the result actually diverges**: if `chapter_cache` is empty for a series (user
never opened `SeriesDetailScreen` to populate it, only visited the Library),
`KavitaSeriesFeature.resolveProgress` falls back to server-side `pagesRead/pages` (page
granularity, not chapter). If in that same window `markChaptersRead`/`saveReadingProgress` ran
(would require cached chapters, so only plausible mid-populate race), `emitProgressChanged`
emits nothing at all — Library gets no event update until the next full `listSeries()` fetch.

**5.2 — `readStatus` derived three different ways, with non-identical formulas**

| Location | Formula |
|---|---|
| `KavitaChapterFeature.kt:101` (first populating `chapter_cache` from `/api/Series/volumes`) | per-**chapter**, using server `pagesRead`/`pages` |
| `KavitaSeriesFeature.kt:235-239` `deriveReadStatus` | per-**series**, using server-aggregated `dto.pagesRead`/`dto.pages` (distinct field from `readChapters`/`chapterCount`) |
| `useLibrary.ts:72` (in the `seriesProgressChanged` listener) | per-**series**, using chapter **counts** (not pages), reimplemented in TS |

Same shape (`<=0→UNREAD`, `>=total→READ`, else `IN_PROGRESS`) applied to three different
granularities/sources, none sharing code with the others.

**5.3 — `chapter_cache.readStatus` is a free `String` in Kotlin, a closed union in TS**

`ChapterCacheEntity.readStatus: String` has no enum validation on the Kotlin side —
`replaceCachedChapters` accepts `map.getString("readStatus") ?: "UNREAD"` without validating
against the 3 expected values (`SeriesModule.kt:120`). TS assumes `ChapterReadStatus` is a
closed union as if guaranteed by the type, but nothing prevents Kotlin from writing/returning a
fourth value.

**5.4 — `Chapter.number` is a `string`, parsed as `float` independently in multiple places**

`chapterNumberComparator` and `sortChapters`'s `AUTO_FIXED` mode both independently
`parseFloat(c.number)`. Kotlin never parses `number` — it's treated as an opaque string;
real ordering comes from either server-provided `sortOrder: Double` or client-side
`chapterNumberComparator`, depending which fetch path was used — two ordering criteria coexist
with neither documented as the canonical source of truth.

**5.5 — `createdUtc` read from the server but discarded**

`ChapterDto.createdUtc: String?` is deserialized but never propagated to `ChapterCacheEntity` or
any public DTO — dead field.

**5.6 — Two independent "build a chapter from raw data" paths, no shared function**

`KavitaChapterFeature.listChaptersForSeries` (network DTO → `ChapterCacheEntity`, preserves
existing local `readStatus`/`pagesRead` when present) and `SeriesModule.replaceCachedChapters`
(TS `ReadableArray` → `ChapterCacheEntity`, accepts whatever TS sends after its own merge/sort
in `syncChapters`) are two parallel write paths to the same `chapter_cache` table, with
different merge rules — neither documented as canonical, both used in production.
