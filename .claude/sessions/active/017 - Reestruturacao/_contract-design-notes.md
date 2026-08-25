# Contract design notes (shared across Tasks 008/009/010/011/012/013/014)

> Living document. Compressed 2026-08-21 after closing the Page/Chapter mini-iteration — keeps
> only final decisions and current shapes, not the discussion trail. Numbering (R1, R2...) is
> not the original D1-D29 numbering from the full session history; if you need the "why" behind
> a rule in more depth than stated here, ask the user, who has the full conversation. General
> rules apply to every domain contract (Page, Chapter, Series, Library, and the shared
> capability modules). Contract shapes are the current working state, not frozen — expect them
> to keep evolving across future mini-iteration sessions (Series, Library, and revisits).

## Process rules (how this file gets written, not what it contains)

- **Never write a decision to this file without the user's explicit approval first.** Discuss
  the content in the conversation, get an explicit "pode salvar"/confirmation, only then Edit
  this file. Writing first and correcting after is the mistake this rule exists to prevent.
- **TypeScript typing, not example JSON**, is the working format for every contract — makes
  required/optional and ownership explicit instead of implicit-by-example. Field names in
  English (matches `CLAUDE.md`); conversation stays in Portuguese.
- **TS here is the modeling/specification language only — not what gets implemented on the
  Kotlin side.** These shapes are the reference contract both the real Kotlin implementation
  (idiomatic data classes / sealed interfaces for the `XResult` unions) and the real RN/TS code
  must match — implementation on the Kotlin side is real Kotlin, not TS. Chosen as the working
  language here specifically because the user reads/discusses TS more comfortably than Kotlin.
- **Booleans always get a `has`/`is`/`did`-style prefix**, never a bare noun (e.g.
  `hasFetchedDimensions`, `isSuccess`, `isSpecial` — not `fetchedDimensions`/`success`/`special`).
- **A type owned by another module is referenced via `import type`, in its own code block —
  never pasted inline again.** If the module's contract file doesn't exist as a real path yet,
  the import path is illustrative, not a claim the file exists.
- **Whenever a working-note code sample shows a contract, show only its current final shape** —
  not the intermediate versions that led to it. Superseded shapes don't need to be re-shown.

## General rules (apply to every domain contract)

