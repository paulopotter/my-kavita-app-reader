# Task 003 — Survey: Page domain (Phase 1 — Survey)

**Status:** done

## Objective

**Survey only — do not propose a contract in this task.** Catalogue what exists today for the
Page domain (the smallest unit — today it only exists inside the Reader) so the modeling
conversation in Task 009 has real ground to stand on.

## Scope

Page is the finest-grained domain: an individual manga page inside a chapter (image, dimensions,
aspect ratio, read/scroll position within it). Today it has no standalone contract — it only
exists as data embedded inside Reader-specific structures (`ViewerChapters`, page blocks).

## Steps

1. List every field currently associated with a "page" across Kotlin and RN — e.g. page index,
   image URL, width/height/aspect ratio, decode/cache state, scroll fraction within page.
2. List every operation performed on page data — fetch, prefetch/preload window, dimension
   lookup, aspect-ratio lookup, cache read/write.
3. List every consumer (RN hooks/components, Kotlin modules/features) that reads or writes page
   data, and how (direct call, event, bridge RPC, Room, in-memory).
4. Note any inconsistency already visible (e.g. same page property computed in more than one
   place, or with slightly different names/types between Kotlin and TS).
5. Write findings as a plain inventory (tables are fine) — no proposed contract shape, no
   recommendation. That is explicitly out of scope for this task.

## Completion criteria

- Inventory of fields, operations, and consumers for the Page domain is complete and reviewed.
- No contract shape proposed (that is Task 009).

## Findings

### 1. Fields associated with "page" today

**TS side**

| Field | Type | Where | File:line |
|---|---|---|---|
| `pages` | `string[]` (URLs) | `ChapterWithPages.pages` | `frontend/src/shared/transforms/page.ts:9` |
| `pageAspectRatios` | `(number \| null)[]` | `ChapterWithPages.pageAspectRatios` | `frontend/src/shared/transforms/page.ts:15` |
| `pageUrls` | `string[]` | `ReaderChapterBlock.pageUrls` (native prop) | `frontend/src/screens/reader/components/ReaderPageListView.tsx:7` |
| `pageAspectRatios` | `number[]` — `0` = unavailable (already normalized, not `null`) | `ReaderChapterBlock.pageAspectRatios` | `frontend/src/screens/reader/components/ReaderPageListView.tsx:10` |
| `pageIndex` | `number` | `VisiblePageChangedEvent.pageIndex` | `frontend/src/screens/reader/components/ReaderPageListView.tsx:20` |
| `pageFraction` | `number` (0–1) | `VisiblePageChangedEvent.pageFraction` | `frontend/src/screens/reader/components/ReaderPageListView.tsx:21` |
| `chapterFraction` | `number` (0–1) — chapter-level, emitted alongside page fields | `VisiblePageChangedEvent.chapterFraction` | `frontend/src/screens/reader/components/ReaderPageListView.tsx:22` |
| `scrollToPageIndex` | `number` (one-shot request) | native prop | `frontend/src/screens/reader/components/ReaderPageListView.tsx:30` |
| `page` | `number` | `LocalProgress.page` | `frontend/src/shared/bridge/chapter.ts:6` |
| `scrollFraction` | `number` | `LocalProgress.scrollFraction` | `frontend/src/shared/bridge/chapter.ts:7` |
| `pageNumber` | `number` | `PageDimension.pageNumber` | `frontend/src/shared/bridge/chapter.ts:11` |
| `width` / `height` | `number` (px) | `PageDimension` | `frontend/src/shared/bridge/chapter.ts:12-13` |
| `pageIndex` / `url` | `number` / `string` | `PageCacheEntry` | `frontend/src/shared/bridge/page.ts:4-5` |
| `pageCount` / `pagesRead` | `number` — Chapter-level totals, universal denominator for page math | `Chapter` | `frontend/src/shared/bridge/series.ts:22,25` |
| `currentVisiblePage` / `scrollToPageRequest` / `scrollFraction` / `chapterFraction` | reducer state | `useReader` `State` | `frontend/src/screens/reader/useReader.ts:50-56` |

**Kotlin side**

