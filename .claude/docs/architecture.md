# Architecture Map — load when you need file locations or layer rules

---

## Directory Structure

```
my-kavita-app-reader/
├── android/                    # Kotlin shell (Android)
│   ├── core/                   # Infrastructure: Room, lib adapters, build config
│   ├── tools/                  # Reusable capabilities: request, bridge, plugins, schema validator
│   ├── features/               # Business domains: kavita, bff, notifications
│   └── app/                    # Android shell: services, manifest, DI wiring
│
├── frontend/                   # React Native / Expo
│   └── src/
│       ├── screens/            # One folder per screen (DDD: domain-first)
│       │   └── reader/         # current convention (see note below); serie/ matches
│       │       ├── components/ # one subfolder per dumb component:
│       │       │   └── reader-top-bar/  # <c>.component.tsx + <c>.styles.ts + <c>.tests.tsx + index.ts
│       │       ├── hooks/      #   reader.hooks.ts, reader.reducer.ts
│       │       ├── transforms/ #   reader.transform.ts (screen-specific pure fns)
│       │       ├── reader.screen.tsx
│       │       ├── reader.styles.ts
│       │       └── reader.types.ts
│       └── shared/
│           ├── components/     # Generic reusable components
│           ├── hooks/          # Shared hooks
│           ├── services/       # Shared domain services (Series, Chapter…)
│           ├── transforms/     # Pure shared data functions
│           └── bridge/         # TypeScript types for Kotlin tools
│
├── docs/                       # Developer documentation
│   ├── architecture/
│   └── contributing/
│
├── site/                       # GitHub Pages (internationalised)
├── scripts/                    # build, setup, deploy, release helpers
│
├── .github/
│   ├── workflows/              # CI/CD pipelines
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE/
│
└── .claude/                    # AI documentation (English)
    ├── sessions/
    │   ├── active/             # Plans in progress
    │   └── backlog/items/      # Roadmap ideas without a numbered plan yet
    ├── completions/            # Finished task docs + archive/
    ├── skills/                 # Claude Code skills
    ├── agents/                 # Subagents
    └── templates/              # Document templates
```

### Screen file convention

Two conventions coexist. The **current** one — used by `serie/` and `reader/` (the screens
rewritten under plan 017) and the target for any new or migrated screen:

- `<name>.screen.tsx`, `<name>.hooks.ts` (in `hooks/`), `<name>.transform.ts` (in `transforms/`),
  `<name>.types.ts`, `<name>.styles.ts` — all kebab-case, role in the filename.
- Each dumb component gets its own subfolder: `components/<comp>/<comp>.component.tsx` +
  `<comp>.styles.ts` + `<comp>.tests.tsx` + `index.ts`. Style is always a separate file (no
  inline `StyleSheet.create` in a `.component.tsx`).

The **legacy** one — `config/`, `following/`, `library/`, `search/`, `setup/`, `splash/`:
`LibraryScreen.tsx`, `useLibrary.ts`, `LibraryTransform.ts` (PascalCase, flat, `use*` hook).
Migrate to the current convention when a screen is next touched substantially; don't rename
wholesale for its own sake.

**Open inconsistency (not yet resolved):** where screen-specific pure derivation lives.
`reader/` puts it in `transforms/reader.transform.ts` + `transforms/webtoon-blocks.transform.ts`;
`serie/` keeps `sortChapters` inline in `serie.hooks.ts` and has no `transforms/` folder. The
Tools (`ChapterTool`, `SerieTool`) absorbed the normalization/formatting half. The
`CLAUDE.md` "Tool → Hook → Service → Transform → Screen → Component" flow predates this drift.
Pick one and align both screens in a dedicated task before migrating more screens.

## Domain Composition

Domains are organized **micro → macro**. Each domain only handles its own
concern and delegates downward to the smaller domain when needed:

```
Page  →  Chapter  →  Series  →  Library
(micro)                          (macro)
```

### Rules

