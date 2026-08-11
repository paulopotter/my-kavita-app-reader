# Plan 003 — Library Screen

## Goal

Third screen in migration order: lists all series available in the Kavita library.
This slice adds the BFF enrichment layer, the i18n system, bottom navigation bar,
splash sync logic, and local reading-progress storage.

## Context

At the start of this plan the app rendered only `ConfigScreen` (auth + Kavita server
configuration) with hardcoded strings. This plan delivers the main content-discovery
surface and modernises the base with:

- Full i18n (PT-BR / EN) across all strings, including existing ones
- Language switch on `ConfigScreen`
- Series listing via Kavita `POST /api/Series/all-v2`
- BFF enrichment via `GET /manga` (user-hosted REST API, no auth)
- Match by `kavita_id` (primary) + normalised-name fallback
- Two-level reading progress: `chapter_cache` (primary) or Kavita `pagesRead/pages` (fallback)
- Derived `ReadStatus` (UNREAD / IN_PROGRESS / READ)
- Local progress saving (no Kavita sync yet)
- BFF URL configuration linked optionally to a Kavita URL
- Bottom navigation bar (Library | Settings)

**Nomenclature:** the enrichment API is called **BFF** throughout the codebase.

## Architecture decisions

### BFF match
Primary match by `kavita_id: Int?`. Fallback by normalised name (strip diacritics,
lowercase, strip light punctuation, trim whitespace) — no fuzzy matching.

### BFF config
`BffServerConfigEntity` with `linkedKavitaServerConfigId: String?`. Separate table
from Kavita config, supporting N entries, each optionally linked to a Kavita server.
Timeout and `healthCheckPath` hardcoded (`3000 ms`, `"/manga"`).

### i18n
No third-party library. `frontend/src/shared/i18n/strings.ts` exports all strings
in PT-BR and EN. `useStrings()` hook reads `UiPreferences.language` and returns the
correct object. Language persisted in Room via `UiPreferencesDao`.

### Bottom bar
Replaces state-based navigation in `App.tsx`. Two tabs: Library | Settings.
Always visible (simplification vs. reference project).

### Cache windows
- **Kavita library**: TTL 2 minutes. On normal open, loads from Room immediately and
  syncs in background only if cache is older than 2 min. Pull-to-refresh ignores TTL.
- **BFF**: TTL 6 hours. Same logic.

### Splash sync
`SplashActivity` runs `listSeries` → (if changed) `syncBff`, with a 30 s total
timeout. On failure/timeout: proceeds with local cache (local-first). Skip if app
was reopened within 5 minutes (`lastSuccessfulSyncAtMs` in `UiPreferences`).

## Kotlin layers

### :core
New entities: `ChapterCacheEntity`, `ReadingProgressEntity`, `BffMatchEntity`,
`BffServerConfigEntity`. New DAOs for each. `UiPreferencesEntity` extended with
`language` and `lastSuccessfulSyncAtMs`.

### :tools
`ConfigStore` + `ConfigRepository`: BFF server config CRUD.
New `LibraryModule` (ReactContextBaseJavaModule, JS name `"LibraryModule"`):
`listSeries`, `syncBff`, `saveReadingProgress`.

### :features
- `BffFeature` — active-URL resolution, healthcheck, `GET /manga`, normalised match, `replaceAll`
- `KavitaSeriesFeature` — `listSeries`, `saveReadingProgress`

## Frontend layers

```
frontend/src/shared/i18n/
  strings.ts          — all PT-BR + EN strings
  useStrings.ts       — hook reading UiPreferences.language

frontend/src/shared/bridge/
  library.ts          — LibraryBridge (LibraryModule)
  config.ts           — BffServerConfig CRUD + language field

frontend/src/shared/components/
  BottomBar.tsx       — two-tab nav (Library | Settings)

frontend/src/screens/library/
  LibraryTransform.ts — pure: formatProgress, formatLastAdded, statusLabel, publicationLabel
  LibraryService.ts   — fetchSeries, syncBff
  useLibrary.ts       — useReducer: loading / data / error + refresh
  components/
    SeriesCard.tsx    — cover, name, progress bar, readStatus badge, publicationStatus badge
  LibraryScreen.tsx   — FlatList 2-col, pull-to-refresh, loading/error/empty/populated states
```

## Data flow

```
KavitaSeriesFeature + BffFeature (Kotlin)
        │ bridge
        ▼
    LibraryBridge (library.ts)
        │
    LibraryService.ts
        │
    LibraryTransform.ts
        │
    useLibrary.ts (hook)
        │
    LibraryScreen.tsx
        │
    SeriesCard.tsx (dummy component)
```

## Tasks

See `INDEX.md` for status.