| Field | Type | Where | File:line |
|---|---|---|---|
| `pageIndex` / `url` / `cachedAtEpochMs` | Room entity | `PageCacheEntity` | `android/core/.../PageCacheEntity.kt:8-10` |
| `pageNumber` / `width` / `height` | `Int` | `PageDimension` | `android/features/.../KavitaChapterFeature.kt:28` |
| `page` / `scrollFraction` | `Int` / `Float` | `LocalProgress` | `android/features/.../KavitaChapterFeature.kt:26` |
| `page` / `scrollFraction` (default 0f) | Room entity | `ReadingProgressEntity` | `android/core/.../ReadingProgressEntity.kt:10,12` |
| `pageUrls` / `pageAspectRatios` (0f = unavailable) | native bridge | `ChapterBlock` | `android/features/.../ReaderPageList.kt:64,70` |
| `pageIndexInChapter` / `url` / `aspectRatio` | Compose-internal UI state | `ListEntry.Page` | `android/features/.../ReaderPageList.kt:79-83` |
| `itemHeights: Map<String, Int>` (key `"page:$chapterId:$pageIndexInChapter"`) — measured or estimated | Compose local state | `ReaderPageList.kt:510` |
| `pageFraction` / `chapterFraction` (callback params) | `Float` | `onVisiblePageChanged` | `ReaderPageList.kt:488` |
| `pageCount` / `pagesRead` | Room entity | `ChapterCacheEntity` | `android/core/.../ChapterCacheEntity.kt:12,15` |
| `pages` / `pagesRead` (default 0) | network DTO, renamed to `pageCount` on persist | `ChapterDto` | `android/features/.../KavitaChapterFeature.kt:44-45` |
| `width` / `height` / `pageNumber` (default 0) | network DTO | `PageDimensionDto` | `android/features/.../KavitaChapterFeature.kt:62-66` |
| `pageDimensions: List<PageDimensionDto>` | network DTO | `ChapterInfoDto` | `android/features/.../KavitaChapterFeature.kt:70` |
| `retryCount` | per-URL local state | `SubcomposeAsyncImage` retry | `ReaderPageList.kt:833` |
| real decoded `originalWidth`/`originalHeight` | read from file, never persisted/exposed | `SafeBitmapDecoder.decodeNow` | `android/features/.../SafeBitmapDecoder.kt:74-75` |
| flat absolute page index (`allPageUrls`) | `Int` | `computePreloadWindow` | `android/features/.../PagePreloader.kt:69` |

### 2. Operations on page data