- `Chapter` knows how to format/handle a chapter.
- `Series` knows how to format/handle a series — calls `Chapter` when it needs
  chapter data.
- `Library` knows how to format/handle the library — calls `Series` when it
  needs series data.
- Each domain owns its transform, service, and bridge files.
- **Never** put series-domain logic inside Library files, or chapter-domain
  logic inside Series files.

### In Kotlin

Each subdomain lives in its own subfolder under `features/kavita/`:

```
features/kavita/
├── library/    KavitaLibraryFeature.kt  — lists the library (POST /api/Series/all-v2)
├── series/     KavitaSeriesFeature.kt   — single series detail + metadata
└── chapter/    KavitaChapterFeature.kt  — chapters, mark-read/unread, progress
                ChapterSyncCoordinator.kt
```

Kotlin is a **data bridge only** — it exposes raw data to RN and holds the
minimum Android-only logic (Room cache, authenticated requests, sync
coordinators). Business logic, ordering, and formatting live in RN.

When to write Kotlin logic: only when there is an indispensable Android
technical advantage — Room cache, authenticated HTTP, SyncCoordinator.
Never duplicate logic the RN layer already performs.

### In React Native

```
shared/transforms/series.ts    — pure functions for series domain
shared/transforms/chapter.ts   — pure functions for chapter domain
shared/bridge/series.ts        — types + bridge for Series/Chapter Native Module
screens/series-detail/
  SeriesDetailTransform.ts     — screen-specific derived data (sort, continue-chapter)
  SeriesDetailService.ts       — thin wrapper delegating to bridge
  useSeriesDetail.ts           — orchestrates state + side-effects
```

`screens/*/` contains only what is specific to that screen. Shared domain
logic must live in `shared/transforms/<domain>.ts` so other screens can
reuse it without crossing screen boundaries.

---

## Kotlin Layer Rules

| Layer      | May depend on  | Never depends on |
|------------|---------------|-----------------|
| `core/`    | —             | `tools/`, `features/` |
| `tools/`   | `core/`       | `features/`     |
| `features/`| `core/`, `tools/` | —           |
| `app/`     | all three     | —               |

## Key Concepts

- **Plugin point**: one install file wires up the active implementation;
  the rest of the app only knows the abstraction.
- **Bridge RPC**: JS calls Kotlin tools (`request`, `cachedRequest`,
  `authenticatedRequest`, `db.*`, domain repos).
- **Bridge Stream**: Kotlin emits events RN observes (`events.notification`,
  `events.syncProgress`, `events.dbChanged`, `events.networkState`).
- **JS-side DB**: isolated SQLite (not Room) for tables owned entirely by JS.
  Can be promoted to Room later via a defined migration protocol.
- **OTA**: app checks `latest.json` on startup; downloads newer JS bundle
  in background; switches on next launch. Rollback: keeps previous bundle,
  marks stable after N crash-free opens. Staleness after a local rebuild
  is detected by comparing build timestamps, not version strings — see
  `mistakes.md` #13.
- **Layered preference override**: a setting can exist at up to three
  priority levels — session-only (in-memory, resets on screen exit),
  per-item persisted override (e.g. `series_sort_prefs`, with an explicit
  reset-to-default action), and app-wide global default. The effective
  value is resolved top-down (session > per-item > global) each time the
  screen loads. First used for chapter sort mode in Series Detail; reuse
  this pattern for any future setting that needs the same "quick session
  tweak vs. sticky per-item vs. app default" shape.

## Cache Guideline — `Cache` (Kotlin) + `CacheManager` (RN)

*Kotlin side implemented (Task 023). RN side (`CacheManager`) not started
yet — see "Deliberately deferred" below.*

> **Read-path precedence rules live in [`data-freshness.md`](data-freshness.md)** — force wins,
> cache-first + background refresh, optimistic-local, and how they compose (timestamps are the
> tiebreaker, not source priority). Every read path — Digest builders, Services/Tools, screen
> hooks — follows it; when a concrete rule seems to contradict it, the principle wins.

