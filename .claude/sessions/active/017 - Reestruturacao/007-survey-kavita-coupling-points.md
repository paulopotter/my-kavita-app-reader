# Task 007 — Survey: direct Kavita coupling points outside the 3 core domains (Phase 1 — Survey)

**Status:** done

## Objective

**Survey only.** Sweep the codebase for any file, outside Chapter/Series/Library, that knows
the Kavita format/name directly — Page domain included, plus anything else in the project
(settings, auth, image loading, notifications scaffolding, etc.). This decides the scope of
Task 012 (additional `DataSource`s) and feeds Task 014 (plugin manager module design).

## Steps

1. Grep the Kotlin tree (`core/tools/features/app`) for `Kavita`-named classes/strings outside
   the already-known `KavitaChapterFeature`/`KavitaSeriesFeature`.
2. Grep the RN tree (`screens/*`, `shared/*`) for any hardcoded Kavita-specific field name,
   endpoint shape, or response format that leaks into UI/hook code instead of going through a
   `Service`/`Transform` layer.
3. For each point found, note: what it knows about Kavita specifically, whether it already goes
   through some kind of translation boundary, and whether it plausibly needs a `DataSource`-style
   isolation (per Task 002's premise) or is a one-off that does not justify the pattern.
4. Explicitly check auth/config (base URL, API key) — these are expected to reference Kavita by
   design (the app talks to one server type today) — flag them as "expected, not a violation"
   rather than omitting them silently.
5. Write findings as a plain inventory — no proposed fix, no contract shape.

## Completion criteria

- Every direct Kavita-coupling point outside Chapter/Series/Library is listed with file:line
  and a note on whether it's a plausible `DataSource` candidate.
- Findings handed off to Task 012 (which sub-tasks it spawns, if any) and Task 014 (manager
  module design) as input — no fix applied here.

## Findings

### Strongest `DataSource` candidates (no abstraction exists today)

1. **`KavitaUrlSource`/`KavitaUrlSelector`** (`android/features/.../kavita/KavitaUrlSelector.kt:1-51`)
   — already an interface, but named/packaged with "Kavita" (leaks the provider even through the
   abstraction), and hardcodes `KAVITA_HEALTH_PATH = "/api/Health"` plus Kavita-specific case
   normalization (`/api/health` → `/api/Health`).
2. **`KavitaAuthFeature` + `UserDto`** (`android/features/.../kavita/KavitaAuthFeature.kt`,
   `UserDto.kt`) — **no abstraction at all today**. Hardcodes the auth endpoint
   (`/api/Plugin/authenticate`), the plugin-name param, the `apiKey`/`pluginName` query format,
   and interprets the response as a private `UserDto` (`username`/`token`/`refreshToken`). The
   clearest candidate for a new `AuthDataSource`, mirroring the existing `ChapterDataSource`
   pattern.
3. **`BffFeature`** (`android/features/.../bff/BffFeature.kt`) — the subtlest finding: this is a
   feature for a **different** provider (BFF, external tracking service), but it's structurally
   coupled to Kavita's format for correlation — `MangaDto.kavitaId` (`@SerialName("kavita_id")`),
   parameter/variable names `kavitaSeries`/`byKavitaId`/`kavitaUrlById`, and a direct import of
   `features.kavita.series.SeriesSummary` (no abstraction boundary). If the provider changes,
   BFF's matching silently breaks — not obvious from reading `BffFeature.kt` alone.

### Real format leak found (not just naming)

**`frontend/src/screens/setup/SetupScreen.tsx:99`** hardcodes `healthCheckPath: '/api/Health'`
when building a local `ServerConfig` object — duplicating knowledge that already exists in
`KavitaUrlSelector.kt:9` (`KAVITA_HEALTH_PATH`). Two places know the same Kavita-specific path
independently; a change to one won't be caught by the other.

### Naming leaks that don't justify a new `DataSource` (schema/copy decisions, not a layer gap)

- **`linkedKavitaServerConfigId`** — field name (not just value) carries "Kavita", present on
  `BffServerConfigEntity.kt:12`, the `AppDatabase.kt:86` migration SQL, `ConfigRepository.kt`
  (lines 194, 212), and its TS mirror `frontend/src/shared/bridge/config.ts:39`. Renaming is a
  schema migration, not a new abstraction boundary.
- **UI naming** in `ConfigScreen.tsx`/`SetupScreen.tsx` (`kavitaUrlInput`, `KavitaServer`
  interface, etc.) and `frontend/src/shared/i18n/strings.ts` (translation keys like
  `configKavitaServers`, user-visible copy naming "Kavita" directly) — product/copy decisions,
  not a missing translation layer; these screens are literally "manage your Kavita servers," so
  the naming is intentional today.
- **`SetupModule.kt`'s bridge method name** `testKavitaConnection` (and its RN-side interface
  `testKavitaConnection()`, `frontend/src/shared/bridge/config.ts:61`) — the *name* leaks across
  the native↔JS boundary, but the underlying operation (test connectivity to the configured
  server) is legitimately 1:1 with "test the configured server," not a missing abstraction.
- **`kavitaApiKey.ts`** (`frontend/src/shared/transforms/kavitaApiKey.ts`) — already lives in the
  correct transform layer (used only through its exported function by `ConfigScreen`/
  `SetupScreen`); only the file/function name is Kavita-specific, not a structural leak.

### Auth/config — explicitly checked, expected (not a violation)

`ConfigRepository.kt` and its TS mirror (`shared/bridge/config.ts`) use generic field names
(`url`, `apiKey`, `jwt`, `timeoutMs`, `priority`, `healthCheckPath`) — expected, since the app
only talks to one server type today. The one exception is `linkedKavitaServerConfigId` above.

### Comment-only mentions (no code coupling)

Several files mention "Kavita" only in comments explaining a peculiarity of the real API
(`SeriesDetailCacheEntity.kt`, `ReaderPageList.kt`, `SafeBitmapDecoder.kt`,
`shared/bridge/chapter.ts`, `shared/transforms/chapter.ts`/`page.ts`, `ReaderScreen.tsx`,
`useSeriesDetail.ts`) — not a finding, this is exactly where such knowledge should live if it's
going to exist as documentation.

### Areas without code yet (confirmed, not a finding)

`NotificationsScreen.tsx` and `SearchScreen.tsx` are pure placeholders with zero Kavita
references. No separate "Home" screen exists. Neither has any `NativeModules` reference yet.

No fix proposed here — this inventory is the input for Task 012 (additional DataSources) and
Task 014 (plugin manager module design).