| Operation | Layer/function | File:line |
|---|---|---|
| Fetch page URLs for a chapter (Room cache-first) | `ChapterDataSource.getPageUrls` → `KavitaChapterFeature` | `android/features/.../KavitaChapterFeature.kt:129-142` |
| Invalidate page URL cache | `ChapterDataSource.invalidatePageCache` | `KavitaChapterFeature.kt:144-145` |
| Read page URL cache directly | `ChapterDataSource.getPageCacheUrls` | `KavitaChapterFeature.kt:147-148` |
| Fetch page dimensions (`chapter-info?includeDimensions=true`) | `ChapterDataSource.getPageDimensions` | `KavitaChapterFeature.kt:154-170` |
| Convert dimensions → aspect ratio (TS, fallback to `null`) | `fetchPageAspectRatios` | `frontend/src/screens/reader/ReaderService.ts:18-30` |
| Fetch page URLs (RPC, TS) | `fetchPageUrls` | `frontend/src/screens/reader/PageService.ts:3-5` |
| Invalidate page cache (RPC, TS) | `invalidatePageCache` | `frontend/src/screens/reader/PageService.ts:7-9` |
| Preload window order (TS, **no call site found** — see Finding 4) | `pagePreloadOrder` | `frontend/src/shared/transforms/page.ts:28-43` |
| Chapter-edge proximity check (TS, **no call site found** — see Finding 5) | `isNearChapterEdge` | `frontend/src/shared/transforms/page.ts:45-50` |
| Preload window build (Kotlin, actually used, radius=3) | `computePreloadWindow` | `android/features/.../PagePreloader.kt:69-75` |
| Preload window update (cancel/start jobs) | `PagePreloader.updateWindow` | `PagePreloader.kt:39-55` |
| Bitmap decode (tiling for JPEG/PNG/WebP, software AVIF) | `SafeBitmapDecoder.decodeNow/decodeAvif/decodeTiled` | `SafeBitmapDecoder.kt:68-208` |
| Serialize concurrent decode per URL | `PageDecodeCoordinator.withUrlLock` | `PageDecodeCoordinator.kt:27-28` |
| Estimate page height from aspect ratio (cascade: real → chapter avg → 2:3 generic) | `LaunchedEffect(entries, containerWidthPx)` | `ReaderPageList.kt:534-569` |
| Compute visible page + in-page scroll fraction (top-anchored) | `computeVisiblePageAndFraction` | `ReaderPageList.kt:389-462` |
| Compute "read to bottom" page (bottom-anchored, midline) | `computeBottomVisiblePageIndex` | `ReaderPageList.kt:150-187` |
| Compute chapter-switch trigger (25-50%/50-75% zones) | `computeChapterSwitchTarget` | `ReaderPageList.kt:211-276` |
| Compute continuous chapter fraction weighted by real page heights | `computeChapterFraction` | `ReaderPageList.kt:304-379` |
| Read/write page URL cache (Room) | `PageCacheDao.*` | `android/core/.../PageCacheDao.kt:11-27` |
| Read/write local progress (page + scrollFraction, Room) | `KavitaChapterFeature.getLocalProgress/saveLocalProgress` | `KavitaChapterFeature.kt:189-205` |
| Periodic local progress save (every 2s) | `saveLocalProgress` timer | `frontend/src/screens/reader/useReader.ts:262-264` |
| Server progress sync (page only, no fraction, every 20s) | `saveServerProgress` timer | `useReader.ts:266-274` |
| Resolve initial page on chapter open (local vs server vs zero) | `resolveInitialPage` | `frontend/src/shared/transforms/chapter.ts:65-74` |
| React to active-host change: re-fetch page URLs | `activeUrlChanged` listener | `useReader.ts:535-564` |

### 3. Consumers

| Consumer | Type | How | File:line |
|---|---|---|---|
| `useReader.ts` | RN hook | RPC fetch, builds `ChapterWithPages`, holds `currentVisiblePage`/`scrollFraction`/`chapterFraction` state, triggers save RPCs | `frontend/src/screens/reader/useReader.ts:322-343,394-399,262-274` |
| `ReaderScreen.tsx` | RN component | Builds `ReaderChapterBlock[]` from `ViewerChapters`; receives `onVisiblePageChanged` | `frontend/src/screens/reader/ReaderScreen.tsx:73-107,46-60` |
| `ReaderPageListView.tsx` | Native component wrapper | Declares prop/event shapes crossing the bridge, no own logic | `frontend/src/screens/reader/components/ReaderPageListView.tsx` |
| `ReaderSideProgressBar` | RN component | Receives `totalPages`/`currentPage`, page-select → `scrollToPage` | `ReaderScreen.tsx:138-147` |
| `ReaderThinProgressBar` | RN component | Receives `pageFraction = reader.scrollFraction` | `ReaderScreen.tsx:127-131` |
| `PageService.ts` / `ReaderService.ts` | RN service layer | RPC to `ReaderBridge`/`ReaderChapterBridge` | respective files |
| `ReaderChapterModule.kt` | RN bridge module | Exposes page RPCs, delegates to `ChapterDataSource` | `android/app/.../ReaderChapterModule.kt:34-119` |
| `KavitaChapterFeature.kt` | Kotlin feature (impl of `ChapterDataSource`) | Room + Kavita network endpoints | `KavitaChapterFeature.kt:129-205` |
| `ReaderPageListView.kt` | Native Android View | Receives blocks/scroll requests via setters, emits events via `RCTEventEmitter` | `android/app/.../ReaderPageListView.kt:41-90` |
| `ReaderPageListViewManager.kt` | RN ViewManager | Manual `ReadableMap`/`ReadableArray` parsing into `ChapterBlock` | `android/app/.../ReaderPageListViewManager.kt:43-65` |
| `ReaderPageList.kt` | Compose UI | In-memory state, computes fraction/visible page, invokes preloader, emits event | `ReaderPageList.kt:472-825` |
| `PagePreloader.kt` | Kotlin | Reads in-memory URL array, manages Coil preload jobs | `PagePreloader.kt:39-55` |
| `PageDecodeCoordinator.kt` | Kotlin | Per-URL decode mutex | `PageDecodeCoordinator.kt:27-28` |
| `SafeBitmapDecoder.kt` | Coil decoder | Reads real file dimensions, never persists/exposes them | `SafeBitmapDecoder.kt:68-108` |
| `PageCacheDao`/`PageCacheEntity` (Room) | Persistence | Table `page_cache`, only stores `url`+`cachedAtEpochMs` | `android/core/.../PageCacheDao.kt`, `PageCacheEntity.kt` |
| `ReadingProgressEntity`/`ReadingProgressDao` (Room) | Persistence | Table `reading_progress`, stores `page`+`scrollFraction` only | `android/core/.../ReadingProgressEntity.kt` |
| `chapter.ts` transform | Pure TS | Uses Chapter-level `pageCount`/`pagesRead`, not individual Page | `frontend/src/shared/transforms/chapter.ts:59-84` |