Every domain that needs local cache reuses one generic module (`:cache`,
Layer 1 — as domain-agnostic as `:core` itself) instead of inventing its
own ad-hoc mechanism, as `LibraryModule.kt`'s old `@Volatile var` fields,
per-domain Room tables (`series_detail_cache`/`chapter_cache`), and
`M3Plugin`'s/`ActiveUrlSelector`'s own hand-rolled `Mutex`+`Map` memoization
all did historically (`M3Plugin` migrated to `Cache.network` in Task 023;
`ActiveUrlSelector` has not been migrated yet).

### `Cache` (Kotlin) — three backends, one facade

```kotlin
class Cache {
    val persistent: Persistent   // Room-backed, survives app restart
    val memoryKotlin: MemoryKotlin // in-process Map, lives only as long as this Kotlin process
    val network: Network          // not a value store — single-flight + TTL around a suspend block
    fun storeFor(mode: CacheMode): CacheStore // resolves persistent/memoryKotlin automatically
}
```

- **`persistent`/`memoryKotlin`** both implement `CacheStore` — the same
  contract (`get`/`put`/`invalidate`/`invalidateDomain`/`invalidateVariant`/
  `purgeExpired`/`purgeOlderThan`), differing only in where the data
  physically lives. `put()` returns the `CacheDescriptor` it just produced
  (never `Unit`) — a caller building a digest attaches provenance without
  re-deriving it.
- **`network`** protects a network call from redundant concurrent
  execution (single-flight via a `Mutex` per key, not one global lock) plus
  a TTL memoization window — a different shape (`run(key, ttlMs, block)`,
  no `value`/`domain`/`variant`) but the same lifecycle parity as the other
  two (`invalidate`/`purgeExpired`/`purgeOlderThan`).

**Key/variant/domain convention** (`CacheEntity`, `:core`): `domain` is a
caller-chosen label (`"page"`/`"chapter"`/`"series"`/...) opaque to `Cache`,
only used for `invalidateDomain`/`invalidateVariant`. `variant` names which
parameter(s) change a payload's shape (`"full"`, or `"full:external"` for
more than one, colon-separated — never the values); `key` carries the
entity id plus that same parameter's value(s) in the same positional order
(`"c1:true"`, `"s1:true:false"`). A domain with no such parameter (e.g.
Page) uses `variant = ""` and `key` = the bare id. Primary key is
`(key, variant)` together.

**`CacheDescriptor`** — created at Layer 1 (`:cache`), embedded inside a
domain digest's own `cache` field (`PageDigest.Success.cache`,
`ChapterDigest.Success.cache`, `SeriesDigest.Success.cache`, all
`:content-digest`), marked `@Transient` on every digest (never serialized
inside the JSON persisted in `Cache` itself — it would be circular at
write time, and redundant with what `Cache` already knows for that row;
always reconstructed from the real `CacheEntry` when a value is read back):

```kotlin
enum class CacheMode { PERSISTENT, MEMORY_KOTLIN } // MEMORY (RN-only) and NETWORK never produce a descriptor

data class CacheDescriptor(
    val key: String,
    val variant: String,
    val domain: String,
    val mode: CacheMode,
    val cachedAtEpochMs: Long,
    val expiresAtEpochMs: Long,
)
```

### Cache-first pattern in `:content-digest` (`buildPageDigest`/`buildChapterDigest`/`buildSeriesDigest`)

Each builder takes `cache: Cache` (required, same convention as `server:
Server` — passed explicitly, never a module-level singleton) and
`force: Boolean = false`:

- `force = false` + fresh hit → returns the cached value, no network call.
- `force = false` + stale hit → returns the stale value immediately, fires
  a background refresh (the same function, `force = true`, on its own
  `CoroutineScope`) that re-fetches and rewrites the cache — the original
  caller never waits for it.
- `force = false` + miss, or `force = true` → always fetches fresh and
  writes the result before returning (a forced call never skips the write,
  only the read).

