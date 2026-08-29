# Task 036 — Library screen moves to the new Server/digest stack (drop KavitaSeriesFeature.listSeries)

**Status:** todo

## Objective

Migrate the Library screen (RN) and its Kotlin backing (`LibraryModule.kt`,
`KavitaSeriesFeature.listSeries()`) off the legacy `chapterCacheDao`-based aggregation, onto the
new `Server`/digest stack (`SerialsService`/`SerialService`/`ChapterDigest`) already used by
`SerieScreen` (Task 024). This is the original scope Task 024 never got to — surfaced explicitly
by the user near the end of that task's session, then descoped into its own task once its real
size became clear.

## Background / how this was discovered

While closing Task 024, the user asked whether `SerialsService.list()` (the new path) already
returns everything the Library needs. Investigation found:

- `SerialsService.list()` → `ServerBridge.listSerials()` returns `PluginSerial[]` — raw Kavita
  data only (`id`, `name`, `coverUrl?`, `pagesRead`, `totalPages`, `lastUpdatedUtc?`, `summary?`,
  `genres`, `tags`). No follow state, no chapter counts, no BFF enrichment.
- The Library today reads `SeriesSummary[]` (via `LibraryModule.listSeries` →
  `KavitaSeriesFeature.listSeries()`), which has significantly more: `readStatus`,
  `progressFraction`, `downloadedChapters`, `totalChapters`, `readChapters`, `chapterCount`,
  `latestChapterLabel`, `publicationStatus`, `hasErrors`, `isFollowed`. This is built by
  aggregating Kavita + BFF (`bffFeature`) + `chapterCacheDao` (legacy Room cache) +
  `followedSeriesDao` — the exact 3-source aggregation the ORIGINAL Task 024 (before its scope
  was redirected to `SerieScreen`) wanted to replace with a single canonical computation.
- The new `SeriesDigest` (`SerialService.get`) already carries `chapters.readCount`/`chapters.total`
  — computed by `buildSeriesDigest` (Kotlin, `:content-digest`) without touching `chapterCacheDao`
  at all. This covers `readStatus`/`progressFraction` derivation for free, with zero new Kotlin
  work.
- `FollowedSeriesBridge.isFollowed` (already built in Task 024) covers `isFollowed` with zero new
  Kotlin work.
- **Gap**: nothing in the new digest/Server stack today produces `downloadedChapters`/`hasErrors`
  (BFF-sourced) or `publicationStatus`. These would need either: (a) a decision that the new
  Library card simply drops them (scope reduction), or (b) new Kotlin work to expose BFF match
  data and publication status through the digest or a sibling bridge — deliberately NOT decided
  yet, left for this task's own design phase.
- Also discovered as a side effect: `LibraryModule.saveReadingProgress` (Kotlin) has zero real RN
  caller today — the Reader actually calls `ReaderChapterBridge.saveReadingProgress`
  (`bridge/chapter.ts`), not `LibraryBridge.saveReadingProgress` (`bridge/library.ts`).
  Coincidental same-named method in two different bridge modules; the `LibraryBridge` one is dead
  code, unrelated to whether this task proceeds — flag for cleanup regardless of which fetch
  strategy wins.

## Scope / what this task must decide before implementing

Design phase, mirroring Task 024's own pseudo-code-first discipline:

1. Whether to fetch every series' digest at once (`SerialsService.list()` for raw id/name/cover
   list, then `Promise.all` mapping `SerialService.get({ seriesId })` per id) vs. paginate (fetch
   first N, load more on scroll). User's own framing: "primeiro, vamos ver se serials.list já
   basta; segundo, se não bastar, considerar essa ideia; terceiro, mover a lógica que hoje mora
   no Kotlin (SplashSyncCoordinator) para the RN splash — pelo menos a parte relevante a este
   fluxo."
2. What the new Library card's contract looks like — likely dropping
   `downloadedChapters`/`hasErrors`/`publicationStatus` for now (pending BFF/publication-status
   exposure decision), deriving `readStatus`/`progressFraction` from
   `SeriesDigest.chapters.readCount`/`total`, and `isFollowed` from `FollowedSeriesBridge`.
3. What happens to `SplashSyncCoordinator.sync()`'s own use of `kavitaSeriesFeature.listSeries()`
   — it calls this today only to feed `bffFeature.syncBff(series)` (BFF sync), NOT for any
   progress calculation; this use is unrelated to the Library screen itself and needs its own
   decision (does BFF sync move to RN too, stay as-is, or get satisfied a different way) once the
   Library's own fetch strategy is settled.

## Orphaned once this ships (do NOT delete now — listed here so nothing is lost)

- `LibraryModule.kt` (`listSeries`, `toggleFollow`, `syncBff` — `saveReadingProgress` is already
  dead code today, unrelated to this task's timing)
- `KavitaSeriesFeature.listSeries()` and its `resolveProgress()` helper (features/kavita/series)
- `SeriesSummary` data class (Kotlin) and its RN mirror `SeriesSummary` (`shared/bridge/library.ts`)
- Whatever of `chapterCacheDao`'s per-series aggregation becomes unused once nothing calls
  `listSeries()` anymore (needs its own dependency check — `chapterCacheDao` itself is still used
  elsewhere, e.g. `getCachedChapters`/`markChaptersRead/Unread` kept in `SeriesModule.kt` after
  Task 024's own cleanup)
- Possibly `bffFeature.syncBff` call sites, depending on how point 3 above resolves

## Completion criteria

- Library screen renders from the new Server/digest stack, not `KavitaSeriesFeature.listSeries()`.
- Design/contract for the new Library card decided and reviewed with the user BEFORE
  implementation (pseudo-code first, same discipline as Task 024).
- No behavior regression the user hasn't explicitly accepted (e.g. dropping
  `downloadedChapters`/`hasErrors`/`publicationStatus` must be an explicit user call, not silently
  lost).
- Orphaned Kotlin/TS code from the list above removed in a follow-up commit once nothing depends
  on it (mirroring how Task 024 did its own legacy cleanup in a dedicated commit).
- Tested on a real device, `make coverage` shows no drop, explicit user approval before
  `finalizar-task`.

## Notes

This task was carved out of Task 024's closing conversation (2026-08-29) rather than implemented
inline, once its real size (new Kotlin exposure decisions for BFF/publication-status, a
fetch-strategy decision, and a full Library rewrite) became clear. Task 024 itself closes without
touching this.