### 4. Visible inconsistencies

1. **`pageAspectRatios` changes type/absence-semantics crossing RN→Kotlin.** TS uses `(number | null)[]`
   (`page.ts:15`); `ReaderScreen.tsx:85` converts to `number[]` with `ratio ?? 0`; Kotlin then treats
   `<= 0f` as unavailable (`ReaderPageList.kt:70`). Two different representations of "no data"
   (`null` vs `0`) documented independently in 4 places.
2. **Aspect-ratio computation duplicated** — TS `fetchPageAspectRatios` (`ReaderService.ts:25`, no
   fallback) vs. Kotlin's own cascade fallback (real → chapter avg → 2:3 generic,
   `ReaderPageList.kt:536-566`). Two independent implementations that coincide by intent, not by
   shared code.
3. **`pageIndex` vs `pageNumber`** — same concept, different names depending on origin (Kavita DTO
   uses `pageNumber`; internal domain structures use `pageIndex`). No indication in code of
   0-based vs 1-based convention for either.
4. **`pagePreloadOrder` (TS, `page.ts:28-43`) appears unused** — no call site found in
   `useReader.ts`/`ReaderScreen.tsx`/`ReaderPageListView.tsx`. Real preload logic is entirely
   Kotlin (`computePreloadWindow`, `PagePreloader.kt:69-75`, radius=3 constant,
   `PagePreloader.kt:14`), keyed off the flat absolute index in `allPageUrls`
   (`ReaderPageList.kt:502,785`), not the per-chapter page index `pagePreloadOrder` expects.
   Possibly dead/vestigial code.
5. **`isNearChapterEdge` (TS, `page.ts:45-50`) also appears unused** — same situation as #4. Real
   chapter-switch decision is `computeChapterSwitchTarget` (Kotlin, `ReaderPageList.kt:211-276`),
   using viewport-percentage zones, unrelated to "pages from edge".
6. **Three unreconciled sources of "page size"**: (a) server `PageDimension`, (b) real dimensions
   read by `SafeBitmapDecoder` during decode (never surfaced beyond decode-strategy choice), (c)
   `onGloballyPositioned` layout measurement (`ReaderPageList.kt:806-814`, the one that actually
   updates `itemHeights`). A comment in the code (`ReaderPageList.kt:904-912`) documents that
   discrepancies here already caused progress-bar bugs.
7. **`scrollFraction` has two names for the same value depending on layer.** Persisted as
   `scrollFraction` (`LocalProgress`, `ReadingProgressEntity`); emitted in the native event as
   `pageFraction` (`VisiblePageChangedEvent`); `useReader.ts` assigns the incoming `pageFraction`
   straight into `state.scrollFraction` (line 68) and later passes it as `scrollFraction` to
   `saveLocalProgress` (line 263) — same data, two names across the bridge boundary.
