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
  marks stable after N crash-free opens.

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

**Last Updated**: 2026-08-11
