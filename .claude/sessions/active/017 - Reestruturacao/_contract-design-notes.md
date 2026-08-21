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