`force` propagates top-down through the domain composition: a forced
Series refresh forces every Chapter it builds, which forces every Page —
a manual "refresh everything" action from the Series level never leaves a
stale Chapter or Page underneath a freshly-refreshed Series.

Keys today: Page `"chapterId:pageIndex"` (`domain="page"`, `variant=""`);
Chapter `"chapterId:full"` (`domain="chapter"`, `variant="full"`); Series
`"seriesId:full:includeExternalMetadata"` (`domain="series"`,
`variant="full:external"`). All three currently use `mode = PERSISTENT` —
no domain has been judged to need `MEMORY_KOTLIN` yet (that decision is
still made per case, only when a real reason shows up, not from a general
survey).

`ChapterDigest.Success.prevChapter`/`nextChapter` are merged on write, not
overwritten blindly: a write that receives neither (e.g. a direct
`getChapterDigest` RN call, no Series in the loop) preserves whatever
neighbors an earlier Series-driven write already attached; a write that
receives at least one neighbor always wins.

**Known trade-off, deliberately not solved yet** (see backlog 017): a
Chapter's cached JSON embeds its full `PageDigest` list (each Page also has
its own separate cache entry — real duplication), and a Series embeds full
`Chapter`s the same way. A referenced-by-key cascade (Chapter stores Page
keys, re-reads each from `Cache` instead of embedding a copy) would remove
the duplication and fix a subtle staleness gap (an embedded Page doesn't
know it's expired even if its own TTL has elapsed), at the cost of turning
one cache read into N synchronous reads and more complex staleness
semantics — not implemented.

### `BackgroundExecute` (`:tools`) — generic fire-and-forget with `Cache`

```kotlin
class BackgroundExecute {
    fun launch(fetchFn: suspend () -> String): Job                                    // runs fetchFn, writes nothing
    fun launchWithStore(fetchFn: suspend () -> String, descriptor: CacheDescriptor): Job // runs fetchFn, writes the result via Cache.storeFor(descriptor.mode)
}
```

Both return the started `Job` — never awaited internally — so a caller
that wants to react once the refresh finishes (e.g. an `EventBus` emit,
once that exists) can call `job.invokeOnCompletion { ... }` itself.
`:cache` was promoted to Layer 1 (as generic as `:core`) so `:tools`
(Layer 1) could depend on it without inverting `core ← tools ← features`.
Not used by the digest builders above (each calls itself recursively
instead — it already knows how to fetch); available for other callers
(e.g. a future RN-driven background refresh) that need the same
fire-and-forget shape without duplicating the pattern.

**`CacheManager` (RN) — implemented** (`shared/managers/caches/`). As
predicted it's thin: the cache-first *decision* (read vs. fetch vs.
stale-refresh) lives in the Kotlin digest builders, not here. `CacheManager`
just exposes `CacheBridge` by mode — `persistent` / `memoryKotlin` ×
`get`/`put`/`invalidate`/`invalidateDomain`/`invalidateVariant`/
`purgeExpired`/`purgeOlderThan` (`network` deliberately not bridged — its
`block` is a Kotlin function). The RN-only `MEMORY` mode is still not built.

**Managers built on top of `CacheManager.persistent`** — a domain that
needs a small typed store keyed by id wraps `CacheManager.persistent`
rather than talking to the bridge directly:
- **`PreferencesManager`** (`shared/managers/preferences/`) — over
  `:preferences` (its own Room table, not `:cache`); used by
  `ChaptersTool.sort`, `ReadingModeTool`.
- **`ReadingProgressManager`** (`shared/managers/reading-progress/`) — the
  reader's local reading position (`{ seriesId, page, scrollFraction }` per
  chapterId), `domain: 'readingProgress'`, no TTL. The cache entry's
  `cachedAtEpochMs` IS its "updated at" — `resolveInitialPage` compares it
  against the server `resumePoint.recordedAtEpochMs`, newest wins (see
  `data-freshness.md`). A temporary sync buffer, not the source of truth;
  a boot reconciliation to prune it against the server is a separate task.