8. **`chapterFraction` travels inside the page-level event/DTO** (`VisiblePageChangedEvent`,
   `ReaderPageList.kt:488` callback) despite being a Chapter-granularity value, not a Page one —
   mixes two domain granularities in a single transport structure.

No contract shape is proposed here — this inventory is the input for Task 009 (Page contract
modeling).

### 5. Server round-trip: real Kavita endpoints + step-by-step flow (chapter tap → first page on screen)

Added after user feedback: the field/consumer inventory above wasn't enough — modeling the
Page contract needs to start one level lower, from what Kavita actually returns per request and
what the app does with it end to end, not just where fields appear scattered in code.

#### 5.1 Real Kavita endpoints (all in `KavitaChapterFeature.kt`)

| # | Route | Method | Params | Auth | Purpose | Full response DTO |
|---|---|---|---|---|---|---|
| 1 | `/api/Series/volumes` | GET | `?seriesId={id}` | Bearer JWT | List volumes→chapters for a series (feeds `pageCount`/`number` the Reader later reads from Room) | `List<VolumeDto>` → `VolumeDto{id, chapters: List<ChapterDto>}`; `ChapterDto{id, number="", title="", pages=0, pagesRead=0, sortOrder=0.0, createdUtc=null}` |
| 2 | `/api/reader/image` | GET (consumed by Coil, not `RequestTool`) | `?chapterId&page&apiKey` | `apiKey` in query, **not** Bearer | Serve one page's image bytes (0-based `page`) | No DTO — raw image bytes, URL resolved directly by the image loader |
| 3 | `/api/Reader/chapter-info` | GET | `?chapterId&includeDimensions=true` | Bearer JWT | Get width/height for **all** pages of a chapter in one call, no image bytes | `ChapterInfoDto{pageDimensions: List<PageDimensionDto>=[]}`; `PageDimensionDto{width=0, height=0, pageNumber=0}` |
| 4 | `/api/Reader/get-progress` | GET | `?chapterId` | Bearer JWT | Server-saved reading progress (current page) | `ProgressDto{pageNum=0}` (404 → treated as "no progress", returns `null`) |
| 5 | `/api/Reader/mark-multiple-read` | POST | body `{seriesId, volumeIds:[], chapterIds:[...], generateReadingSession:false}` | Bearer JWT | Mark chapter(s) read | no parsed response DTO (only checks `status==200`) |
| 6 | `/api/Reader/mark-multiple-unread` | POST | same shape | Bearer JWT | Mark chapter(s) unread | same |

