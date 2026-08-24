# `:content-digest` — API reference

Layer 3 domain module (Task 014's terminology) — "lapidated" content contracts, minimally-treated
composition of what `:server` (Layer 2) exposes. This module never talks to a plugin/provider
directly; every field ultimately comes from calling `:server`'s `Server` facade.

This document exists for the same reason `:server`'s own README does: answer, per type/function,
**exact shape, what each field means, and every condition under which a result becomes a
`Failure`** — so a caller building on top (the RN bridge, later) doesn't have to re-read
`PageDigest.kt`/`ChapterDigest.kt`/`SeriesDigest.kt` end to end every time.

## Conventions that apply to every digest in this module

- **No separate `XResult` wrapper type.** Each domain's result is a `sealed interface` with
  `Success`/`Failure` variants directly — same idiom as the existing `OtaCheckResult` (`:tools`).
  This differs from the original TS modeling spec (`_contract-design-notes.md`), which used a
  flattened `{isSuccess} & Contract` union; the sealed hierarchy itself already is the
  discriminated result.
- **`Failure(error: ErrorDigest)`** — `ErrorDigest` (`error/ErrorDigest.kt`) is shared across every
  domain in this module, not owned by Page or Chapter specifically. `code` is the throwing
  exception's own class name (`this::class.simpleName`) — good enough to log/branch on today,
  without inventing a code taxonomy this module doesn't need yet.
- **`server`/`resolvedAtEpochMs` reflect the last SUCCESSFUL call *this specific digest's own
  builder function* made, overwritten in call order — never a later or independent call, and
  never a nested call another digest made on its behalf** (R11 in `_contract-design-notes.md`).
  Concretely: `ChapterDigest.Success.server`/`resolvedAtEpochMs` only reflect `chapter.get()`/
  `chapter.getProgress()` — never anything from `pages.list`'s own per-page calls. Each
  `PageDigest.Success` inside that list carries its own independent `server`/`resolvedAtEpochMs`.
- **`cache: Nothing?`** — always `null` in every digest this module produces. No Cache module
  exists yet (Task 015's guideline); the field exists in the shape, unpopulated.
- **A field populated by handing back another module's own object is never re-shaped/filtered by
  the receiving module.** Same treatment `server`/`cache` already get: the whole object is passed
  through, not reduced to a subset. This is why `PageDigest.Success.chapter: ChapterSummary` below
  carries every field `ChapterSummary` has, not a hand-picked subset.

---

## `page/` — `PageDigest`

```kotlin
sealed interface PageDigest {
    data class Success(
        val id: String,                     // synthetic "chapterId:pageIndex" — Kavita has no native page id
        val number: Int,                     // caller-supplied page index, 0-based — never absent
        val url: String,
        val hasFetchedDimensions: Boolean,   // width/height non-null AND > 0 — a real 0 counts as "no usable dimension"
        val width: Int?,
        val height: Int?,
        val aspectRatio: Double?,            // width/height — NOT height/width
        val orientation: Orientation?,       // null when aspectRatio is null OR exactly 1 (perfect square)
        val resolvedAtEpochMs: Long,
        val server: ServerActiveInfo,        // never null in Success
        val cache: Nothing?,                 // always null — no Cache module exists yet
        val chapter: ChapterSummary,         // the exact parameter buildPageDigest received, unfiltered
    ) : PageDigest

    data class Failure(val error: ErrorDigest) : PageDigest

    enum class Orientation { PORTRAIT, LANDSCAPE }
}
```

Page is read-only today (no page-level write endpoint exists — only whole-chapter mark-read/
unread, exposed by `:server`'s `Chapter.setRead`).

### `buildPageDigest(server: Server, chapter: ChapterSummary, pageIndex: Int): PageDigest`

**Assembly order matters (R11):**
1. `server.serial(chapter.seriesId).chapter(chapter.id).page(pageIndex).getUrl()` — **vital**. Any
   thrown exception here makes the whole result `PageDigest.Failure(e.toErrorDigest())`.
2. `server.serial(chapter.seriesId).chapter(chapter.id).page(pageIndex).getDimensions()` —
   **tolerated**. A thrown exception here is caught silently — `width`/`height` stay `null`,
   `server`/`resolvedAtEpochMs` keep whatever `getUrl()` already set, and the result is still a
   `Success`.

`server`/`resolvedAtEpochMs` are overwritten after each call that actually succeeds — they end up
reflecting whichever of the two calls above succeeded **last**, per R11.

**Derived fields:**
- `hasFetchedDimensions = width != null && height != null && width > 0 && height > 0` — a real `0`
  from the server counts the same as "no usable dimension," not literally "has data."
- `aspectRatio = width / height` (not the inverse) — `null` when `hasFetchedDimensions` is `false`.
- `orientation` — `null` when `aspectRatio` is `null` OR exactly `1.0` (perfect square, neither
  orientation applies); `LANDSCAPE` when `> 1.0`; `PORTRAIT` when `< 1.0`.

**Example:**
```kotlin
buildPageDigest(server, chapterSummary, pageIndex = 3)
// PageDigest.Success(
//   id = "c1:3", number = 3, url = "https://kavita.example.com/api/reader/image?...",
//   hasFetchedDimensions = true, width = 1240, height = 1754,
//   aspectRatio = 0.7070694..., orientation = PORTRAIT,
//   resolvedAtEpochMs = 1755878400000,
//   server = ServerActiveInfo(...), cache = null,
//   chapter = chapterSummary,
// )
```

---

## `page/` — `ChapterSummary`

```kotlin
data class ChapterSummary(
    val id: String,
    val seriesId: String,
    val decimalNumber: Double?,
    val number: Int?,
    val specialLabel: String?,
    val isSpecial: Boolean?,
    val title: String,
    val createdUtc: String?,
    val coverImage: ImageDescriptor,
    val resolvedAtEpochMs: Long,
    val server: ServerActiveInfo,
)
```

The chapter fields `buildChapterDigest` (see below) has already resolved **before** it builds
`pages.list` — passed down into every `buildPageDigest` call so `PageDigest.Success.chapter` has
real chapter data, not a placeholder (a Task-018-only placeholder existed here before Task 019;
see `_contract-design-notes.md`'s "PageDigest.chapter placeholder" history).

**Deliberately excludes** `readStatus`/`pages`/`prevChapter`/`nextChapter`: those either depend on
`pages.list` itself (`readStatus`, `pages`) or on another domain (`prevChapter`/`nextChapter`,
filled by Series, Task 020) — building either of those first, before `pages.list` exists, would be
circular (`ChapterDigest` needs `PageDigest`, which would need `ChapterDigest`). `ChapterSummary`
is the subset of `ChapterFields` (see below) that's genuinely available before that point.

`PageDigest` never re-shapes/filters this object — it's handed back exactly as received (per the
general "never re-shape a passed-through object" convention above).

---

## `chapter/` — `ChapterFields` (shared shape)

```kotlin
interface ChapterFields {
    val id: String
    val seriesId: String
    val decimalNumber: Double?     // maps Kavita's real SortOrder
    val number: Int?               // decimalNumber truncated, only when it's a whole number — null otherwise this task
    val specialLabel: String?      // = PluginChapter.specialLabel, only when isSpecial == true — null otherwise
    val isSpecial: Boolean?
    val title: String
    val createdUtc: String?
    val coverImage: ImageDescriptor
    val readStatus: ReadStatus
    val pages: Pages
    val resolvedAtEpochMs: Long    // R11 — only this Chapter's OWN calls (get/getProgress), never pages.list's
    val server: ServerActiveInfo
    val cache: Nothing?

    enum class ReadStatus { READ, IN_PROGRESS, UNREAD }
    enum class PagesStatus { SUCCESS, PARTIAL, ERROR }

    data class Pages(
        val fileFormat: String?,
        val status: PagesStatus,
        val count: Int?,
        val readCount: Int?,
        val total: Int,                 // derived from list.size — cross-check against count
        val totalWidthPx: Int?,         // Σ width across list — null unless every page succeeded AND has usable dimensions
        val totalHeightPx: Int?,        // Σ height across list — same condition
        val resumePoint: ResumePoint?,
        val list: List<PageDigest>,
    )

    data class ResumePoint(
        val stoppedAtPageIndex: Int?,
        val recordedAtEpochMs: Long?,
    )
}
```

`ChapterFields` exists so `ChapterDigest.Success` and `ChapterNeighborDigest.Success` (below) don't
duplicate every field declaration — both implement it, differing only in whether they carry
`prevChapter`/`nextChapter`.

### Field derivation rules

- **`number`** — when `buildChapterDigest` is called in isolation (no Series context):
  `decimalNumber` truncated to `Int`, **only if it's a whole number**
  (`decimalNumber.toInt().toDouble() == decimalNumber`), otherwise `null` — a fractional
  `decimalNumber` (e.g. a real "Extra 0.5" chapter) has no meaningful integer `number` on its own.
  When built as part of `SeriesDigest.chapters.list` (Task 020), this fallback is superseded: the
  real value is the chapter's 1-indexed position in the series' `decimalNumber`-sorted list (see
  `SeriesDigest` below) — this is the only place `number` can be resolved correctly, since it
  depends on the full ordered set of chapters, not any chapter in isolation.
- **`specialLabel`** — `PluginChapter.specialLabel` (Kavita's real `Range`), **only when
  `isSpecial == true`**. In real Kavita data, `Range` is often populated with the same numeric
  string as a normal chapter's number (confirmed via a real-server smoke test — a plain chapter
  "1" has `range="1"`, not `null`) — using `isSpecial` as the gate, not a string comparison against
  `number`, avoids treating that redundant value as a real special label.
- **`readStatus`** — `count`/`readCount` are `Pages.count`/`readCount` (`PluginChapter.pageCount`/
  `pagesRead`, both nullable — see below):
  - `count == null || readCount == null` → `UNREAD` (fallback — not enough data to say otherwise).
  - `readCount == 0` → `UNREAD`.
  - `readCount >= count` → `READ`.
  - otherwise → `IN_PROGRESS`.
- **`pages.status`** — derived from `pages.list`'s own per-item `PageDigest.Success`/`Failure`:
  - every item `Success` → `SUCCESS`.
  - every item `Failure` → `ERROR`.
  - mixed → `PARTIAL`.
  (A page's own `getDimensions()` failure is tolerated *inside* `PageDigest` — still a `Success` —
  so it never affects `pages.status`; only a page's `getUrl()` failure does, since that's what
  makes a `PageDigest.Failure`.)
- **`pages.totalWidthPx`/`totalHeightPx`** — the sum of `width`/`height` across every entry in
  `pages.list`, but **only when every entry is a `Success` AND every entry has
  `hasFetchedDimensions == true`**. A single failed page or a page with an unusable (`null`/`0`)
  dimension makes both `null` — a partial sum would be silently misleading, not a useful total.
  An empty `pages.list` also yields `null` for both (nothing to sum).
- **`pages.resumePoint`** — `null` only when *both* `stoppedAtPageIndex` and `recordedAtEpochMs`
  are `null` (i.e. the server has no progress recorded and no last-read timestamp at all).
  - `stoppedAtPageIndex` — from `chapter.getProgress()`'s `PluginProgress.pageIndex` (tolerated
    failure — see `buildChapterDigest` below).
  - `recordedAtEpochMs` — `parseIsoUtcToEpochMs(PluginChapter.lastReadingProgressUtc)` (`:tools`,
    `com.mymangareader.tools.datetime`) — Kavita's real `ChapterDto.lastReadingProgressUtc`, a
    variable-precision ISO date-time with no timezone in the value itself (the field's `Utc`
    suffix is the only signal — see that function's own doc comment). Returns `null` instead of
    throwing on anything unparsable (R10 category 2 — not an error).

`count`/`readCount`/`decimalNumber`/`isSpecial` are all nullable in `:server`'s own `PluginChapter`
— not because Kavita omits them today (confirmed via a real-server smoke test: it always sends
them), but because the *contract* is provider-agnostic: a different provider might not have that
concept at all. See `:server`'s own README for the full `PluginChapter` shape.

---

## `chapter/` — `ChapterDigest` / `ChapterNeighborDigest`

```kotlin
sealed interface ChapterDigest {
    data class Success(
        override val id: String,
        // ...every ChapterFields field...
        val prevChapter: ChapterNeighborDigest?,   // filled by Series (Task 020, optional param) — null if no neighbor or Series didn't provide one
        val nextChapter: ChapterNeighborDigest?,
        override val resolvedAtEpochMs: Long,
        override val server: ServerActiveInfo,
        override val cache: Nothing?,
    ) : ChapterDigest, ChapterFields

    data class Failure(val error: ErrorDigest) : ChapterDigest
}

sealed interface ChapterNeighborDigest {
    data class Success(
        // ...every ChapterFields field, no prevChapter/nextChapter...
    ) : ChapterNeighborDigest, ChapterFields

    data class Failure(val error: ErrorDigest) : ChapterNeighborDigest
}
```

`ChapterNeighborDigest` excludes only `prevChapter`/`nextChapter` — the only fields causing
unbounded recursion. `pages` (the full list included) is intentionally kept, even though it makes
a neighbor's payload larger — mirrors how the Reader already fetches a neighbor's full page data
today (needed for the prev/curr/next trio to render without a second round-trip).

### `buildChapterDigest(server: Server, seriesId: String, chapterId: String, knownChapter: PluginChapter? = null, prevChapter: ChapterNeighborDigest? = null, nextChapter: ChapterNeighborDigest? = null): ChapterDigest`

**`knownChapter` (Task 020) — an optional completeness-checked fast path, not a fallback/merge.**
When Series already fetched a `PluginChapter` (from its own `chapters.list()` call) and passes it
here, `buildChapterDigest` checks whether **every field it itself reads from `PluginChapter`**
(`decimalNumber`, `specialLabel`, `isSpecial`, `createdUtc`, `lastReadingProgressUtc`,
`fileFormat`, `pageCount`, `pagesRead` — see `isCompleteForChapterDigest()`) is non-null on the
passed-in value:
- **All present** → `chapter.get()` is skipped entirely, `knownChapter` is used as-is.
- **Any missing** (even one) → `knownChapter` is discarded completely and `chapter.get()` runs
  from scratch, exactly as if nothing had been passed — **never** a partial merge between the two
  sources. This isn't a Kavita-specific optimization (today, Kavita's `chapters.list()` and
  `chapter(id).get()` happen to return identical data, so the check always passes for Kavita) — it's
  a real completeness guarantee that holds for any future provider whose per-item `get()` might
  return more than its own batch `list()` does.
- `PluginChapterCompletenessTest.kt` guards this from silently going stale: if `PluginChapter`
  ever gains a new nullable field, that test fails until `isCompleteForChapterDigest()` is updated
  to account for it too (or the field is deliberately excluded, like `number`, which is never read
  from `PluginChapter` by this function).

**Assembly order matters (R11):**
1. `chapter.get()` (unless skipped via `knownChapter`, see above) — **vital when it does run**. Any
   thrown exception here makes the whole result `ChapterDigest.Failure(e.toErrorDigest())`. Either
   way (skipped or not), also calls `server.serial(seriesId).chapter(chapterId).getCoverImage()`
   (never throws on its own — no network call, pure string concatenation, see `:server`'s README)
   to build the `ChapterSummary` this step assembles. If `get()` was skipped, `server`/
   `resolvedAtEpochMs` have no value yet at this point — `getCoverImage()` is the one that sets
   them (same idiom as `PageDigest` starting with `server = null` until its first real call
   succeeds); if `get()` did run, its own envelope already won and `getCoverImage()`'s doesn't
   overwrite it.
2. `server.serial(seriesId).chapter(chapterId).getProgress()` — **tolerated**. A thrown exception
   here is caught silently — `pages.resumePoint.stoppedAtPageIndex` stays `null`, `server`/
   `resolvedAtEpochMs` keep whatever step 1 already set, and the result is still built as a
   `Success`.
3. `pages.list` is built by calling `buildPageDigest` **once per page index**
   (`0 until (plugin.pageCount ?: 0)`), **in parallel** (`coroutineScope` + `async`/`awaitAll`) —
   order in the resulting list is preserved regardless of which call finishes first, since each
   `Deferred`'s position in the `map` matches its index. Each `PageDigest` carries its own
   independent `server`/`resolvedAtEpochMs` (R11, scoped to that one page) — this step never
   touches `ChapterDigest.Success.server`/`resolvedAtEpochMs`, only steps 1–2 do.

`prevChapter`/`nextChapter` are passed straight through as given — this function never resolves
its own neighbors; only `SeriesDigest` (below) does, by calling this function once per chapter and
wiring the results together afterward. Likewise `number` defaults to `decimalNumber` truncated
(only when it's a whole number) when called in isolation — `SeriesDigest` overwrites it with the
chapter's real 1-indexed position once it knows the full sorted list.

**Example (real values from a smoke test against a live Kavita server — apiKey redacted):**
```kotlin
buildChapterDigest(server, seriesId = "4", chapterId = "20522")
// ChapterDigest.Success(
//   id = "20522", seriesId = "4",
//   decimalNumber = 0.0, number = 0, specialLabel = null, isSpecial = false,
//   title = "0", createdUtc = "2026-07-30T02:04:27.9154042",
//   coverImage = ImageDescriptor(url = "https://.../api/Image/chapter-cover?chapterId=20522&...", hasFetchedDimensions = false, width = null, height = null, ...),
//   readStatus = READ,
//   pages = Pages(
//     fileFormat = "archive", status = SUCCESS, count = 37, readCount = 37, total = 37,
//     totalWidthPx = 26640, totalHeightPx = 246145,
//     resumePoint = ResumePoint(stoppedAtPageIndex = 37, recordedAtEpochMs = 1785377195695),
//     list = [PageDigest.Success(...), ...],   // 37 entries
//   ),
//   prevChapter = null, nextChapter = null,
//   resolvedAtEpochMs = 1787522841972,
//   server = ServerActiveInfo(...), cache = null,
// )
```

---

## `error/` — `ErrorDigest`

```kotlin
data class ErrorDigest(
    val code: String?,
    val message: String?,
)

fun Throwable.toErrorDigest() = ErrorDigest(code = this::class.simpleName, message = message)
```

Minimal shape — the design notes flag `ErrorDigest`'s real taxonomy (distinguishing "resource
genuinely doesn't exist" from "failed to reach it") as a real, not-yet-designed requirement.
`code` is the throwing exception's own class name (e.g. `"ServerException"`, `"IOException"`) —
good enough to log/branch on today, without inventing a code taxonomy this module doesn't need yet.
Shared across every domain in this module (Page, Chapter, Series later) — not owned by any single
one.

---

## `series/` — `SeriesFields` (shared shape)

```kotlin
interface SeriesFields {
    val id: String
    val name: String
    val library: Library?              // {id, name} — Necessary; null when the series has no libraryId (provider-agnostic — Kavita always sends one, but the contract can't assume every provider has this concept)
    val lastUpdatesUTC: LastUpdatesUTC? // {series, chapterAdded, readDate} — each an epoch-millis Long? via parseIsoUtcToEpochMs
    val coverImage: ImageDescriptor
    val chapters: Chapters?            // Necessary — null ONLY when the chapters.list() call itself failed; a series with no chapters published yet is chapters = Chapters(..., list = [])
    val otherNames: OtherNames?        // {original, localized} — Aggregating
    val sortName: String?
    val otherIds: OtherIds?            // {aniListId, malId} — Aggregating
    val colors: Colors?                // {primary, secondary} — Aggregating
    val metadata: Metadata?            // Aggregating — null on any getMetadata() failure, never escalates
    val resolvedAtEpochMs: Long        // R11 — only reflects THIS Series' own calls (get/getCoverImage), never chapters.list's or metadata's
    val server: ServerActiveInfo
    val cache: Nothing?

    data class Library(val id: String, val name: String?)
    data class LastUpdatesUTC(val series: Long?, val chapterAdded: Long?, val readDate: Long?)
    data class OtherNames(val original: String?, val localized: String?)
    data class OtherIds(val aniListId: Int?, val malId: Long?)
    data class Colors(val primary: String?, val secondary: String?)

    data class Metadata(
        val description: String?,           // Kavita's real summary field — the modeling-phase spec called this `description`, the real DTO calls it `summary`
        val genres: List<PluginGenreOrTag>,  // id+name pairs — kept the id, unlike an earlier code path that discarded it
        val tags: List<PluginGenreOrTag>,
        val publicationStatus: String?,      // Kavita's real PublicationStatus enum, translated to its name (e.g. "OnGoing") — see :server's README
        val ageRating: PluginAgeRating?,     // {rating, system} — system is "Kavita" here, NOT "ESRB": Kavita's own AgeRating names (Unknown/Teen/Mature17Plus/...) aren't real ESRB vocabulary, so the adapter names its own rating system instead of hardcoding a wrong one
        val releaseYear: Int?,               // 0 from Kavita means "not set" — treated as null, same convention as PluginSerial's aniListId/malId
        val language: String?,
    )

    enum class ChaptersStatus { SUCCESS, PARTIAL, ERROR }

    data class Chapters(
        val status: ChaptersStatus,   // same success/failure aggregation as ChapterFields.Pages.status, one layer up: applied to List<ChapterDigest> instead of List<PageDigest>
        val readCount: Int?,          // null only for a genuinely empty list — otherwise a real count, including 0
        val total: Int,               // derived from list.size
        val resumePoint: ResumePoint?,
        val list: List<ChapterDigest>,
    )

    enum class ResumePointStatus { IN_PROGRESS, UNREAD }

    data class ResumePoint(
        val stoppedAtChapterId: String,
        val stoppedAtChapterIndex: Int,
        val status: ResumePointStatus,
        val recordedAtEpochMs: Long?,   // duplicated from list[stoppedAtChapterIndex].pages.resumePoint.recordedAtEpochMs, for convenience
    )
}
```

### Field derivation rules

- **`chapters.readCount`** — counts `chapters.list` entries whose `ChapterDigest.Success.readStatus
  == READ` (chapter-level, not page-level). `null` **only** when `chapters.list` is genuinely empty
  (a "coming soon" series — nothing to report progress on) — a series with chapters and zero of
  them read is `readCount = 0`, a real, different value from `null`. No server-side chapter-count
  progress field exists on `SeriesDto` (only page-granularity `pages`/`pagesRead`, already mapped
  to `PluginSerial.totalPages`/`pagesRead`) — this is always derived by counting the list.
- **`chapters.status`** — the same success/failure aggregation `ChapterFields.Pages.status` already
  uses, applied one layer up: every entry `Success` → `SUCCESS`; every entry `Failure` → `ERROR`;
  mixed → `PARTIAL`. A chapter that fails here (its own `buildChapterDigest` call threw) still gets
  a `ChapterDigest.Failure` entry in the list — never silently dropped — and its neighbors are
  still built normally around it (see `chapters.list` ordering below).
- **`chapters.resumePoint`** — a 2-level cascade over `chapters.list`, in order: the first
  `ChapterDigest.Success` with `readStatus == IN_PROGRESS` wins; if none, the first with
  `readStatus == UNREAD`; if every chapter is `READ`, `null` (a "reread" state — nothing left to
  resume). Deliberately simpler than an older 3-level cascade this replaces — a "reread threshold"
  grey zone was dropped as redundant with `readStatus`'s own effectively-read threshold.

---

## `series/` — `SeriesDigest`

```kotlin
sealed interface SeriesDigest {
    data class Success(
        override val id: String,
        // ...every SeriesFields field...
        override val resolvedAtEpochMs: Long,
        override val server: ServerActiveInfo,
        override val cache: Nothing?,
    ) : SeriesDigest, SeriesFields

    data class Failure(val error: ErrorDigest) : SeriesDigest
}
```

No `SeriesNeighborDigest` — a series has no "previous/next" concept, unlike a chapter within a
series. `chapters.list` is `List<ChapterDigest>` directly (not `ChapterNeighborDigest`); it's
`SeriesDigest`, not `ChapterDigest` itself, that resolves each chapter's `prevChapter`/`nextChapter`
— `ChapterDigest` alone has no visibility into chapter order (see `buildChapterDigest`'s own
`prevChapter`/`nextChapter` params, which default to `null` when it's called in isolation).

### `buildSeriesDigest(server: Server, seriesId: String): SeriesDigest`

**Assembly order matters (R11):**
1. `server.serial(seriesId).get()` — **vital**, always runs (no equivalent of `buildChapterDigest`'s
   `knownChapter` fast path here — nothing calls `SeriesDigest` from a context that would already
   have this data). Any thrown exception makes the whole result `SeriesDigest.Failure`. On success,
   also calls `getCoverImage()` unconditionally — since `get()` always ran and always set `server`/
   `resolvedAtEpochMs` on success, `getCoverImage()` (which never fails on its own) is
   unconditionally the last successful call at this point, per R11.
2. `getMetadata()` — **tolerated** (Aggregating). A thrown exception here is caught, `metadata`
   stays `null`, and doesn't touch `server`/`resolvedAtEpochMs`.
3. `chapters.list()` (the raw `List<PluginChapter>`) — **tolerated** (Necessary, not Vital: a
   fetch failure here doesn't invalidate `id`/`name`/`library`/`coverImage`/`metadata`, already
   resolved independently). A thrown exception makes `chapters` (the whole block, not the module)
   `null`; a real empty series is `chapters.list = []` (a `Chapters` value with an empty list),
   never confused with this `null`.

**Building `chapters` (when `chapters.list()` succeeds):**
1. **Sort** the raw `PluginChapter` list by `decimalNumber` ascending (missing `decimalNumber`
   sorts last). This is what lets a special/extra chapter (e.g. `decimalNumber = 1.5`, "Extra")
   land in its correct position without any special-cased logic — a chapter is just a number on a
   line, in order.
2. **Build every `ChapterDigest` in parallel** (`coroutineScope` + `async`/`awaitAll`, order
   preserved by list position regardless of completion order — same idiom `pages.list` already
   uses), passing each entry's own `PluginChapter` as `knownChapter` (see `buildChapterDigest`
   above for the completeness check that decides whether this actually skips a redundant
   `chapter.get()` call).
3. **First pass** — overwrite `number` on every `ChapterDigest.Success` with its **1-indexed
   position in the sorted list** (`index + 1`), superseding `buildChapterDigest`'s own
   isolated-call fallback. This must happen *before* building neighbors (next step), so a
   neighbor's own `number` is already correct — not the stale fallback.
4. **Second pass** — for every `ChapterDigest.Success`, build `prevChapter`/`nextChapter` from the
   already-built neighbors at `index - 1`/`index + 1` (converted to `ChapterNeighborDigest` — a
   `Success` becomes a `ChapterNeighborDigest.Success` with every `ChapterFields` field copied
   over; a `Failure` becomes a `ChapterNeighborDigest.Failure` with the same error). **No
   additional network calls** — this is pure in-memory reshaping of chapters already built.

**Example (real values from a smoke test against a live Kavita server — apiKey redacted):**
```kotlin
buildSeriesDigest(server, seriesId = "156")
// SeriesDigest.Success(
//   id = "156", name = "A Ascensão do Espadachim de Rank Baixo",
//   library = Library(id = "1", name = "Mangás"),
//   lastUpdatesUTC = LastUpdatesUTC(series = 1787069627921, chapterAdded = 1787080101685, readDate = 1787071164964),
//   coverImage = ImageDescriptor(url = "https://.../api/Image/series-cover?seriesId=156&...", ...),
//   chapters = Chapters(
//     status = SUCCESS, readCount = 17, total = 17, resumePoint = null,
//     list = [ChapterDigest.Success(id = "18565", number = 1, ...), ...],   // 17 entries, sorted, numbered 1..17
//   ),
//   otherNames = OtherNames(original = "...", localized = ""),
//   sortName = "A Ascensão do Espadachim de Rank Baixo",
//   otherIds = OtherIds(aniListId = null, malId = null),
//   colors = Colors(primary = "#...", secondary = "#..."),
//   metadata = Metadata(description = "...", genres = [...], tags = [], publicationStatus = "OnGoing", ageRating = PluginAgeRating(rating = "Unknown", system = "Kavita"), releaseYear = null, language = "pt-BR"),
//   resolvedAtEpochMs = 1787531471622, server = ServerActiveInfo(...), cache = null,
// )
```

---

## Not yet in this module

- **Cache integration** — every `cache` field in this module is `Nothing?`/always `null` until the
  Cache module (Task 015's guideline) exists.