**R1 — 6-layer reference architecture.** A module accesses itself (same-layer composition) or
the layer directly below — never above, never skipping, except one named case. Layers are a
**reference model for where a kind of responsibility lives and what access is allowed when a
layer exists for a given domain** — not a requirement that every domain instantiate all six. A
simple-enough domain can skip Layer 3 entirely (Layer 4 talking straight to Layer 2), and the
Layer-4-shaped role can even live *inside* Layer 5 itself (e.g. a screen's own local hook) when
no separate module is warranted.

- **Layer 0** — OS/native primitives.
- **Layer 1** — Named plugins (e.g. Kavita, ntfy) — the only place a provider's real
  name/API shape is known. Never accessed directly from Layer 3 or above.
- **Layer 2** — Plugin abstraction modules (Server, Notification, Image, Cache, etc.) — reduce
  coupling to the named plugin; data here is still fairly raw. `ServerDescriptor`/
  `CacheDescriptor` live here (not yet modeled in detail — see below).
- **Layer 3** — Lapidated domain contracts — minimally-treated composition of what Layer 2
  exposes. `PageContract`/`ChapterContract`/`SeriesContract` (everything modeled in this file)
  live here. Also where reusable cross-app tools live. **Optional per domain.**
- **Layer 4** — RN Service layer — groups multiple Layer 3 (or, if Layer 3 doesn't exist for
  that domain, Layer 2) modules into richer, screen-ready data; owns the standardizing
  functions (e.g. "what actions can this chapter perform").
- **Layer 5** — Front (screens, components, theme).

**Named exception**: Layer 4 may reach down to either Layer 3 or Layer 2 directly (never Layer
1) — this is what lets a domain skip Layer 3 without breaking the access rule. Any other
cross-layer skip needs an explicit, justified exception (same bar as the Reader's
native-rendering exception in `architecture.md`), never silent.

**Same-layer composition is explicitly allowed and expected** — e.g. `Server.series` (Layer 3)
calling the Chapter domain module (Layer 3) to build `SeriesContract.chapters`, or Chapter
(Layer 3) calling Page (Layer 3) to build `pages.list` — both same-layer domain-to-domain calls,
not a Layer-4-orchestration requirement. What this forbids is a domain inventing/computing
another domain's data itself instead of asking that domain's own module (e.g. Series reading
`chapterCacheDao` directly instead of asking the Chapter module for `ChapterContract`s).

**Layer 5 is not a monolithic block — it has its own internal composition, a "microcosm"
between what it receives from Layer 4 and what it renders.** A specific screen (e.g. the Series
detail page) is not limited to consuming only the Layer 4 Service that shares its domain name —
it commonly needs to call **multiple** Layer 4 Services at once (Series, Chapter, etc.), and the
final composition between them happens inside Layer 5 itself, before becoming UI. This does not
contradict the project's existing "a screen never imports from another screen — only `shared/`"
invariant (`CLAUDE.md`) — that rule is about screens never importing *each other*; a screen
calling multiple domains' Layer 4 Services is normal same-layer-5 composition, not a
screen-to-screen import.

**R2 — Cross-cutting capability modules (Cache, Error, Image, Server — Layer 2) can be called
directly by any Layer 3 domain, outside the R1 same-layer chain.** A Layer 3 business domain
(Page, Chapter...) may call a Layer 2 capability module directly to fill in its own slice of
the contract (e.g. Page calls `Cache.prepare(...)`) — this is "medium coupling," explicitly
acceptable (closer to "Page uses Room" than "Page asks Series for data"), and is just the
normal Layer-3-to-Layer-2 access R1 already allows. The capability module **owns the shape** of
what it returns, not just the value — the calling domain never designs that shape itself, and
may not even use every field it gets back. **Nullability caveat:** never decide a field's
nullability by looking only at what *one* provider (Layer 1, e.g. Kavita) always sends — the
Layer 3 contract is provider-agnostic (R2/R7), so ask whether a *different* provider could
plausibly lack that concept entirely, not just whether today's provider omits the value.

**R3 — Whole-request failure and per-field absence are different concerns, both server-facing.**
A `Server.*` call can fail entirely (no auth, no active server, HTTP error) — that comes back
as a typed error, never a contract with fields quietly nulled out to paper over total failure.
Per-field `null` (e.g. `width`/`height` when a dimension isn't available) only happens *after*
the call already succeeded, and only for fields whose absence is legitimate business data.

**R4 — Whenever a field is a cheap, deterministic derivation from data the module already has,
ship it pre-calculated alongside the raw inputs — don't make every consumer reimplement the
formula.** Applies whenever the derivation is simple math/comparison (not a judgment call — see
R5's exception). Ship both the raw fields and the derived one when useful for cross-checking a
real inconsistency, not as an either/or choice.

**R5 — Layout/positioning math is never a contract's job by default.** A contract exposes
intrinsic data only (dimensions, URLs, aspect ratio when known) — never derived
positioning/estimation values like "estimated height in a vertical scroll list." That
computation belongs to whichever layer assembles a *collection* into a reading experience (the
Reader), not to Page/Chapter. When intrinsic data is missing, the contract exposes `null` and
stops — it never attempts a fallback estimate itself.

**R6 — User-action state does not belong in a Layer 3 `Server.*` contract.** A Layer 3
contract is server-facing only (server → app, via Layer 2/1). Anything about *when the app
itself changed something locally* (e.g. `updatedAtLocalMs`, scroll-position-in-pixels/
`scrollFraction`) belongs to Layer 4 (the RN Service layer), not the Layer 3 contract — even
though it's conceptually about the same user, it's a different data source/context than what
the server reports (e.g. `resumePoint`, which the server itself tracks, does belong in the
Layer 3 contract — see Chapter's shape below).

**R7 — A batch provider endpoint doesn't force a batch-shaped internal contract.** If the real
provider (Layer 1) only offers a batch call (e.g. Kavita's chapter listing has no per-chapter
endpoint), the cut down to a single requested item happens in the **Server (manager) module** —
the provider-agnostic Layer 2 plugin-manager — never in the raw Layer 1 provider adapter (which
stays a dumb pass-through) and never in the Layer 3+ caller. Keeps the "give me one X" interface
stable regardless of the underlying provider's real API shape.

**R8 — Result types are fully flattened via intersection types, both branches — never nested
under a named key.** `XResult = ({isSuccess: true} & XContract) | ({isSuccess: false} &
ErrorContract)`. No `{isSuccess, page: {...}}`/`{isSuccess, error: {...}}` nesting. When a
result lives inside a list (e.g. per-page results inside a chapter), each position keeps its
own result — a failure is never silently dropped from the array.

**R9 — Method signatures (sync/async, per-item/batch call shape) are deferred.** Every mini-
iteration so far has worked only on response/data contracts. Revisit once more domains are
modeled and a repeatable method-signature pattern is obvious from precedent, instead of
inventing conventions from a single domain.

**R10 — Four categories exist for "something isn't there," each with a different shape — but
which category a given field falls into is a per-field decision, always asked explicitly, never
applied automatically.** This is shared vocabulary for the four shapes already in use, not a
rule that decides for you:
1. **Couldn't even attempt the call** (no auth, no active server, network/HTTP failure) →
   `ErrorContract` (R3).
2. **Call succeeded, but this specific field has no data** (e.g. server hasn't processed a page's
   dimensions yet) → `null`. Never an error.
3. **A collection that is genuinely, legitimately empty** (e.g. a chapter that really has zero
   pages) → an empty array (`[]`). Never `null`, never an error.
4. **A collection where some items succeeded and others failed** → stays granular, one result
   per position (`PageResult`/`ChapterResult` etc., not the whole collection replaced by a
   single error) — an aggregate `status` field (`"success"|"partial"|"error"`) can summarize
   without hiding which item failed.

**Explicit caveat (user correction, do not skip this when a new field comes up):** the same
"missing" field can belong to a different category depending on context — e.g. one field being
`null` might be unremarkable, while a *different* field being absent on the same contract might
actually need to be an error instead. Never assume a field's category by pattern-matching it
against these four — ask the user which one applies, every time, for every new field.

**R11 — `server`/`resolvedAtEpochMs` reflect the last SUCCESSFUL `:server` call, overwritten in
call order, not necessarily the last call attempted.** `:server`'s content-read methods each
return a `ServerResponse<T>` envelope (`data`, `serverInfo: ServerActiveInfo`,
`resolvedAtEpochMs`) — see `android/server/README.md`'s "Every READ content method returns
`ServerResponse<T>`" section for why (eliminates a race a separate `getActiveInfo()` call would
have). When a Layer 3 contract makes several `:server` calls to assemble itself (e.g. Page calling
both `getUrl()` and `getDimensions()`), it keeps a running `server`/`resolvedAtEpochMs` pair,
overwritten after each call that actually succeeds — a later call's envelope always wins over an
earlier one, but a call that fails (and is tolerated, not escalated to `Failure` — R10 category 2)
leaves the running values from the last call that *did* succeed untouched, rather than clearing
them or trying to fetch a fresh value independently. Call order therefore matters: whichever call
happens last determines the final `server`/`resolvedAtEpochMs`, provided it succeeded — if the
last call in sequence fails, the values simply stay whatever the previous successful call set.
General rule, not Page-specific — applies to Chapter/Series (Task 019/020) and any future
contract composing multiple `:server` calls.

**R10 addendum — classify every field as Vital / Necessary / Aggregating before deciding its
absence behavior; the classification is the criterion, not a separate afterthought:**
- **Vital** — without it, the contract itself isn't usable. If a vital field can't be resolved,
  the whole result becomes `isSuccess: false` (a root-level `ErrorContract`, "panic" — there's
  nothing meaningful to return). Example: `id`, `name` on `SeriesContract`.
- **Necessary** — matters for the domain's core purpose, but its absence is a real, sometimes
  legitimate state that needs case-by-case judgment to classify as either closer to Vital
  (should become an error in this specific scenario) or closer to Aggregating (tolerable,
  becomes `null`/empty). Example: `SeriesContract.chapters` — a series with no chapters
  published yet is a legitimate state (not an error, list is genuinely empty per R10 category 3),
  but a *failed* attempt to fetch chapters for a series that should have them is a different
  case needing its own judgment call.
- **Aggregating** — enrichment. If it can't be resolved, it's always `null` (or empty collection)
  — never escalates to an error, never blocks the rest of the contract. Example:
  `SeriesContract.metadata` (description/genres/tags/etc.) or `colors`.

Apply this classification **while drafting** a new contract's fields, before asking which R10
category (1-4) each one falls into — it's the lens that answers that question, not a separate
step done after.

## Current contract shapes

**`server/contract.ts`** — not yet modeled in detail; known so far:
```typescript
export interface ServerDescriptor {
  id: string;     // which registered server instance (e.g. multiple Kavita servers)
  type: string;   // provider technology, e.g. "kavita"
}
```

**`cache/contract.ts`** — not yet modeled in detail; known so far:
```typescript
export interface CacheDescriptor {
  key: string;
  cachedAtEpochMs: number | null;
  // rest owned by the Cache module when it's modeled (R2)
}
```

**`error/contract.ts`** — not yet modeled. Known requirements for whenever it is: needs a
`code` (or similar) able to distinguish "resource genuinely doesn't exist" (`404`-style) from
"failed to reach it" (network/auth/server error) — today's real code
(`KavitaChapterFeature.kt`) mostly collapses every non-`200` HTTP status into one generic
error, except a single case (`getServerReadProgress`) that already treats `404` specially. Also
carries whatever fields let a caller show/log the failure (module of origin, message).

**`image/contract.ts`**:
```typescript
import type { ServerDescriptor } from "../server/contract";
import type { CacheDescriptor } from "../cache/contract";

export interface ImageDescriptor {
  url: string;
  hasFetchedDimensions: boolean;                  // disambiguates "never asked" from "asked, server had none"
  width: number | null;
  height: number | null;
  aspectRatio: number | null;                      // width/height — NOT height/width (today's real ReaderService.ts formula is height/width; flagged as a real code-behavior change for whoever implements this, not done by this modeling pass)
  orientation: "portrait" | "landscape" | null;     // derived from aspectRatio
  resolvedAtEpochMs: number;                        // when this image data was resolved — distinct from cache.cachedAtEpochMs (when the cache entry was written)
  server: ServerDescriptor;
  cache: CacheDescriptor | null;
}
```

**`page/contract.ts`**:
```typescript
import type { ImageDescriptor } from "../image/contract";
import type { ErrorContract } from "../error/contract";

export type PageResult =
  | ({ isSuccess: true } & PageContract)
  | ({ isSuccess: false } & ErrorContract);

// Page IS an image (inherits ImageDescriptor's fields flattened) — different from Chapter,
// which merely HAS a cover image (composition, see coverImage below).
export interface PageContract extends ImageDescriptor {
  id: string;      // synthetic "chapterId:pageIndex" — Kavita has no native page id
  number: number;   // caller-supplied page index, 0-based — never absent

  chapter: {
    id: string;
    pageTotal: number;   // total pages in the PARENT chapter — not this page's own data, kept for context when a PageContract is consumed in isolation
  };
}
```
Page is read-only today (no page-level write endpoint exists — only whole-chapter
mark-read/unread).

**Task 018 — real Kotlin implementation, corrections to the modeling-phase shape above:**

- **`PageResult` collapses into `PageDigest` itself being the `sealed interface`** — no separate
  `PageResult` wrapper type. `PageDigest.Success`/`PageDigest.Failure` are the two variants
  directly (same idiom as the existing `OtaCheckResult` in `:tools`) — R8's "flattened, never
  nested under a named key" spirit is honored by the sealed hierarchy itself, not by a second
  wrapper type on top of it.
- **`server: ServerDescriptor` becomes `server: ServerActiveInfo`** (`:server`'s real type, Task
  018's own addition — see `android/server/README.md`) — never `null` inside `Success` (a
  successful `Success` always has at least one successful `:server` call behind it, so there's
  always a `ServerActiveInfo` to report — see R11).
- **`cache` is always `null`** in this task — no cache module exists yet (Task 015's guideline is
  followed as-is: the field exists in the shape, unpopulated).
- **`chapter` is NOT `{ id, pageTotal }` as originally modeled — it's the entire `Chapter`
  parameter the function received, passed through unchanged.** The function's real signature is
  `buildPageDigest(chapter: Chapter, pageIndex: Int)` — `chapter.id`/`chapter.serial.id` are the
  only two fields Page actually reads (to call `Server.serial(chapter.serial.id).chapter(chapter.id)`),
  everything else on `chapter` is "profit" (unused by Page, but preserved in the output). This
  reflects the general rule (user's own framing): **a field that's populated by handing back
  another module's own object is never re-shaped/filtered by the receiving module — it's exactly
  what was received.** Applies the same way `server`/`cache` already work (never filtered/reduced
  by Page) — `chapter` is no different, just sourced from a caller-supplied parameter instead of
  a `:server`/`:cache` call.
- **`Chapter`'s own shape (`id`, `serial: { id }`) is a Task-018-only placeholder — NOT the real
  `ChapterContract`/`ChapterDigest`, which doesn't exist yet (Task 019).** `chapter.id`/
  `chapter.serial.id` — not `chapter.chapterId`/`chapter.serialId` as flat fields — because once
  inside the `chapter` object, repeating "chapter"/using a flat `serialId` would be redundant/
  inconsistent with how a real nested contract reads. **Explicit pending item: revisit this
  placeholder's exact fields once Task 019 (Chapter) and Task 020 (Series) actually build
  `ChapterDigest`/`SeriesDigest` for real — Page's `Chapter` parameter type must be corrected to
  match whatever the real shape turns out to be, not left as this minimal placeholder.**

```kotlin
// :content-digest, Task 018 — package/file names illustrative, not yet finalized
data class Chapter(
    val id: String,
    val serial: Serial,
) {
    data class Serial(val id: String)
}

sealed interface PageDigest {
    data class Success(
        val id: String,
        val number: Int,
        val url: String,
        val hasFetchedDimensions: Boolean,
        val width: Int?,
        val height: Int?,
        val aspectRatio: Double?,
        val orientation: Orientation?,
        val resolvedAtEpochMs: Long,
        val server: ServerActiveInfo,
        val cache: Nothing?,   // always null this task — typed as Nothing? until Cache module exists
        val chapter: Chapter,   // the exact parameter received, unfiltered
    ) : PageDigest

    data class Failure(val error: ErrorDigest) : PageDigest

    enum class Orientation { PORTRAIT, LANDSCAPE }
}

data class ErrorDigest(val code: String?, val message: String?)
```

**Assembly order (R11 in practice):** `getUrl()` first (vital — its failure makes the whole
result `PageDigest.Failure`), then `getDimensions()` (tolerated failure — caught, `width`/
`height` stay `null`, doesn't escalate). `server`/`resolvedAtEpochMs` start `null`, get
overwritten after each successful call, in that order — so they end up reflecting `getDimensions()`'s
own resolution when it succeeds, or fall back to `getUrl()`'s when `getDimensions()` fails.
`hasFetchedDimensions = width != null && height != null && width > 0 && height > 0` — a real `0`
from the server counts the same as "no usable dimension," not literally "has data." `orientation`
is `null` both when `aspectRatio` is `null` and when it's exactly `1` (perfect square — neither
orientation applies) — `landscape` when `> 1`, `portrait` when `< 1`.

**`chapter/contract.ts`**:
```typescript
import type { ServerDescriptor } from "../server/contract";
import type { CacheDescriptor } from "../cache/contract";
import type { ImageDescriptor } from "../image/contract";
import type { PageResult } from "../page/contract";
import type { ErrorContract } from "../error/contract";

export type ChapterResult =
  | ({ isSuccess: true } & ChapterContract)
  | ({ isSuccess: false } & ErrorContract);

export interface ChapterContract {
  id: string;
  seriesId: string;

  // Chapter's own numbering, corrected against Kavita's real documented API
  // (v0.8.0 release notes) rather than our own defensively-parsed field names:
  decimalNumber: number | null;    // maps Kavita's real `SortOrder` — authoritative numeric value when present
  number: number | null;           // resolved sequential number: decimalNumber (if whole) → filled by Series (R1, optional param) → null
  specialLabel: string | null;     // maps Kavita's real `Range`, populated only when it diverges from the resolved `number` (e.g. non-numeric special name)
  isSpecial: boolean | null;       // server-declared (medium-confidence source — see Kavita API note below), independent of specialLabel's inference

  title: string;
  createdUtc: string | null;
  coverImage: ImageDescriptor | null;   // chapter HAS an image (composition), doesn't extend it

  readStatus: "READ" | "IN_PROGRESS" | "UNREAD";   // calculated from pages.count/pages.readCount (R4)

  pages: {
    fileFormat: "image" | "archive" | "unknown" | "epub" | "pdf" | null;  // server — real MangaFormat enum. NOT a "genre" (manga/comic/webtoon — that's LibraryType, out of scope, see Open/rejected) — it's the file packaging type. Also exists on SeriesDto but deliberately not added to SeriesContract (see Series shape below)
    status: "success" | "partial" | "error";   // list-wide summary from list's per-item isSuccess — "partial" only makes sense at this level, not per-item
    count: number | null;             // server-declared page count — nullable (real `0` default in Kotlin DTO can't be distinguished from "not sent")
    readCount: number | null;         // server-declared pages-read count — nullable, same reason
    total: number;                    // derived from list.length — cross-check against count (R4)
    totalWidthPx: number | null;      // Σ width across list — always null today since per-page width isn't fetched by default; placeholder for if that ever becomes cheap
    totalHeightPx: number | null;     // Σ height across list — same
    resumePoint: {
      stoppedAtPageIndex: number | null;   // server — get-progress → PageNum, confirmed 0-indexed via real ProgressDto schema
      recordedAtEpochMs: number | null;    // server — real ChapterDto.lastReadingProgressUtc, confirmed via kavita-api skill (schemas.md) — null-safe if absent
    } | null;
    list: PageResult[];    // built by Chapter (Kotlin) calling the Page domain module directly — same R1 same-layer composition pattern later reused by Series→Chapter (see SeriesContract.chapters.list below); each entry keeps its own success/failure (R8) — a failed page is never dropped
  };

  prevChapter: ChapterNeighborContract | null;   // filled by Series (R1, optional param), null if no neighbor or Series didn't provide one
  nextChapter: ChapterNeighborContract | null;

  resolvedAtEpochMs: number;
  server: ServerDescriptor;
  cache: CacheDescriptor | null;
}

// Excludes only prevChapter/nextChapter — the only fields causing unbounded recursion.
// `pages` (full list included) is intentionally kept, even though it makes the neighbor
// payload larger — mirrors how the Reader already fetches a neighbor's full page data today
// (needed for the prev/curr/next trio to render without a second round-trip).
export type ChapterNeighborContract = Omit<ChapterContract, "prevChapter" | "nextChapter">;
```

**`series/contract.ts`**:
```typescript
import type { ServerDescriptor } from "../server/contract";
import type { CacheDescriptor } from "../cache/contract";
import type { ImageDescriptor } from "../image/contract";
import type { ChapterResult } from "../chapter/contract";
import type { ErrorContract } from "../error/contract";

export type SeriesResult =
  | ({ isSuccess: true } & SeriesContract)
  | ({ isSuccess: false } & ErrorContract);

export interface SeriesContract {
  // Vital — absence of either means the whole result should be isSuccess:false, not a
  // partially-filled SeriesContract (R10 addendum).
  id: string;
  name: string;

  // Necessary — real, tolerable absence states exist; case-by-case judgment, not automatic null.
  library: {
    id: string;
    name: string | null;
  } | null;   // `| null` is deliberate: today's provider (Kavita) always sends libraryId, but
              // the contract is provider-agnostic (R2) — a different provider might not have
              // a "library" concept at all, so this can't be made non-nullable just because
              // Kavita happens to always send it.

  lastUpdatesUTC: {
    series: number | null;           // server — lastFolderScanned
    chapterAdded: number | null;      // server — lastChapterAddedUtc
    readDate: number | null;           // server — latestReadDate. Assumed (not verified against source): updates on ANY chapter read, not just the most-advanced one — inferred from the field's name, not confirmed behavior.
  } | null;

  coverImage: ImageDescriptor | null;

  chapters: {
    status: "success" | "partial" | "error";
    readCount: number | null;   // derived by counting list — no server-side chapter-count-based progress field exists on SeriesDto (confirmed: only page-granularity `pages`/`pagesRead`)
    total: number;               // derived from list.length
    resumePoint: {
      stoppedAtChapterId: string;
      stoppedAtChapterIndex: number;
      status: "IN_PROGRESS" | "UNREAD";   // why this chapter was picked — a READ chapter is never a resumePoint candidate
      recordedAtEpochMs: number | null;    // duplicated on purpose from list[stoppedAtChapterIndex].pages.resumePoint.recordedAtEpochMs, for convenience
    } | null;   // null only when every chapter in `list` is READ (nothing left to resume — "reread" state)
                // Resolution cascade (2 levels, deliberately simpler than the old
                // computeContinueChapter's 3-level cascade): first IN_PROGRESS chapter in
                // order → else first UNREAD chapter in order → else null. The old 3rd level
                // (a "reread threshold" grey zone for chapters marked READ near the page-count
                // boundary) was dropped — it's redundant with the 98% effectively-read
                // threshold already applied at write time (readStatus should already be
                // correct by the time it's read here), not a business rule to preserve.
    list: ChapterResult[];   // built by Series (Kotlin) calling the Chapter domain module
                              // directly — same-layer composition, not RN orchestration (R1)
  } | null;   // "Necessary", not "Vital": a series can legitimately have zero chapters
              // published yet ("coming soon") — that's chapters.list=[] (R10 category 3), a
              // real state, not an error. chapters=null instead means the whole
              // Series→Chapter call failed outright.

  // Aggregating — always null on absence, never escalates, never blocks the rest of the contract.
  otherNames: {
    original: string | null;    // server — originalName
    localized: string | null;    // server — localizedName
  } | null;
  sortName: string | null;        // server — sortName

  otherIds: {
    aniListId: number | null;
    malId: number | null;
  } | null;

  colors: {
    primary: string | null;
    secondary: string | null;
  } | null;

  // Requires a SECOND network call to the same server (SeriesMetadataDto, a separate real
  // endpoint from the one that returns the fields above) — accepted as worth the extra request,
  // same precedent as Page's dimensions requiring their own call.
  metadata: {
    description: string | null;
    genres: { id: string; name: string }[] | null;   // kept id+name, not just name (earlier code discarded GenreDto.id — a real finding from the Series survey, corrected here)
    tags: { id: string; name: string }[] | null;       // same correction for TagDto.id
    publicationStatus: "OnGoing" | "Hiatus" | "Completed" | "Cancelled" | "Ended" | null;   // real PublicationStatus enum
    ageRating: {
      rating: string | null;   // real AgeRating enum: Unknown/RatingPending/EarlyChildhood/Everyone/G/Everyone10Plus/PG/KidsToAdults/Teen/Mature15Plus/Mature17Plus/Mature/R18Plus/AdultsOnly/X18Plus/NotApplicable
      system: "ESRB";           // grouped with `rating` (not a bare string) so a future second rating system doesn't require breaking this field — today only one exists
    } | null;
    releaseYear: number | null;
    language: string | null;
  } | null;

  resolvedAtEpochMs: number;
  server: ServerDescriptor;
  cache: CacheDescriptor | null;
}
```
Note: `fileFormat`/`MangaFormat` (see Chapter's `pages.fileFormat` above) also exists on the
real `SeriesDto` — deliberately **not** added to `SeriesContract`; the user judged it
unnecessary at this level. Not an oversight, a considered exclusion (unlike `LibraryType`, which
is excluded because it belongs to a different domain — see Open/rejected).

**Kavita API notes** (for context, not decisions): a chapter's page list has no per-item network
endpoint (only a whole-series batch call exists — see R7). A dedicated `kavita-api` skill
(`.claude/skills/kavita-api/`, sourced from Kavita's real OpenAPI spec) became available and was
used to confirm the real `ChapterDto`/`SeriesDto`/`ProgressDto` schemas directly — superseding
the earlier indirect web-search-based investigation. Confirmed real fields not previously in
this contract: `Range`/`SortOrder`/`MinNumber`/`MaxNumber`/`IsSpecial`/`Title`/`VolumeId`/
`CreatedUtc`/`Created`/`ReleaseDate`/`LastModifiedUtc`/`CoverImage`/`CoverImageLocked`/
`LastReadingProgressUtc` (now confirmed real, not just a search snippet) all exist on the real
`ChapterDto`, alongside much richer per-chapter metadata (`Summary`, `WordCount`, `AgeRating`,
`Writers`/`CoverArtists`/etc.) not modeled here — deliberately not added without the user
reviewing them first (large surface, not all of it necessarily useful at this level). Real
`ProgressDto` (`get-progress`) confirmed as `{volumeId, chapterId, pageNum, seriesId, libraryId,
bookScrollId?, lastModifiedUtc}` — `pageNum` is `int`, confirmed 0-indexed via independent
source (DeepWiki analysis); `bookScrollId` (a possible finer-than-page reading position) exists
on the real schema but was **not** incorporated here — flagged as an open question, see
Open/rejected.

## Library — no Layer 3 contract exists; it's a Series listing operation + Layer 4 Service

**Date:** 2026-08-21 (Library survey/mini-iteration)

**Finding (Task 006 survey):** today "Library" in the app is entirely `KavitaSeriesFeature.
listSeries()` (a batch fetch of *all* series) plus in-memory-only caching in `LibraryModule.kt`
(2-minute TTL, no Room table, doesn't survive process restart) — there is no distinct Library
domain logic being applied anywhere; it's `Series[]`, full stop. Confirmed the real Kavita API
does have a genuine multi-library concept (23 endpoints, rich `LibraryDto` with
`type: LibraryType` — 6 real values: `Manga`/`Comic`/`Book`/`Image`/`LightNovel`/`ComicVine`),
used server-side to apply the right parsing rules/reading defaults/metadata provider per
content type — but **none of that exists in the app today**: no `libraryId` anywhere, no
library selector, `listSeries()` queries across all libraries indistinctly.

**Decision (per R1 — Layer 3 is optional per domain):** no `LibraryContract` is modeled.
"Library" is a **listing operation on the Series module itself** (Layer 3, e.g.
`Series.listAll()` returning `SeriesResult[]`), consumed by a Library **Service** (Layer 4) that
applies sort/filter/aggregation client-side for the screen — this mirrors exactly what the app
already does today, rather than inventing a Layer 3 domain that doesn't structurally exist.

**Future extensibility, deliberately deferred, not designed now:** if multi-library filtering
is ever needed, it becomes a **parameter** on the Series listing operation (e.g.
`Series.listAll(libraryId?)`), not a new contract shape to retrofit — because there's no
`LibraryContract` to redesign in the first place. `FollowingScreen.tsx` (confirmed to already
exist, not just planned) is evidence this pattern already works: it's 100% the same Series
listing pipeline with a client-side filter on top, no separate contract.

## Provider name becomes data, not hardcoded UI copy (connects Task 007's finding to `ServerDescriptor`)

**Date:** 2026-08-21 (Task 007 findings review)

**Finding this responds to (Task 007):** `ConfigScreen.tsx`/`SetupScreen.tsx` hardcode "Kavita"
throughout — state names, UI copy, `i18n/strings.ts` translation keys (`configKavitaServers`,
`setupApiKeyLabel: 'Kavita API Key'`, etc.). Judged **not** a violation worth fixing by renaming
(that's a product/copy decision, the screens genuinely manage Kavita servers today) — but the
user identified a better fix: don't rename the copy, make the *name itself* data instead of
code.

**Decision:** the Layer 2 provider-abstraction module (the plugin manager — Task 002/014) is the
one place that knows every installed provider's real name. Screens (Layer 5) stop hardcoding
"Kavita" as a literal string in code — the name is supplied *as data* from that same Layer 2
abstraction, the same source that already feeds `ServerDescriptor.type` inside every Layer 3
domain contract (`PageContract`/`ChapterContract`/`SeriesContract`). Today, with only one
provider installed, the UI still reads "Kavita" — nothing changes visually. The difference is
structural: swapping or adding a provider in the future means changing what the Layer 2 module
returns, never touching `ConfigScreen.tsx`/`SetupScreen.tsx`/`strings.ts` — "as transparent as
swapping the plugin," in the user's words.

**Connects two things that were modeled separately without this link being explicit before:**
`ServerDescriptor` (used inside Page/Chapter/Series contracts to say "which server answered
this") and the config/setup screens (which need to say "which server is the user managing") are
the same underlying data, sourced from the same Layer 2 module — not two separate naming
problems.

**Not designed here — implementation detail for Task 012/014:** the exact shape of "provider
display name" as exposed by the manager module (e.g. part of `ServerDescriptor` itself, or a
separate lookup), and how `ConfigScreen`/`SetupScreen` consume it. This entry only fixes the
principle (name is data from Layer 2, not code in Layer 5), not the exact interface.

**Applies to:** Task 012 (additional DataSources — `AuthDataSource`/`UrlSource` candidates from
Task 007) and Task 014 (plugin manager module design) — both should account for "expose the
provider's display name" as a requirement, not just data-fetching operations.

## Implementation order: bottom-up (Layer 0 → 5), never top-down

**Date:** 2026-08-21

**Decision:** confirmed by the provider-name-as-data finding above (a concrete case where Layer
5 literally cannot work correctly without Layer 2 already existing and supplying real data) —
implementation must proceed **Layer 0 → 1 → 2 → 3 → 4 → 5**, never starting from a higher layer
and mocking what's below. This isn't a new rule, it's the practical consequence of R1's access
rule (a layer needs the one below it to be real, not stubbed, for its own behavior to be
correct) — recorded here explicitly as guidance for whoever picks up implementation work later
(a different session from this planning one), with two amendments from the user:

**Amendment 1 — incremental migration, always backward-compatible until cutover.** Never
replace an existing function/method in place. Two sub-cases, depending on what's actually wrong:

- **Wrong name** (the function/module itself needs a different identity, e.g. `KavitaAuthFeature`
  → `AuthDataSource`): add the new, correctly-named version **alongside** the old one — callers
  migrate to it gradually — and delete the old one only once nothing calls it anymore. Never a
  big-bang swap that could break the app mid-migration.
- **Right name, wrong/incomplete shape** (the function's identity is already correct, but its
  return shape needs to grow to match a newly-modeled contract): do **not** duplicate the
  function's *public* name just to change its shape. Either (a) add a parameter that opts into
  the new shape (old callers keep calling without it, unaffected), or (b) extend the current
  shape with the new fields alongside the old ones — existing callers simply ignore fields they
  don't read yet, nothing breaks — then migrate callers to the new fields over time, and only
  remove the stale/old fields once nothing reads them anymore. **Concrete pattern for this
  sub-case**: split the implementation into private `_old`/`_new` helper functions, with the
  original public function reduced to a thin dispatcher (an `if`/parameter check routing to
  whichever helper applies) — the public name and signature stay stable the whole time, no
  caller outside the module needs to know a migration is happening. Cutover is then just:
  delete `_old`, rename `_new` to take over as the dispatcher's only body (or the public name
  directly, if the dispatcher itself becomes unnecessary).

**Amendment 2 — Layer 3 contracts modeled in this plan are "base" shapes, not turnkey.** During
implementation, expect to build a number of auxiliary functions/methods that each populate or
expose only *part* of a modeled contract (`PageContract`/`ChapterContract`/`SeriesContract`) —
not the whole contract assembled in one shot. Layer 3's actual job during implementation is to
"assemble the pieces" these auxiliary methods produce into the final contract shape already
agreed on in this design-notes file — the contract shapes here are the target, not a
prescription for how the supporting code underneath gets built.

**Applies to:** all future implementation work stemming from this plan (Tasks 012 onward,
Phase 4 corrections, and beyond) — not a modeling-phase decision, a standing implementation
guideline.

## Task 012 — Task 007's 3 findings resolved: none get their own `DataSource`; 2 absorbed by the Server manager module, 1 becomes its own module

**Date:** 2026-08-21 (Task 012 mini-iteration)

**1. `KavitaAuthFeature`/`UserDto`** — stay as an internal implementation detail of the Kavita
plugin (Layer 1). No `AuthDataSource` is modeled. The Server manager module (Layer 2, designed
in Task 014) uses them internally and exposes a generic surface outward (e.g. "is
authenticated?") — nothing outside Layer 1/2 needs to know Kavita's specific auth endpoint/flow.

**2. `KavitaUrlSelector` — corrected, does not stay Kavita-specific at all.** Verified against
real code (`KavitaUrlSelector.kt:1-51`): it reads **every** `ServerConfigDao` entry (multiple
registered URLs that can point at the *same* logical server — e.g. a LAN IP and an external
domain) and delegates to an already-generic, already-reusable tool
(`com.mymangareader.tools.network.UrlSelector`) to pick the active/healthy one. This is about
multiple network paths to one server, **not** merging multiple distinct data sources (a
different idea the user explicitly ruled out). **Decision: `KavitaUrlSelector` as a class is
removed entirely** — URL selection moves up directly into the Server manager module (Layer 2),
which reads `ServerConfigDao` (already provider-agnostic — it stores a URL plus which
provider/server that row belongs to, e.g. Kavita, BFF, etc.) and calls the generic `UrlSelector`
tool itself. No provider-named class remains in this path at all.

**3. `BffFeature`** — becomes its **own separate module**, not folded into the Server manager
module. Rationale (user's own framing): BFF serves a conceptually different purpose (external
metadata/enrichment correlated by the content server's id, not reading content itself) —
distinct enough from the Server module's job (serving readable content: pages/chapters/series)
to warrant its own module identity, even though it can reuse the same underlying patterns
(`DataSource`-style abstraction, `ServerConfigDao`). Exact name not decided here (candidates
mentioned in conversation: "External Metadata module" or similar) — left for Task 014 or
whichever task actually designs it, since it depends on the Server manager module's shape
being settled first.

**Applies to:** Task 012 (closes with these 3 decisions — no new contract/DataSource is
designed in this task itself) and Task 014 (Server manager module design — absorbs findings 1
and 2 directly into its own scope; finding 3 is flagged as a sibling module to design, not part
of Task 014's own module).

## Task 013 — The 3 communication mechanisms, formalized

**Date:** 2026-08-21 (Task 013 mini-iteration)

**Revised model (supersedes the original "Kotlin can broadcast to RN" framing for
*requested* actions):** Kotlin never broadcasts as a response to something RN asked for.
Whichever RN code initiated an action (RPC call or an imperative `ref` call) receives the
result/confirmation **directly** — never "whoever happens to be listening." If other parts of
the app need to know, propagating that is the **RN caller's own job**, via the RN→RN mechanism
(the `EventBus`, see below) — not something Kotlin decides or does. This fixes the real
ambiguity that caused the documented race bug (Task 021): today's mixed channel (Kotlin
broadcasting both "spontaneous observation" and "confirmation of a requested action" on the
same `NativeEventEmitter`) makes it hard to tell whether an incoming event is a response to an
in-flight request or an unrelated spontaneous one. There is no Kotlin-to-Kotlin broadcast
either — broadcast/multi-listener capability only exists on the RN side (JS `addListener`
semantics), so Kotlin genuinely has no "broadcast" primitive of its own to begin with.

**Mechanism 1 — RN→Kotlin, always request → execution → response, one single shape, no
exceptions.** User's explicit correction: every RN→Kotlin interaction — including what
replaces the "one-shot state" fix for the Reader's scroll — is `@ReactMethod` + `Promise`.
There is no separate "imperative `ref` call" shape.

**Why the earlier "ref call" framing was wrong, technically:** React Native has two real ways
for RN to command a native *view* (as opposed to a module): (a) `UIManager.
dispatchViewManagerCommand` / a raw `ref` command — fire-and-forget by platform design, no
native Promise available on that path; or (b) a normal module method (`@ReactMethod`) that
internally commands the view and only resolves its `Promise` once the view actually confirms
completion. Decision: always (b). The Reader's scroll-to-page fix is not "call the view via
ref" — it's `readerModule.scrollToPage(chapterId, pageIndex): Promise<void>`, a regular module
method that happens to command a native view internally, resolving only when the view reports
the scroll actually completed. This is what eliminates the race bug (Task 021) — not because a
`ref` is imperative, but because the state field is gone and the caller gets a real, scoped
response instead of guessing from a shared `NativeEventEmitter` channel.

- Example: `readerModule.scrollToPage("20506", 27)` → returns a `Promise<void>` that resolves
  once the native view confirms the scroll landed. RN asks, Kotlin executes and confirms
  directly back to the caller. Nothing else in the app is told automatically.

**Mechanism 2 — Kotlin→RN (`NativeEventEmitter`, multi-listener) — reserved for events Kotlin
observes on its own, never requested by RN.** This is the one case where "broadcast" genuinely
applies, because it's not a response to anything — it's Kotlin reporting something that
happened independently of any RN request (e.g. the user physically scrolling with their
finger). Any number of RN listeners may subscribe directly via `addListener` — no intermediary
needed, this already works today (e.g. `onVisiblePageChanged` during natural scroll).
- Example: user drags the reader with their finger (no RN request behind it) →
  `onVisiblePageChanged(chapterId, pageIndex, pageFraction)` fires → the Reader screen and any
  other screen/service that independently subscribed all receive it directly.

**Mechanism 3 — RN→RN (`EventBus`) — new, built from scratch, for events with no native
origin at all.** A generic, reusable **tool** (Layer 3, not domain-specific), not tied to
Reader/Series/any single domain. Publish/subscribe with no central event registry file — each
event is declared as a typed **token** wherever makes sense in the codebase (near whichever
domain first needs to emit it), carrying its own payload type; anyone who wants type safety on
the listening side imports that same token's type. Event-naming convention deliberately
deferred to whenever each real event is created, not fixed in the abstract now.

```typescript
// event-bus/contract.ts — the generic tool itself, knows nothing about any domain
interface EventToken<TPayload> {
  readonly name: string;
}

function createEvent<TPayload>(name: string): EventToken<TPayload> {
  return { name };
}

interface EventBus {
  emit<TPayload>(event: EventToken<TPayload>, payload: TPayload): void;
  on<TPayload>(event: EventToken<TPayload>, handler: (payload: TPayload) => void): () => void; // returns unsubscribe
}
```

```typescript
// Example: declared near whoever first needs it (e.g. inside the module that
// syncs reading progress to the server), not in a central app-wide event file.
interface ProgressCheckpointSavedPayload {
  chapterId: string;
  pageIndex: number;
}
export const ProgressCheckpointSaved = createEvent<ProgressCheckpointSavedPayload>(
  "progressCheckpointSaved"
);

// Usage — the server-sync module, after successfully sending a checkpoint to the
// server (an RN→Kotlin RPC call it made and got a direct response to), decides on
// its own to tell the rest of the app:
eventBus.emit(ProgressCheckpointSaved, { chapterId: "20506", pageIndex: 27 });

// Any unrelated part of the app can subscribe without knowing who emits it:
eventBus.on(ProgressCheckpointSaved, (payload) => {
  updateContinueReadingBadge(payload.chapterId, payload.pageIndex);
});
```

**`EventToken` deliberately kept minimal (`{ name: string }`) for now** — no auto-generated
unique id, no central registry. User's explicit call: don't over-design a contract with no real
use case behind it yet; the token's exact shape gets revisited once a real event actually needs
to be built, informed by that concrete case rather than decided in the abstract.

**Applies to:** Task 013 (all 3 mechanisms formalized here) and Task 021 (Reader — consumes
Mechanism 1's `ref`-based fix directly, resolving the documented race bug).

## Task 014 — Server manager module: structural design

**Date:** 2026-08-21 (Task 014 mini-iteration, in progress)

**General rule this section is built on (record explicitly — applies beyond just Server):
"a plugin lives together with the module that understands it."** A Layer 1 plugin is never a
loose/shared/globally-accessible folder — it lives physically nested inside the Layer 2 module
that knows how to translate it, not in a neutral shared location. This is a structural
reinforcement of R1's access rule, not just a naming convention — putting the plugin where only
its owning module can naturally reach it makes an accidental out-of-layer import visibly wrong
just from the folder structure, not only from a rule someone has to remember.

**Illustrative structure (file/interface names below are examples to convey the shape — not a
final naming decision):**

```
Server/
  plugins/
    <SharedPluginContract>        — the interface every content-provider plugin adapter must satisfy
    kavita/
      (raw plugin implementation)  — Layer 1, physically nested inside Server's own module,
                                      not a sibling top-level folder
      <KavitaAdapter>               — translates the raw Kavita implementation above into
                                      <SharedPluginContract>'s shape; the translation lives here,
                                      in Layer 2, not inside the raw plugin itself
    index                          — exports available adapters
  <Server>                        — chooses which adapter is currently active, delegates calls;
                                      knows nothing about any single provider's translation details
  index                           — the module's single export surface to the rest of the app
```

**Key principle confirmed:** the raw plugin (`kavita/`'s own code) never knows the shared
interface exists — it only exposes its own native way of working. Translation into the generic
contract happens in the **adapter file**, which lives in Layer 2 (inside `Server/plugins/`),
not inside the raw plugin and not by making the raw plugin implement an externally-defined
interface directly. The module doing the active-provider selection (`<Server>` above) never
sees translation details of any adapter — it only knows which one is active and delegates.

**This resolves the "does the module need to support N providers from day one" question
naturally**, without deciding it as a separate tradeoff: because raw plugin, adapter, and
selection logic are already three separate concerns, adding a second content provider later is
just adding a parallel `plugins/<newProvider>/` folder with its own adapter — no redesign
needed regardless of how many providers exist today (currently one: Kavita).

**Not yet decided — still in progress, do not treat as closed:** validation against the
BFF/Notifications backlog cases, and whether every domain needs this full pattern or simple
domains can keep a plain `DataSource`. The manager module's own exposed contract (the 4
original operations) is resolved below.

## Task 014 (continued) — the manager module's exposed operations, simplified from 4 to 1 real shape

**Date:** 2026-08-21 (Task 014 mini-iteration, continued)

**Background:** the task's original 4 operations ("list available implementations," "get
active one," "explicitly select one," "register a new one") were each walked through with a
concrete example before deciding what's real today vs. speculative.

- **"List available implementations"**: today, only **Kavita** — BFF is excluded (it's its own
  separate module per Task 012's decision, not a content-provider implementation this manager
  handles). Confirmed as scope knowledge, not a runtime function that needed independent design.
- **"Explicitly select one" / "register a new one"**: **deliberately deferred entirely** — same
  philosophy as the `EventBus` (Task 013): don't design a shape with no real second
  implementation to validate it against. Revisit when a real second content-provider plugin
  actually needs to be added.
- **"Get active implementation"**: **does not exist as a standalone operation.** `Server`
  exposes domain methods **directly** (e.g. `Server.getChapter(id)`, `Server.getSeries(id)`) —
  there is no separate "give me the active provider, then call a method on it" two-step. Which
  provider is active is resolved transparently inside each domain method call.

**Corrected responsibility split within that call chain (user correction — get this precise):**

```
Server.getChapter(id)
```
- `Server` (Layer 2, the facade) knows **only routing** — which provider is currently active —
  and delegates to that provider's adapter. It **never** knows how to actually fetch a chapter;
  it has zero domain knowledge of any specific provider.
- The delegation target, e.g. `Kavita.getChapter(id)` (the **adapter**, inside
  `Server/plugins/kavita/`, still Layer 2) — this is where the real domain understanding lives:
  the specifics of how to fetch a chapter *from Kavita*, translated into the shared contract.
  This matches the precedent already true today for `ChapterDataSource`/`KavitaChapterFeature`
  — domain intelligence has always lived in the concrete adapter, never in a generic routing
  layer.
- The adapter then calls the raw Kavita plugin (Layer 1, physically nested inside
  `Server/plugins/kavita/`), using that plugin's own native format — the raw plugin never knows
  the shared contract exists.

**Future "select explicitly" shape, sketched only as a hint for later (not designed now):**
something like `new Server(providerName)` or an equivalent constructor/parameter — not a
separate method call — was mentioned in conversation as a plausible direction, but this is
explicitly not a commitment; revisit for real once needed.

**Applies to:** Task 014 (closes the "operations" part of the design — 3 of the original 4
operations are resolved as either not-needed-as-standalone-functions or deliberately deferred;
only "get active"/direct domain methods on `Server` is a real, now-designed shape).

## Task 014 (continued) — `Server`'s public API is independent of the adapter interface's shape; plus infrastructure-only methods

**Date:** 2026-08-21 (Task 014 mini-iteration, continued)

**Two things confirmed here, both corrections to an implicit assumption the agent was making
(that `Server`'s methods would just mirror the adapter interface 1:1):**

1. **The generic adapter interface (e.g. `ContentPlugin.getChapter(id)`) is an *internal*
   contract — between `Server` and its adapters — not a promise about `Server`'s own public
   API.** `Server` knows the interface well enough to call it correctly when delegating, but is
   free to expose its own public surface under different names/shapes, designed for whatever is
   most ergonomic for the rest of the app to consume. Example: the adapter interface may declare
   `getChapter(id)`, while `Server`'s actual public method is `getChapterById(id)` — internally
   calling `activeAdapter.getChapter(id)` — no obligation to mirror the name.

2. **`Server` can also have methods that have no adapter/interface counterpart at all** —
   infrastructure-level operations about the module itself, not about any content-provider
   domain. Example: `Server.getActiveUrl()` — resolved purely via the internal `UrlSelector`
   tool (absorbed from the old `KavitaUrlSelector`, per Task 012's decision), with no adapter
   or `ContentPlugin` interface involved at all. The generic adapter interface only needs to
   cover what adapters actually need to implement (domain methods like `getChapter`) — it's not
   meant to be an exhaustive description of everything `Server` can do.

**Applies to:** Task 014 — `Server`'s public API design is explicitly decoupled from the
adapter interface's shape; both are legitimate, coexisting parts of the same module.

## Task 014 (continued) — the pattern generalizes: every Layer 1 plugin category gets its own Layer 2 "generalizer" module, `Server` is just the first instance

**Date:** 2026-08-21 (Task 014 mini-iteration, continued — validates the design against
backlog 011/008 per this task's original steps)

**Validated against both anticipated backlog cases, confirming the pattern (not a special
case for content):**

- **Backlog 008 (Notifications, multiple providers — e.g. ntfy, a future Firebase)**: same
  exact structure — `Notifications/plugins/ntfy/` (Layer 1 nested inside), an internal adapter
  interface, `Notifications.sendX()` as the public API. No real difference from the content
  case identified — same shape, different domain.
- **Backlog 011 (BFF plugin, multiple `MetadataSource`)**: BFF becomes a plugin of its own
  generalizer module (`MetadataSource`, per Task 012's decision that it's a sibling module, not
  folded into `Server`) — same structural pattern again.

**General rule this confirms:** any Layer 1 plugin category needs a corresponding Layer 2
"generalizer" module. `Server` (content providers) is not special — it's simply the first
generalizer this plan designed. The same shape repeats: `<Generalizer>/plugins/<pluginName>/`
(Layer 1 nested), an internal adapter interface plugins implement, and the generalizer's own
public API (independent of that interface's shape, per the entry above). Future functionality
categories follow the same generalizer pattern, not a bespoke design each time.

**Applies to:** Task 014 (closes the backlog validation step) — and any future task designing a
new plugin category (Notifications, MetadataSource/BFF, or anything else) should reuse this
shape rather than re-deriving it.

## Task 014 (final) — the full generalizer pattern is always used for any external connection; the trigger is "talks to the outside," not "expects 2+ providers"

**Date:** 2026-08-21 (Task 014 mini-iteration, closing)

**Decision:** the full pattern (Layer 1 raw plugin nested inside a Layer 2 generalizer module,
internal adapter interface, generalizer's own independent public API) is **always** used for
anything that connects to something outside the app — never conditional on whether multiple
implementations are expected today or likely later. The deciding question is **"does this talk
to the outside world?"**, not "how many providers might this ever have." Even a domain that
will plausibly only ever have one real implementation still gets the full structure if it's an
external connection — consistency over structural economy, by explicit user choice.

**The inverse also confirmed:** something that lives entirely *inside* the app (no external
connection) should **never** become a Layer 1 plugin in the first place — Layer 1 is reserved
for genuine outside-world boundaries, not an organizational pattern applied to internal code.

**Applies to:** every future domain-contract or module-design task in this plan — whenever a
new external connection point is identified (any task, not just Task 014), it gets the full
`<Generalizer>/plugins/<name>/` structure from the start, no smaller/simpler variant considered
first.

## Task 015 — Cache guideline: `Cache` (Kotlin) + `CacheManager` (RN), orchestration moves to RN

**Date:** 2026-08-21 (Task 015 mini-iteration)

**Findings that motivated this (Task 015 audit):** `LibraryModule.kt` caches the series list in
`@Volatile var` fields (2-min TTL, does not survive process restart) — the only real gap; every
other domain expected to survive offline/restart already uses Room (`series_detail_cache`,
`chapter_cache`, `page_cache`, plus `reading_progress`/`followed_series`/`ui_preferences`/
`series_sort_prefs`/`bff_match`/`server_config`/`auth_config`). Orchestration (cache-first, then
network) is decided today by the RN hook (`useSeriesDetail.ts`), calling two independent native
methods per domain (`getX`/`getCachedX`) — except one exception, `KavitaChapterFeature.
getPageUrls`, which already arbitrates cache-vs-network internally in Kotlin as a single method.
No `Repository` layer exists on either side today.

**Decision — two new generic modules, one per side, replacing every domain's ad-hoc cache code:**

- **`Cache` (Kotlin, Layer 2)** — dumb, generic get/put/invalidate by key. Knows nothing about
  any domain (Series/Chapter/Library). Two backends selected by `mode`:
  - `PERSISTENT` → a single generic Room table (not one table per domain).
  - `VOLATILE` — lives on the RN side instead (see `CacheManager` below), never touches Kotlin at
    all. `Cache` (Kotlin) only ever implements the `PERSISTENT` backend.
- **`CacheManager` (RN)** — the single, generic orchestrator every domain Service/hook calls,
  replacing the per-domain "hook decides cache-then-network" pattern. Knows how to resolve *any*
  cache — `PERSISTENT` (delegates to the Kotlin `Cache` module via the bridge) or `VOLATILE`
  (resolved entirely in RN memory, no bridge call). The caller never needs to know which backend
  a given descriptor uses.

**`CacheDescriptor` is the single shared contract, not two parallel types.** It's created at
Layer 2 (Kotlin), travels up already embedded inside a domain contract's `cache` field
(`PageContract.cache`, `ChapterContract.cache`, `SeriesContract.cache` — R2), and is the same
object the RN Service/hook later hands to `CacheManager` when it needs to resolve/refresh that
same cached value — never a separate descriptor invented in RN. Current shape (extends the
placeholder already in `cache/contract.ts`):
```typescript
export interface CacheDescriptor {
  key: string;
  mode: "PERSISTENT" | "VOLATILE";
  cachedAtEpochMs: number | null;
}
```

**`CacheManager`'s two operations** — two separate functions, not one function with an optional
event flag (deliberate, mirrors R8's "no optional-shape params" spirit):
```typescript
interface CacheManager {
  resolve<T>(descriptor: CacheDescriptor, fetchFn: () => Promise<T>): Promise<T>;
  resolveAndDispatch<T>(descriptor: CacheDescriptor, fetchFn: () => Promise<T>, event: EventToken<T>): Promise<T>;
}
```
Both: return the cached value immediately if present, trigger `fetchFn()` in the background, and
write the result back into the cache (via `Cache` if `PERSISTENT`, in-memory if `VOLATILE`) once
it resolves. `resolveAndDispatch` additionally emits `event` (Mechanism 3, Task 013's `EventBus`)
once the fresh value lands, for callers elsewhere in the app that need to react without polling.
`resolve` never emits anything — for callers where only the original requester needs the result.

**Deliberately deferred, same philosophy as `EventToken` (Task 013) — do not over-decide now:**
- **Whether a given field/domain is `PERSISTENT` or `VOLATILE`** is not classified in the
  abstract here. That call is made per-field only when someone actually implements/manages that
  specific data — not a table drawn up now for every existing contract.
- **`CacheDescriptor`'s exact final shape** — the 3 fields above are a good working base, not
  necessarily final; expect it to grow once a real implementation case demands a new field.

**Registered as `architecture.md` guideline, not a `CLAUDE.md` invariant** (user's explicit
call) — this is a structural design decision with enough nuance/examples to need prose, not a
short hard rule.

**Applies to:** Task 016 (Library correction — the motivating gap, migrates off `@Volatile var`
onto this pattern) and any future domain needing cache, which should reuse `Cache`/`CacheManager`
rather than inventing its own ad-hoc mechanism.

## Task 021 — RN Services layer: namespace convention, file naming, read/write split, object args, `bound()`

**Date:** 2026-08-24 (Task 021 mini-iteration — long session, several intermediate designs
superseded; this entry reflects only the final state actually implemented)

**File/folder naming convention, project-wide from now on (not Task-021-specific):**
`nome.type.ext` (e.g. `pages.services.ts`, `pages.tests.ts`), folders/files always plural even
when a domain's real operations are singular-only (e.g. `pages/pages.services.ts`, not
`page/page.services.ts`). Tests live beside the file they test, not in `__tests__/` — that older
pattern stays untouched on the 37 existing files (no retroactive migration), applies only to new
code from this task onward. `index.ts` never contains logic, only re-export
(`export * from './x.services'`) — enforced by convention, and excluded from coverage
(`coveragePathIgnorePatterns` generalized from `/src/index\.ts$` to `/index\.ts$` in
`frontend/package.json`). Jest's `testMatch` was extended (not replaced) to recognize
`*.tests.ts` alongside the pre-existing `__tests__/*.test.ts`.

**Namespace convention: plural = batch operation, singular = single-item operation, both can
live in the same file.** A domain's folder/file is always plural
(`serials/serials.services.ts`), but it exports two separate consts when both shapes of
operation exist: the plural const (`SerialsService`) holds only batch operations (`list`), the
singular const (`SerialService`) holds only single-item operations (`get`/`getFull`/...). A
domain with no batch operation today only exports the singular const — no empty plural namespace
is created speculatively (e.g. `pages/pages.services.ts` only exports `PageService`, since there
is no batch page-fetch operation on the bridge yet).

**Every exported namespace name ends in `Service`.** `PageService`, `ChapterService`,
`SerialService`/`SerialsService`, `ServerService`/`ServersService` — final correction after
iterating on bare names (`Server` alone was flagged as a possible future collision with the
Kotlin `Server` class from `:server`). Folders/files stay bare (`services/pages/`, not
`services/page-service/`) — only the exported const carries the suffix.

**Every method that takes more than zero arguments takes exactly one named-argument object —
never positional parameters.** E.g. `ChapterService.get({ seriesId, chapterId })`,
`ServerService.group.update({ groupId, name?, credentialsJson?, healthCheckPath? })`. Decided
specifically so `Methods.bound()` (below) can merge in fixed fields generically without knowing
each method's parameter order/count. A method with truly zero parameters (`ServerService.
group.active.get()`) stays parameterless — there's no object to merge fields into.

**`full: boolean` becomes two named methods, not a field.** Every bridge operation that took a
`full` flag (`getChapterDigest`, `getSeriesDigest`) is exposed as `get(...)` (always
`full=false`) and `getFull(...)` (always `full=true`) — never a boolean passed through.

**Binary bridge writes (e.g. `setChapterRead`) become 3 public methods, not 1.** `isRead:
boolean` on the bridge becomes: `status.set({..., isRead})` (the one that actually calls the
bridge), plus `read({...})` and `unread({...})` as convenience wrappers that call `status.set`
with `isRead` already filled in. All 3 stay exported — the user explicitly wants both the
self-documenting shortcut *and* the explicit-boolean form available, never just one.

**`raw` is the single root namespace for direct, non-Digest bridge reads.** Every method that
reads straight from `ServerBridge` (bypassing `:content-digest` entirely — no computed/
aggregated fields) lives under `<Service>.raw`, never mixed into other namespaces
(`status`/`progress`/`chapters`). E.g. `ChapterService.raw.get` (→ `ServerBridge.getChapter`),
`PageService.raw.dimensions`/`raw.url`, `SerialService.raw.get` (→ `getSerial`) and
`SerialService.raw.chapters.list` (→ `listChapters`, nested because it's chapters-of-that-series).

**Isolation rule: a Service only ever calls its own bridge file(s) — `DigestBridge` and/or
`ServerBridge`.** `SerialService` never imports `ChapterDigest`/`ChapterService` directly, even
though `SeriesDigest` already embeds `chapters.list: ChapterDigest[]` (built by Kotlin inside
`buildSeriesDigest`) — if a future Service needs data it doesn't already have embedded, it calls
the other **Service**, not the other bridge/digest directly. This governs what the RN Service
*code* is allowed to import/call — it does **not** mean `SeriesDigest`'s already-embedded
`chapters.list` gets stripped out or re-fetched in a loop. The bridge's own aggregated payload is
returned as-is.

**Read/write split — Digest-backed reads and direct `ServerBridge` reads/writes now coexist in
the same Service, per domain.** Earlier in this task, `get`/`getFull` (Digest) were considered
the *only* thing these Services would own, with mutations staying on the pre-Digest bridges
(`SeriesBridge`, `ReaderChapterBridge`, `LibraryBridge`) forever. That framing changed once it
became clear `ServerBridge` (Task 017's `Server` module) already exposes real, working writes
(`setChapterRead`, `setChaptersRead`, `setChapterProgress`) and non-Digest reads (`getChapter`,
`getSerial`, `listChapters`, `getPageDimensions`, `getPageUrl`) that were simply never wired to
any RN Service yet. Final shape: each Service wraps **both** its Digest read(s) (`get`/`getFull`)
**and** whatever direct `ServerBridge` operations belong to that same domain (`raw.*`,
`status.set`/`read`/`unread`, `progress.get`/`set`) — the pre-Digest bridges
(`SeriesBridge.markChaptersRead`, `LibraryBridge.listSeries`, sort prefs, screen-control, BFF
sync) are untouched and still the only path for what `ServerBridge` doesn't cover at all.

**`SerialsService.list()` goes straight to `ServerBridge.listSerials()`, bypassing the Digest
entirely — there is no batch digest operation.** Returns the raw `PluginSerial[]`, no enrichment.
A caller needing the richer `SeriesDigest` per series (e.g. the Library screen) loops over the
ids this returns, calling `SerialService.get`/`getFull` once per id — the loop lives in the
consuming screen/hook, not inside `serials.services.ts` (same "loop belongs to whoever needs it"
call already made for Library back in Task 011).

**`servers/servers.services.ts` (Server management) — not in the original Task 014/021 scope,
added because Server will also front BFF operations in the future.** Namespace-by-resource, not
by-verb (`ServerService.group.get(...)`, not `ServerService.get.group(...)`). Full mapping:
- `ServersService.providers.list()` / `ServersService.groups.list()` — batch,
  `ServerBridge.listProviders`/`listGroups`, no arguments.
- `ServerService.group.{get,add,update,remove}` — single-group management. `add` deliberately
  takes no `groupId` (a group doesn't exist yet at creation time) — this is *why* it's excluded
  from `bound()` below.
- `ServerService.group.active.{set,get}` — was `setActiveGroup`/`getActiveGroupId` on the bridge,
  reorganized into a `active` sub-resource (same by-resource convention) once the flat verb names
  read oddly next to `group.get`/`group.update`. `active.get()` takes zero arguments.
- `ServerService.urls.{list,add,update,remove,validate}` — a group's registered URLs.
- `ServerService.auth.reauthenticate({groupId})` — `ServerBridge.reauthenticateActiveGroup`. No
  separate `Auth` Service was created — deliberately deferred, still under discussion; auth for a
  given server lives under that server's own `auth` sub-namespace instead of a cross-cutting
  module.

**`Methods.bound(target, skipKeys, fixed)` — generic object-merge binder, `shared/tools/methods/
methods.tool.ts`.** Recursively walks any Service object (any nesting depth) and returns an
equivalent object where every single-object-argument method accepts a *partial* version of its
own argument — the fields already present in `fixed` are merged in automatically (`{...fixed,
...(arg ?? {})}`), so a caller only supplies whatever remains, and can still override a fixed
field for one call by passing it explicitly. Not built on `Function.prototype.bind` (that only
works with positional parameters, which the "single object argument" convention above
deliberately moved away from) — it's a plain wrapper function per method. Two exclusions, both
by key name, both recursive:
- `'bound'` itself is always dropped, so a Service's own `bound(...)` doesn't get wrapped around
  itself (which would produce a meaningless bound-of-bound).
- `skipKeys` (2nd parameter, e.g. `['add']` for `ServerService.bound`) drops any other named key
  that structurally can't take the fixed fields — `ServerService.group.add` has no `groupId`
  parameter at all, so `ServerService.bound({groupId}).group` deliberately has no `add`.

Every domain Service exposes its own `bound(fixed)`: `PageService.bound({seriesId, chapterId,
pageIndex})`, `ChapterService.bound({seriesId, chapterId})`, `SerialService.bound({seriesId})`,
`ServerService.bound({groupId})`. No state beyond the fixed object itself — every call on a
bound object still hits `DigestBridge`/`ServerBridge` fresh, same as calling the Service
directly; `bound()` is pure convenience over repeating ids, never a cache.

**Explicitly paused, not rejected: derived/computed getters that read a field out of an
already-fetched Digest (e.g. a `readStatusOf(digest)`-style helper), and any Service returning
something other than a fresh bridge call.** The user's call, mid-task: keep every Service method
a real `DigestBridge`/`ServerBridge` call, nothing that only reprocesses data already in hand —
avoids conflating "convenience" with hidden state/caching before `CacheManager` (Task 023)
exists. Revisit only if the user asks again, informed by a real consumer's need, not speculatively.

**Applies to:** Task 021 (all 4 Services — `pages`, `chapters`, `serials`, `servers`) and every
future `shared/services/` addition, which should follow the same namespace/naming/isolation/
single-object-argument/`bound()` conventions rather than reinventing them per-domain.

## Task 022 — `ExternalMetadataServer` module: scope, name, and structural design

**Date:** 2026-08-24 (Task 022 mini-iteration)

**Scope confirmed: real migration, not a thin skeleton.** New code written from scratch,
inspired only by today's real `BffFeature.kt` (`android/features/src/main/kotlin/com/
mymangareader/features/bff/BffFeature.kt`) as a reference for what behavior needs to exist —
never copied/adapted from it, per the standing "never reuse old code in new modules" rule.
`BffFeature` is removed once the migration lands.

**Module: its own Gradle module, sibling to `:server` — reaffirms Task 012's decision.**
Considered keeping `ExternalMetadataServer` as a folder inside `:server`'s own Gradle module
(same "server" domain, less boilerplate), but rejected: a Gradle module is the real unit this
project's layer isolation (`core ← tools ← features`, and each generalizer's own boundary)
enforces via the compiler — an `internal` visibility inside one Gradle module means nothing to
a sibling folder in the *same* module. Folder-only separation would make `ExternalMetadataServer`
and `Server` able to reach into each other's `internal` details with nothing stopping it except
convention — exactly the kind of accidental-cross-import this project prefers to make
structurally impossible (same reasoning Task 014 already used to justify nesting a raw plugin
physically inside its owning generalizer's module, not a shared/loose folder). Reusing the same
plugin-contract pattern (`plugins/<provider>/`) is orthogonal to which Gradle module hosts it —
each generalizer gets its own internal contract regardless (`ExternalMetadataPlugin` is not an
extension/subtype of `ServerPlugin`).

**Names:**
- Gradle module: `:external-metadata-server`, package `com.mymangareader.externalmetadataserver`.
- Facade class: `ExternalMetadataServer` (deliberately not "BFF" — the class doesn't know it's
  serving a BFF-shaped provider, same as `Server` doesn't know it's serving Kavita).
- Provider id: `personalBff` — `ExternalMetadataServer/plugins/personalBff/`. Neutral technical
  identifier, not a personal/instance-specific name (respects the "no personal data in code"
  invariant) — the concern that motivated picking this name was never "is `bff` an OK label,"
  it was "does naming the provider expose something about my personal server" — resolved by
  `personalBff` denoting the *type* of provider (a personally-run BFF), never an actual
  URL/instance.

**Provider-name scope worry, resolved:** user asked how much today's one real `personalBff`
implementation's shape constrains adding a second metadata provider later. Same answer Task 014
already gave for `Server`/Kavita (which also only has one real provider today): the full
generalizer pattern is used regardless of provider count (the deciding question is "does this
talk to the outside world," not "how many providers exist"), and the **adapter**
(`plugins/personalBff/PersonalBffAdapter.kt`) is free to look exactly like `personalBff`'s real
API (`/manga` endpoint, `slug`/`kavita_id`/etc. fields) — it never needs to anticipate a second
provider. Only the **shared contract** (`ExternalMetadataPlugin`) needs care, and even that only
needs to cover what the current adapter actually exposes today (same "base shape, not turnkey"
rule as Amendment 2 above) — not a hypothetical second provider's needs. A future second
provider extends the contract then, not now.

**Data model: replicates `Server`'s `Group`/`Url` split, not `BffServerConfigEntity`'s current
flat shape.** `BffServerConfigEntity`/`BffServerConfigDao` (today, in `:core`) are flat — one row
is one URL, no group concept — mirroring the *old*, pre-Task-014/017 `ServerConfigEntity`/
`ServerConfigDao` shape (still present in `:core`, superseded for `Server` itself by
`ServerGroupEntity`/`ServerUrlEntity`). Decision: `ExternalMetadataServer` gets its own
`ExternalMetadataGroupEntity`/`ExternalMetadataUrlEntity` (new, in `:core`), structurally
mirroring `ServerGroupEntity`/`ServerUrlEntity` — not the old flat shape — because the BFF is
tied to a specific content server's identity (its whole reason for existing is correlating
metadata against a given server's series ids), so it needs the same two-level structure Server
itself has.

**Optional two-level link, BFF↔Server, both nullable:**
- `ExternalMetadataGroupEntity.linkedServerGroupId: String?` — when set, this metadata group is
  scoped to one specific `ServerGroup` (e.g. "my personalBff" linked to "My Kavita"). When
  `null`, this metadata group applies to **any** active server group (universal fallback).
- `ExternalMetadataUrlEntity.linkedServerUrlId: String?` — finer-grained, only meaningful when
  the owning group already has a `linkedServerGroupId`: when set, this specific metadata URL is
  scoped to one specific `ServerUrl` inside that linked server group. When `null` (but the group
  is linked), the metadata URL applies to any URL within that linked server group.
- This replaces `BffServerConfigEntity.linkedKavitaServerConfigId`'s single flat link with the
  same two-level shape as the rest of the entities.

**Plugin contract shape — no content tree, one real operation.** Unlike `ServerPlugin` (which
has a `serials/serial/chapters/chapter/page` tree because `Server` serves readable content),
`ExternalMetadataPlugin` has no content tree — today's real behavior is "given a batch of Kavita
series, return metadata matches," nothing else:
```
interface ExternalMetadataPlugin {
    val auth: ExternalMetadataAuth  // no-op is a valid implementation if personalBff has no auth
    suspend fun fetchMatches(kavitaSeries: List<SeriesSummary>): List<ExternalMetadataMatch>
}
```
`ExternalMetadataPluginRegistration` mirrors `ServerPluginRegistration` (`id`/`displayName`/
`version`/`credentialFields`/`factory`).

**Active-group resolution: explicit parameter from RN, not Kotlin↔Kotlin broadcast — for now.**
User's first instinct was "Server fires an event when it switches, ExternalMetadataServer
listens" — checked against Task 013's `EventBus` design and rejected as-is: `EventBus`
(Mechanism 3) is explicitly RN↔RN only; Task 013 states outright "there is no Kotlin-to-Kotlin
broadcast... Kotlin genuinely has no broadcast primitive of its own." Two sibling Kotlin
generalizer modules cannot listen to each other directly. Decided instead: `syncMatches`
receives the active server group id explicitly from its caller —
`syncMatches(kavitaSeries: List<SeriesSummary>, activeServerGroupId: String): ServerResponse<
List<ExternalMetadataMatch>>` — RN already knows which server group is active (same "RN decides
*when* to sync" orchestration Task 028 already fixed for `syncBff`), so it passes it straight
through; no new inter-module Kotlin dependency, no `EventBus` involvement yet. **Not closed
long-term** — user expects both mechanisms (explicit parameter AND an eventual RN-mediated
"server switched" signal that also updates `ExternalMetadataServer`'s own notion of active
group, the same two-step EventBus-emit-then-RPC-call shape already used elsewhere) to coexist
eventually; only the explicit-parameter path is being built now.

**Applies to:** Task 022 (fixes the module's name, Gradle boundary, data model, plugin contract
shape, and active-group resolution before any code is written) — and any future BFF/metadata
provider added later, which extends `ExternalMetadataPlugin`/adds a new `plugins/<provider>/`
folder rather than redesigning this shape.

## Open / rejected — do not re-litigate without new information

- **`actions`/execution-instruction fields inside a contract** (e.g. `cache.execute` describing
  *how* to invoke something, not just a key) — explicitly left undecided, not dropped. May only
  make sense at the RN layer, not this contract level. Revisit once more domains are modeled and
  a pattern becomes obvious from precedent.
- **`pages.averageAspectRatio`** (pre-calculated chapter-wide average, mirroring the Reader's
  existing on-demand fallback cascade) — proposed, user declined. Stays out unless a broader use
  case beyond the Reader's specific layout-fallback need shows up.
- **`LibraryType`/content-type** (Manga/Comic/Book/Light Novel) — real Kavita field, but at the
  **Library** level, not Chapter/Series. Deliberately excluded from `ChapterContract` to avoid
  duplicating the same value per chapter; belongs in Task 011 (Library contract) instead.
- **`ErrorContract`'s exact fields**, including the `not_found`-vs-access-failure code
  distinction — flagged as a real requirement, not designed yet.
- **`bookScrollId`** — a real field on Kavita's `ProgressDto` (`get-progress`), possibly a
  finer-than-page-index reading position (the "which pixel did I stop at" the user asked about
  earlier, which R6 currently says shouldn't come from the server contract at all). Found via
  the `kavita-api` skill, not yet reviewed with the user — do not assume it contradicts R6 or
  confirms it; revisit explicitly before deciding what it is or where it belongs.
- **Correction — `MangaFormat` is not a media genre.** Earlier assumption (before this was
  checked against the real schema) was that `MangaFormat` might be "manga vs. comic vs.
  webtoon" (that's actually `LibraryType`, a separate, still-excluded field, entry above).
  Confirmed real values: `Image | Archive | Unknown | Epub | Pdf` — the file's packaging
  format, not a media-genre classification. Exists on both `SeriesDto` and `ChapterDto` in the
  real schema; modeled as `ChapterContract.pages.fileFormat` (Chapter can genuinely diverge
  from a series' predominant format), deliberately excluded from `SeriesContract` (user's call,
  not needed at that level).
