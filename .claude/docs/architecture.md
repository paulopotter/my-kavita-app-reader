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
│       │   └── library/
│       │       ├── components/ # Screen-specific dummy components
│       │       ├── hooks/      # Screen-specific hooks
│       │       ├── LibraryScreen.tsx
│       │       ├── LibraryService.ts
│       │       └── LibraryTransform.ts
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
   (`useReader.ts`). The native view is a dumb renderer: it receives a list
   of data and reports back what's visible (`onVisiblePageChanged`) or what
   happened (`onTap`, `onScrollToChapterHandled`). Kotlin never decides
   navigation, never fetches data on its own.
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
5. **Decoupled from any specific data provider.** The View's props
   (`ChapterBlock`: `chapterId`, `pageUrls`, `pageAspectRatios`, `firstNode`,
   `lastNode`) carry plain data, not Kavita-specific types — the Kotlin
   rendering layer has no idea what "Kavita" is. Provider-specific logic
   stays entirely in the data layer feeding the hook (`ReaderService.ts` →
   `ChapterDataSource`, see below), never in the native view.

### `ChapterDataSource` — the swappable-provider boundary

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

**Last Updated**: 2026-08-19
