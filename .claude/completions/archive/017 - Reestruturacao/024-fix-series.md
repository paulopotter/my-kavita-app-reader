# Task 024 — Correction: Series (Phase 5 — Corrections)

**Status:** done

## Objective

Implement the Series contract from Task 010: stop `KavitaSeriesFeature.listSeries()` from
reading `chapterCacheDao` directly (delegate to the Chapter layer instead), and unify
`SeriesSummary`'s progress aggregate (`readCount`/`progressFraction`) into the single canonical
computation decided in Task 010, replacing the 3 divergent implementations found in the Task
005 survey.

## Steps

1. Replace the direct `chapterCacheDao` read in `KavitaSeriesFeature.listSeries()` with a call
   through the Chapter contract/layer (per Task 008/010 decisions).
2. Implement the single canonical `readCount`/`progressFraction` computation (per Task 010) and
   remove the 2 other divergent implementations found in Task 005, pointing all 3 former call
   sites at the single one.
3. Verify no behavior regression in Series Detail and Library screens that consume this data.

## Completion criteria

- `KavitaSeriesFeature.listSeries()` no longer reads `chapterCacheDao` directly.
- Only one implementation of the series progress aggregate exists in the codebase.
- Tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.

## Result

The original Kotlin-only scope above (`listSeries()`/progress aggregate) was never touched —
`KavitaSeriesFeature.listSeries()` is still used today (`LibraryModule`, `SplashSyncCoordinator`)
and still reads `chapterCacheDao` directly. Early in this task's session the user redirected its
scope to something larger and more urgent: **series-detail's entire RN layer**, still built on
the legacy `SeriesBridge`, was rewritten from scratch on the new `SerialService`/`ChapterService`
stack (Tasks 016-023's real implementation). The untouched original scope was carved out into
**Task 036** once its real size became clear (see that task's own file for the full contract).

What actually shipped, across many co-designed iterations (pseudo-code + explicit confirmation
before each shape/name decision, never reusing legacy code):

- **`shared/tools/{actions,chapters,series}`** — new domain tools: `ActionContract`/`useAction`
  (declarative navigation, EventBus-ready), `ChapterTool` (normalize/mark, optimistic
  update/confirm/revert via `onUpdate`), `ChaptersTool.sort` (chapter sort preferences, unifying
  what used to be two disconnected sources — Config's `SeriesBridge.getChapterSortPrefs` and the
  legacy screen's `getSeriesSortPrefs` — into `PreferencesManager`), `SerieTool` (canonical
  `Serie`/`SerieChapter` shape, follow via `FollowedSeriesBridge`).
- **`screens/serie/`** — the new screen itself (`useSerie` hook + header/chapter-list-item/
  selection-bottom-bar/chapter-sort-config-modal components), built alongside the legacy screen
  and only swapped into `Routes.SERIES_DETAIL` once validated on a real device.
- **`:preferences` (new Kotlin module)** — generic key/value preference store (mirrors `:cache`
  but without TTL — a preference is a source of truth, not a cache), with its own bridge
  (`PreferencesBridgeModule`) and RN manager (`PreferencesManager`). Room migrations 11→12 (create
  table) and 12→13 (migrate `series_sort_prefs` + `ui_preferences.chapterSort*` into it, then drop
  `series_sort_prefs` — using `INSERT OR IGNORE` after a real-device crash showed a plain `INSERT`
  collides with rows the app itself had already written via `ChaptersTool.sort` before upgrading).
- **Splash fix**: `Server`'s `activeGroupId` only lives in memory, never persisted — a device
  crashed with "No active server group set" on first use of the new Server-based bridges after a
  fresh boot. Fixed 100% in RN (`activateFirstServerGroup.ts`, in `useSplash.run()`), using
  services that already existed (`ServersService.groups.list()` + `ServerService.group.active.set`)
  — no new Kotlin needed.
- **Performance fix**: `useSerie` was calling `SerialService.getFull` (`full=true`), which
  propagates to every chapter's own digest and fetches that chapter's entire page list over the
  network — one full chapter-list load turned into hundreds of page requests on a series with many
  chapters (~3min). Fixed to `SerialService.get` (`full=false`) — a chapter list only needs title/
  number/readStatus, never each chapter's pages.
- **Pull-to-refresh fix**: `force` was never threaded through the digest bridges — a manual
  refresh silently returned the same cached value inside the digest's TTL. `getChapterDigest`
  migrated from a positional `full: Boolean` param to a `ReadableMap` options object (`{full,
  force}`), consistent with `getSeriesDigest`; `force` now flows Kotlin → bridge.ts →
  `SerialService`/`ChapterService` → `useSerie`.
- **Legacy cleanup** (once the new screen was validated and approved): deleted
  `screens/series-detail/` (18 files — screen, service, transform, hook, 4 components, tests) and
  its debug-only route; removed 9 of `SeriesModule.kt`'s ~15 `@ReactMethod`s that had zero real RN
  caller left (`getSeriesMetadata`, `getCachedSeriesDetail/Metadata`, `getChapters`,
  `replaceCachedChapters`, `toggleFollow`/`isSeriesFollowed`, the 3 old sort-prefs methods); deleted
  `SeriesSortPrefsDao`/`Entity` entirely (only `SeriesModule` used them).
- **Coverage**: JS floor moved 47→55 (statements/lines), 73→90 (branches), 73→76 (functions) across
  the session's many increments; Kotlin floor moved 76→78 (line coverage) — including brand-new
  migration tests for 10-11/11-12/12-13 (none of the DB migrations 10-13 had any test before this
  task; the 12-13 one directly caught the real crash bug above).

**Known gaps surfaced but deliberately not solved here** (each documented in code and/or memory
for later):
- `ChapterService.status.set` never invalidates the Kotlin digest cache after marking a chapter
  read/unread — leaving/reopening a series within the digest's TTL (~15min) can show the pre-mark
  status again. Documented in `chapters.tool.ts`'s own doc comment.
- `seriesProgressChanged` (the event `useLibrary` listens for to react to chapter-read changes
  without a refetch) is only emitted by the legacy `SeriesModule.markChaptersRead/Unread` path —
  marking read via the new `ChapterTool`/`ServerBridge.setChapterRead` path never fires it, so the
  Library won't update until a manual refresh. Flagged as a real EventBus (Task 013) candidate
  rather than duplicating the progress-calculation logic in the new path.
- Error messages surfaced to the user in `SerieScreen`'s error state are raw exception text (e.g.
  the "No active server group" message before it was fixed) — needs a friendly-message mapping,
  deliberately deferred.
- A black-screen crash was reported when opening a chapter from a series never read before (a
  previously-read series' chapter opens fine) — investigation was inconclusive (two log-capture
  attempts both missed the actual crash moment) and was deprioritized once the user stopped being
  able to reproduce it; revisit whenever the Reader screen itself is worked on.
- Task 036 (new) now owns the original scope this task never got to, plus the newly-discovered
  gap that `SerialsService.list()` alone doesn't cover everything the Library needs
  (`downloadedChapters`/`hasErrors`/`publicationStatus` have no equivalent in the new digest stack
  yet).

## Testing

Tested on a real physical device across many `-rcN` builds (APK `0.7.0-rc7` → `0.8.0-rc7`, JS
bundle `0.8.0-rc7` → `0.9.0-rc7`) via `make redeploy-log`. `make coverage` (Kotlin + JS) passing at
every commit in this session, floors bumped when it increased, never allowed to regress.

## Approval

User confirmed each build worked as expected across the session ("parece que funcionou, no log
mostra algo?", "aparentemente a remoção da tela de série funcionou, não estou identificando nenhum
bug no momento"), and explicitly asked to close this task once the Task 036 carve-out was
documented ("sim, pode finalizar a task").