**Deliberately deferred:**
- **Who calls `purgeExpired`/`purgeOlderThan`** — implemented on
  `persistent`/`memoryKotlin`/`network`, exposed over the bridge, but
  nothing calls them yet. Expected to be a splash-screen routine on the RN
  side.
- **Whether a given field/domain should be `MEMORY_KOTLIN` instead of
  `PERSISTENT`** — decided per case, only when a real reason shows up
  (e.g. a field that changes too often to be worth surviving restart).

## Reader Screen — the one native-rendering exception

The reader (`screens/reader/`) is the **only** screen in this codebase where
pixels are drawn by Kotlin instead of React Native. Every other screen is
100% RN — this is a deliberate, narrow exception, not a precedent for
"Kotlin can render UI when convenient."

### Why this screen breaks the rule

Manga/webtoon pages are tall bitmaps (a single scan can be 10,000+ px tall).
FlashList (the RN list originally planned for this screen — see
`.claude/sessions/completions/007-*` for the full record) hits Android's
`GL_MAX_TEXTURE_SIZE` ceiling on some devices: a webtoon page taller than
the GPU's max texture dimension either renders as a collapsed strip or goes
black, regardless of how the RN side slices scroll. No RN-only list
implementation avoids this — the constraint is in the platform's texture
pipeline, below anything JS can reach.

The fix requires a Compose `LazyColumn` (`ReaderPageList.kt`,
`features/kavita/reader/ui/`), exposed to RN as a single native view
(`ReaderPageListView`/`ReaderPageListViewManager`, `app/`). Compose's own
draw pipeline (RenderNode/Canvas, width-constrained via `fillMaxWidth()`
inside the list) doesn't hit the texture ceiling — confirmed against the
reference project (my-manga-app-reader) using the same approach.

### If this needs to happen again for a different screen

Native rendering is the **last resort**, only justified by a platform
constraint no RN-side fix can work around (not "it's easier in Kotlin" or
"it's faster to prototype"). Before reaching for it, exhaust RN-side
options — including using Reanimated/Skia from the RN side, virtualizing
differently, or downsampling. If a real platform ceiling forces the native
path, follow the same shape this screen uses, in this order:

1. **RN owns every decision, Kotlin only draws.** Which items are loaded,
   when to advance/retreat, all business logic — stays in the hook
   (`screens/reader/hooks/reader.hooks.ts`). The native view is a dumb
   renderer: it receives a list of data and reports back what's visible
   (`onVisiblePageChanged`) or what happened (`onTap`,
   `onScrollToChapterHandled`). Kotlin never decides navigation, never
   fetches data on its own.
2. **Server-Driven UI (SDU) for anything besides the raw content itself.**
   Don't hardcode headers/footers/labels/spacing as fixed Kotlin
   Composables — RN sends a small generic node tree (`SduNode.kt`:
   `Container`/`TextNode`/`Spacer`, interpreted by `SduNodeView`) describing
   colors, text, padding, layout direction. Kotlin's only job is interpreting
   that tree generically; it never encodes what a "header" or "footer" IS.
   Any new visual composition is expressible as data from RN with zero
   Kotlin changes. Extend the node vocabulary only when a real need shows
   up (e.g. an `Icon` node), never speculatively.
3. **Single Responsibility per Composable/file.** `ReaderPageList.kt` only
   lays out entries and reports scroll signals; `SduNodeView` only
   interprets SDU nodes; `ReaderPageImage` only decodes/displays one page;
   `PagePreloader`/`SafeBitmapDecoder` only handle image loading. Don't let
   one Composable both decide navigation and render pixels.
4. **Event-oriented, never polled.** The View emits discrete RN events
   (`onVisiblePageChanged`, `onScrollToChapterHandled`, `onTap`) through
   `RCTEventEmitter` — RN reacts to them, it never polls Kotlin state.
   One-shot requests (e.g. "scroll to this chapter") are cleared back to
   null by RN once handled (`onScrollToChapterHandled`), so a natural
   forward scroll is never fought by a stale programmatic jump.