Key facts about the real shape:
- **There is no endpoint that returns "ready-made page URLs."** The app builds each page's URL
  itself in a loop: `(0 until expectedPageCount).map { "$baseUrl/api/reader/image?chapterId=$chapterId&page=$pageIndex&apiKey=..." }`
  (`KavitaChapterFeature.kt:136-138`). `expectedPageCount` comes from `ChapterDto.pages`
  (endpoint #1) or from the already-cached `ChapterCacheEntity.pageCount` in Room — never from
  the image/chapter-info responses.
- **Auth is inconsistent across endpoints**: JSON endpoints (#1, #3, #4, #5, #6) use `Bearer`
  JWT header; the image endpoint (#2) uses `apiKey` as a query param — likely because Coil
  consumes it directly, bypassing `RequestTool`, so no custom header injection there.
- `Json { ignoreUnknownKeys = true }` means this table can only assert the fields the DTOs
  actually declare and read — Kavita's real response may carry more fields that are silently
  dropped.

#### 5.2 Step-by-step: chapter tap → first page on screen

RN owns every navigation/state decision; Kotlin/Compose only draws what it's given and reports
scroll back.

1. User taps a chapter in the chapter list → RN navigates to `ReaderScreen` with
   `seriesId`/`chapterId`; `useReader(seriesId, chapterId)` mounts (`useReader.ts:190`).
2. `useEffect` fires `loadInitialViewer(chapterId)` when `chapterId` changes (`useReader.ts:444-447`);
   dispatches `LOADING` immediately (`useReader.ts:367`).
3. Fetches the **locally cached** chapter list via `SeriesBridge.getCachedChapters(seriesId)`
   (`useReader.ts:369`) — a Room read (`ChapterCacheEntity`, populated earlier by the
   series/list screen via endpoint #1), not a fresh network call here. Sorts and stores in
   `orderedChaptersRef`, identifies `curr`/`prevChapter`/`nextChapter` by index
   (`useReader.ts:373-385`).
4. Fires 4 calls in parallel (`Promise.all`, `useReader.ts:394-399`) for the **current** chapter
   only:
   - `fetchPageUrls(curr.id, curr.pageCount)` → `PageService.ts:3` → `ReaderBridge.getPageUrls`
     → `ReaderChapterModule.getPageUrls` (`ReaderChapterModule.kt:35-41`) →
     `KavitaChapterFeature.getPageUrls` (`KavitaChapterFeature.kt:129-142`): checks **Room**
     first (`pageCacheDao.getByChapterId`); if `cached.size == expectedPageCount`, returns
     straight from local cache, **no network**. Otherwise builds the N URLs locally (string
     concatenation, no network call to "get" URLs) and **writes** them to Room
     (`pageCacheDao.replaceForChapter`) before returning.
   - `fetchPageAspectRatios(curr.id, curr.pageCount)` → `ReaderService.ts:18-30` → real network
     call to endpoint #3 — **no Room cache**, refetched on every chapter open. Failure → array
     of `null`s, never blocks opening.
   - `fetchLocalProgress(curr.id)` (skipped if `startAtBeginning`) → Room read, `reading_progress`.
   - `fetchServerReadProgress(curr.id)` (skipped if `startAtBeginning`) → real network call to
     endpoint #4.
5. Stale-request guard (`useReader.ts:403-408`): discards the response if a newer
   `loadInitialViewer` started meanwhile (fast chapter switching).
6. `resolveInitialPage` (`shared/transforms/chapter.ts`) picks the initial page from local vs.
   server progress.
7. `dispatch({type:'VIEWER_READY', ...})` (`useReader.ts:425-431`) builds
   `viewer = {prev:null, curr:{...}, next:null}` — **prev/next are still null**, only the
   current chapter is ready.
8. Same tick: `loadNeighbor('prev', ...)` and `loadNeighbor('next', ...)` fire **without
   awaiting** (`useReader.ts:432-433`), repeating step 4's fetch pattern per neighbor,
   dispatching `INSERT_PREV_NEIGHBOR`/`UPDATE_VIEWER` asynchronously — this happens **after**
   the current chapter's first page may already be rendered.
9. React re-renders `ReaderScreen` (`ReaderScreen.tsx:66-107`) once `reader.viewer` is non-null:
   builds `blocks: ReaderChapterBlock[]` (one per non-null trio entry), each with `chapterId`,
   `pageUrls` (already built in step 4), `pageAspectRatios` (`null`→`0` conversion),
   `firstNode`/`lastNode` (SDU tree). `scrollToChapterId`/`scrollToPageIndex` come from
   `reader.scrollToPageRequest` (set to the page resolved in step 6).
10. `ReaderPageListView.tsx:58` passes `blocks`/scroll-request props to the native view
    `RCTReaderPageListView`.
11. Native bridge delivers props to `ReaderPageListView.kt:41-51` (`setBlocks` etc.) as Compose
    `mutableStateOf` — any change recomposes.
12. `ReaderPageList` Composable (`ReaderPageList.kt:472`) receives `blocks`;
    `flattenBlocks` (lines 89-98) builds `entries: List<ListEntry>` in render order;
    `allPageUrls = blocks.flatMap { it.pageUrls }` (line 502).
13. `LaunchedEffect(entries, containerWidthPx)` (lines 534-569) uses `pageAspectRatios` (from
    endpoint #3, step 4) to seed `itemHeights` **before any image decode** — this is what lets
    the progress bar/layout estimate height ahead of any image download.
14. Another `LaunchedEffect(scrollToChapterId, scrollToPageIndex)` (lines 583-592) finds the
    target index and calls `listState.scrollToItem(targetIndex)` — jumps straight to the page
    resolved in step 6, not necessarily page 0.
15. `LazyColumn` composes visible items (lines 792-824). For each `ListEntry.Page` in the
    viewport window, `ReaderPageImage(url, aspectRatio)` (line 828) is called with the
    already-built URL (step 4, endpoint #2). **This is the only point** — on-demand, per item
    that actually enters composition — where the image is requested:
    `SubcomposeAsyncImage` (Coil) fires the download+decode via `ImageRequest.Builder(...)`
    (lines 835-849). A placeholder sized by step 13's `aspectRatio` shows until then.
16. Neighbor preload: inside the scroll-listening `LaunchedEffect` (lines 608-790), each scroll
    tick computes the absolute flat index of the visible page
    (`allPageUrls.indexOf(visibleEntry.url)`, line 785) and calls
    `preloader.updateWindow(computePreloadWindow(allPageUrls, absoluteIndex))`.
    `computePreloadWindow` (`PagePreloader.kt:69-75`) takes up to `PAGE_PRELOAD_RADIUS=3` pages
    before/after; `updateWindow` cancels jobs outside the window and fires Coil requests
    (same cache key) for the rest — only warms Coil's cache, doesn't force visual composition.
    This only starts running **after** the first scroll tick (even the programmatic one from
    step 14) — i.e. neighbor preload for the initial page only begins after the first page is
    already being displayed/decoded.
17. Once Coil resolves the HTTP GET to endpoint #2 and decodes the bytes,
    `SubcomposeAsyncImageContent()` (line 870) replaces the placeholder.
    `Modifier.onGloballyPositioned` (lines 806-815) then overwrites the step-13 estimate in
    `itemHeights` with the real measured height — the only point where "real" (post-decode)
    height diverges from "estimated" (pre-decode, from endpoint #3).
18. Position/progress reporting back to RN: the same scroll `snapshotFlow` (step 16) computes
    `onVisiblePageChanged(chapterId, pageIndex, pageFraction, chapterFraction)` (line 783) →
    emitted via `ReaderPageListView.emitVisiblePageChanged` → RCT event `onVisiblePageChanged`
    → `ReaderPageListView.tsx` wrapper → `ReaderScreen`/`useReader.setCurrentPage`, closing the
    loop.
19. Progress persistence runs decoupled from rendering: `useReader.ts:255-280` arms two
    intervals — every 2s (`LOCAL_SAVE_INTERVAL_MS`) `saveLocalProgress` writes to Room
    (`ReadingProgressEntity`); every 20s (`SERVER_SYNC_INTERVAL_MS`) `saveServerProgress` is
    meant to sync to the server. **Notable gap found**: `KavitaChapterFeature.saveReadingProgress`
    (`KavitaChapterFeature.kt:110-127`) only writes to Room/`chapter_cache` — it makes **no
    network call at all**. "Saving progress to the server" today, on the RN→Kotlin path that
    exists, does not actually reach Kavita. This is direct evidence for Task 022 (progress sync
    audit) — flagging it here since it surfaced during this survey, not asserting it as that
    task's finding (Task 022 should independently verify and report on it).

#### 5.3 Where each piece of data actually lives

| Data | Read from | Written to | When |
|---|---|---|---|
| Page URLs | Room `page_cache` (if count matches) or built on the fly | Room `page_cache` (whenever rebuilt) | Every `loadInitialViewer`/`loadNeighbor`, before building `blocks` |
| Dimensions/aspect ratio | No local cache — always network (`chapter-info`) | Not persisted in Room | Every chapter open (current + each neighbor) |
| Decoded image bytes | Coil cache (memory+disk), outside Room | Same Coil cache | On demand, when a page enters composition or is preloaded (window of 3) |
| Local progress (page/scrollFraction) | Room `reading_progress` | Room `reading_progress` | Every 2s + on screen exit |
| Server progress | `get-progress` (network) | `saveReadingProgress` in Kotlin does **not** call the network — only writes local Room/`chapter_cache` (gap noted above) | Read on chapter open; "write" every 20s or on markAsRead |
| Chapter list/pageCount | Room `chapter_cache` (`SeriesBridge.getCachedChapters`) | Populated by the series flow (out of scope here) via endpoint #1 | Before opening the Reader |