### Chapter-switch contract (`ReaderWindow` + `moveFocus`)

The reader had a class of recurring navigation bugs (documented: pressing
"next" on chapter 26 jumped straight to 28) caused by **two uncoordinated
mechanisms writing the same chapter-navigation state** — the native list's
continuous scroll (`onVisiblePageChanged`) and the manual overlay arrow —
racing through a read-modify-write on a named `{prev, curr, next}` trio.
The rewrite (`screens/reader/`) replaces that with one model and one path:

- **`ReaderWindow { entries: LoadedChapterEntry[]; focusedIndex: number }`** —
  a position-indexed window (a ruler + a pointer), a contiguous slice of the
  series' canonical reading order. `focusedIndex` is the *only* source of
  truth for "where the user is"; there is no separate `curr` that can
  desync. Moving chapter = moving the index, one atomic assignment in the
  reducer. The window is **append-only** on natural scroll
  (`computeWindowAfterFocusMove` only ever moves `focusedIndex` or grows an
  end) — it never reorders or drops an entry, so the native list's scroll
  position stays valid across a crossing.

- **One path for a scroll crossing: `moveFocus(trigger)`** in
  `reader.hooks.ts`. The screen forwards the native payload verbatim
  (`onNativePosition`); the hook decides. `moveFocus` just dispatches
  `MOVE_FOCUS { trigger, order }` and the **reducer** computes the
  transition against its own `state.window`, so two reports in the same
  React batch serialize (the 2nd builds on the 1st's result) — no settling
  timer, no parallel window copy in a ref.

- **Arrows / jump reload, they don't scroll.** The overlay arrows call
  `openChapter(targetId, { startAtBeginning: true })` — the same flow that
  opens the screen — which builds a fresh `[prev?, target, next?]` window
  and bumps `State.nativeListKey`. The screen passes `nativeListKey` as the
  `key` of `<ReaderPageListView>`, so React unmounts the native view and
  mounts a new one: the Compose `LazyColumn` is created fresh on the target
  chapter with no inherited scroll offset. This is deliberate —
  `listState.scrollToItem` / `LinearLayoutManager.scrollToPositionWithOffset`
  both proved unreliable across many device builds when the `blocks` list
  changed and an old block survived (the list stayed anchored on the
  survivor). Remounting sidesteps programmatic scroll entirely for a switch.
  A natural-scroll crossing does **not** bump `nativeListKey` (no remount
  mid-scroll).

- **Cold-open prev.** A bare `ChapterService.getFull` carries no embedded
  `prevChapter`/`nextChapter` (those are only attached by a Series-driven
  fetch), and on the first open the canonical series order hasn't loaded
  yet — so `buildWindow` can't include the prev. `reconcileWindow` (run once
  the order lands) prepends it. Without the prev in the window there is no
  block above the opened chapter and backward scroll has nowhere to go.

- **`scrollRequest`** is a one-shot `{ chapterId, page }` used only for
  "continue reading" (initial page != 0) — never set by a native-scroll
  report. Consumed via `onScrollToChapterHandled` → `SCROLL_REQUEST_HANDLED`.

The Kotlin side is unchanged by this contract: all of it — window,
`moveFocus`, the reducer, the remount trigger — is RN. If it ever looks
easier to solve a piece of this in Kotlin, that is a design error in the RN
model, not a justified exception.
5. **Decoupled from any specific data provider.** The View's props
   (`ChapterBlock`: `chapterId`, `pageUrls`, `pageAspectRatios`, `firstNode`,
   `lastNode`) carry plain data, not Kavita-specific types — the Kotlin
   rendering layer has no idea what "Kavita" is. Provider-specific logic
   stays entirely in the data layer feeding the hook
   (`shared/services/chapters` / `shared/services/serials` → the Kotlin
   `:content-digest` layer, see below), never in the native view.

### `ChapterDataSource` — the swappable-provider boundary

> The **reader's own** chapter/page data now comes through
> `shared/services/chapters` (`ChapterService.getFull` →
> `DigestBridge.getChapterDigest`) backed by the Kotlin `:content-digest`
> layer, not through `ReaderChapterModule`/`ChapterDataSource`. The section
> below still describes `ChapterDataSource` because it remains the boundary
> for its other consumers (`SplashSyncCoordinator`, and the concrete
> `KavitaChapterFeature` calls from `LibraryModule`/`SeriesModule`).

The Kotlin *data* side of the reader (not the rendering side above) follows
the interface+impl+binding pattern already used for `KavitaUrlSource`/
`KavitaUrlSelector`: `ChapterDataSource` (`features/kavita/chapter/`) is a
provider-agnostic interface — `getPageUrls`, `getPageDimensions`,
`getLocalProgress`, etc. `KavitaChapterFeature` implements it (the only
class that knows Kavita's REST paths/DTOs); `FeaturesModule` binds the two
via Hilt `@Binds`. `ReaderChapterModule` (the NativeModule bridge exposed
to RN) depends on the interface, never on `KavitaChapterFeature` directly —
swapping the manga provider means adding a new `ChapterDataSource`
implementation and rebinding it, with zero changes to the bridge or to RN.

`LibraryModule`/`SeriesModule` still inject `KavitaChapterFeature`
concretely, because they call methods outside `ChapterDataSource`'s
contract (`listChaptersForSeries`, `markChaptersRead`/`Unread`) — that's a
known, deliberate asymmetry, not an oversight to "fix" by widening the
interface without a real second use case.

### NativeModule split: one module per responsibility, not per screen

A single `ReaderModule` used to bridge chapter/page data, screen-wake
control, and network-URL watching — three unrelated concerns under one
screen-named class (see `mistakes.md` #3). It's split into:

- `ReaderChapterModule` (`app/`) — thin RPC over `ChapterDataSource`.
- `ScreenControlModule` (`app/`) — generic `keepScreenOn`/`allowScreenOff`/
  `getKeepScreenOnDuringReading`, reusable by any future screen that needs
  to keep the display awake.
- `NetworkStatusModule` (`app/`) — the `activeUrlChanged` event stream
  (`ActiveUrlWatcher`), also screen-agnostic.

Shared NativeModule boilerplate (RN event emission, `Result<T>` →
`Promise` resolution) is factored into `ReactBridgeSupport.kt`
(`emitEvent`, `resolveOrReject`) rather than hand-rolled per module.

## Versioning

- `android/app/build.gradle.kts` → `versionCode` / `versionName` (APK)
- `frontend/package.json` → `bundleVersion` (JS bundle)
- Both are bumped by the `versionar-build` skill before any device build.

## android/node_modules

`android/node_modules` is a **symlink** to `frontend/node_modules`, not a
real directory. It exists because the Android Gradle plugin for React Native
resolves packages (e.g. `react-native-screens`) relative to `android/`, so
`node_modules` must be reachable from there.

- Created automatically by `make setup` after `yarn install`.
- Never committed — covered by `.gitignore`.
- After a fresh clone: run `make setup` before `make build-android`.

## Generated Assets (Metro)

`make build-bundle` (i.e. `yarn bundle:android`) copies image assets from
`frontend/src/assets/` into `android/app/src/main/res/drawable-*/` using a
path-encoded naming convention:

| Source file | Generated drawable name |
|---|---|
| `src/assets/ic_splash.png` | `src_assets_ic_splash.png` |

Metro maps asset density suffixes to Android drawable buckets:

| Suffix | Drawable bucket |
|---|---|
| `@1x` | `drawable-mdpi` |
| `@1.5x` | `drawable-hdpi` |
| `@2x` | `drawable-xhdpi` |
| `@3x` | `drawable-xxhdpi` |
| `@4x` | `drawable-xxxhdpi` |

These generated files are **not committed** — `.gitignore` excludes
`drawable-*/src_assets_*` and `drawable-*/node_modules_*`. They are
recreated on every `make build-bundle`.

---

**Last Updated**: 2026-09-01
