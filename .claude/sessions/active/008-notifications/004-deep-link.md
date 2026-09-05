# Task 004 — Deep links: `mymangareader://` public scheme, normalized to `deeplink://` for RN

## Why here, before Display (005)

Task 005 (`NotificationDisplay`) builds the tap `PendingIntent` for a native notification, and
that `PendingIntent` needs somewhere real to land — a URI that the app actually knows how to
resolve into `SeriesDetail`/`Reader` screens. No deep link mechanism exists in this project today,
so it must be built and verified end-to-end (app closed → tap a link → correct screen opens)
before Task 005 can be tested for real, not just compiled.

## Context

Confirmed by inspection before writing this task: `AndroidManifest.xml` only declares the default
launcher intent-filter (`ACTION_MAIN` / `CATEGORY_LAUNCHER`) — no custom scheme, no host, no
`ACTION_VIEW`. `App.tsx` renders `NavigationContainer` from `@react-navigation/native` without a
`linking` prop. `RootNavigator.tsx` already registers `Routes.SERIES_DETAIL`
(`series/:seriesId`) and `Routes.READER` (`reader/:seriesId/:chapterId`) with `getId` extractors
in place, and carries a placeholder comment on the `SERIES_DETAIL` screen referencing two
made-up, never-implemented schemes — that comment must be replaced with one describing the real
mechanism built here.

## Architecture decision (closed with the user)

Two distinct concerns, deliberately kept apart:

1. **Which entry points Android accepts** — the public `mymangareader://` custom scheme (always
   on) plus any optional http(s) App Link hosts (configurable per build). This is entirely
   Kotlin/Manifest's concern.
2. **What React Navigation resolves** — RN never needs to know *how many* entry points exist or
   what any configured host is. `MainActivity` normalizes every incoming URI (regardless of which
   entry point it arrived through) into one single internal scheme, `deeplink://`, before RN's
   `Linking` integration ever reads the Intent. `linking.config.ts`'s `prefixes` is therefore
   always exactly `['deeplink://']` — a constant, never a computed/dynamic list, and it is never
   duplicated or synced from Kotlin. Adding a second custom scheme or a new host later is a
   Kotlin-only change; RN's `linking.config.ts` never needs to be touched for that.

This replaces an earlier draft of this task that considered exposing the configured host list to
RN via a new bridge (to build `prefixes` dynamically) — ruled out once the normalization approach
below was worked out with the user: it fully removes the need for RN to know about hosts at all,
which is strictly simpler than keeping two lists (Kotlin's and RN's) in sync.

URL → screen resolution itself is still entirely React Navigation's own job (the `linking` prop,
`prefixes` + `config.screens`, reusing the routes in `frontend/src/navigation/routes.ts`) — no
path parser is reimplemented for that part. What Kotlin owns is strictly the normalization step
(rewriting the scheme/host away), never route/param parsing.

## What to do

### 1. Custom scheme (always on, static, committed)

- Register a **static** intent-filter in `AndroidManifest.xml`, on the existing launcher activity:
  `ACTION_VIEW` + `CATEGORY_DEFAULT` + `CATEGORY_BROWSABLE` + `data android:scheme="mymangareader"`
  (package-derived name, confirmed with the user — not a placeholder).
- This scheme is the one Task 005's `PendingIntent` builds against
  (`mymangareader://series/{seriesId}`, `mymangareader://reader/{seriesId}/{chapterId}`) — it must
  work with the app fully closed, since a tapped system notification can arrive at any time.

### 2. Optional http(s) App Link hosts (configurable per build, never committed)

Real App Links (a plain `https://` link opening the app directly, no custom scheme needed) require
real hosts, which are inherently personal/environment-specific — never something to hardcode or
commit.

- Up to 5 hosts (`host` or `host:port`), read from `local.properties` (already gitignored) under
  keys `deeplink.host1` .. `deeplink.host5`.
- A new Gradle task `generateDeepLinkHosts` in `android/app/build.gradle.kts`:
  - Reads whichever of the 5 keys are present.
  - Renders the corresponding `<intent-filter>` blocks (one host may need two `<data>` entries or
    two filters — one per known path shape, see point 3 below) as a XML string.
  - Writes that string into `AndroidManifest.xml` strictly between two fixed markers,
    `<!-- GENERATED_DEEP_LINK_HOSTS_START -->` / `<!-- GENERATED_DEEP_LINK_HOSTS_END -->`, which
    ship **committed and empty** (no hosts) in the versioned manifest.
  - Only rewrites the file if the newly-computed block differs from what's currently between the
    markers — must be idempotent, a repeated run with the same `local.properties` is a no-op.
  - Wired via `dependsOn` so it runs before any assemble/bundle task (every task whose name
    matches `pre*Build`).
- A companion task `clearDeepLinkHosts` rewrites the block back to empty — intended to run after
  producing a local APK, so a developer's personal hosts never linger in the working tree waiting
  to be accidentally committed.
- This mechanism is build infrastructure, not a `:notifications` concern — it lives entirely in
  `android/app/build.gradle.kts` and `android/app/src/main/AndroidManifest.xml`. Nothing about it
  is notification-specific; it exists so any future feature needing a real App Link can reuse the
  same two markers.
- No `BuildConfig` field or any other runtime-visible list of these hosts is needed anywhere —
  Android itself already validates an incoming URI against the generated intent-filters before
  `MainActivity` is ever started, so nothing downstream (not even Kotlin) needs to re-check which
  host it was.

### 3. Path shapes covered by every host (custom scheme and http(s) alike)

Both known routes get an intent-filter (`pathPattern`, Android's simple glob syntax):

- `/series/*` → maps to `Routes.SERIES_DETAIL`.
- `/reader/*/*` → maps to `Routes.READER`.

### 4. Kotlin-side normalization — `DeepLinkNormalizer.kt` + `MainActivity`

- `android/app/src/main/kotlin/com/mymangareader/DeepLinkNormalizer.kt` — one pure function,
  `normalizeDeepLinkUri(rawUri: String): String?`. Strips the scheme (and, for http(s), the host —
  a custom scheme has no host/authority segment to strip) and rebuilds the same path under the
  `deeplink://` prefix (e.g. `mymangareader://series/123` → `deeplink://series/123`;
  `https://myhost.example/series/123` → `deeplink://series/123`). Returns `null` when there is no
  meaningful path at all (nothing to rewrite) — the caller then leaves the Intent's data untouched.
- `MainActivity.kt`:
  - Overrides `getIntent()`: reads `super.getIntent()`, normalizes its `data` (if any), and returns
    a copy of the Intent with the rewritten URI — or the original Intent unchanged if there was
    nothing to normalize. RN's own `Linking` module reads the deep link URI via `getIntent()`
    (both cold start and, after `onNewIntent` below, a warm one), so intercepting here is the one
    place that guarantees RN never sees anything but `deeplink://`.
  - Overrides `onNewIntent(intent)`: calls `setIntent(intent)` (the documented pattern for Android
    deep links reaching an already-running Activity) so the next `getIntent()` read picks up the
    new, not-yet-normalized Intent through the same override above.

### 5. RN side

- `frontend/src/navigation/linking.config.ts` (+ tests): the `LinkingOptions` object.
  - `prefixes: ['deeplink://']` — a constant. Never references `mymangareader://` or any host.
  - `config.screens`: maps `Routes.SERIES_DETAIL` to `'series/:seriesId'` and `Routes.READER` to
    `'reader/:seriesId/:chapterId'`.
- `App.tsx`: add a `linking` prop to `NavigationContainer`, sourced from `linking.config.ts`.
- `RootNavigator.tsx`: replace the placeholder comment on the `SERIES_DETAIL` screen (currently
  referencing two schemes that were never implemented) with one that names the real scheme RN
  resolves (`deeplink://series/:seriesId`) and notes that the public `mymangareader://` scheme is
  rewritten to it by `MainActivity` before RN ever sees it.

## Files to create

- `android/app/src/main/kotlin/com/mymangareader/DeepLinkNormalizer.kt` (+ test)
- `frontend/src/navigation/linking.config.ts` (+ tests)

## Files to modify

- `android/app/src/main/AndroidManifest.xml` (static custom-scheme intent-filter + the two
  generated-block markers, committed empty)
- `android/app/build.gradle.kts` (`generateDeepLinkHosts` + `clearDeepLinkHosts` tasks)
- `android/app/src/main/kotlin/com/mymangareader/MainActivity.kt` (`getIntent()` override,
  `onNewIntent`)
- `frontend/src/App.tsx` (`linking` prop, sourced from `linking.config.ts`)
- `frontend/src/navigation/RootNavigator.tsx` (placeholder comment update, around the
  `SERIES_DETAIL` screen registration)

## Acceptance criteria

- `mymangareader://series/123` opens the app (from fully closed) directly on `SerieScreen` with
  `seriesId=123`.
- `mymangareader://reader/123/456` opens the app (from fully closed) directly on the Reader with
  `seriesId=123`/`chapterId=456`.
- A configured http(s) host's link (e.g. `https://myhost.example/series/123`) behaves identically
  once at least one `deeplink.hostN` is set.
- The versioned `AndroidManifest.xml` never contains a real host between the generated markers —
  only whatever `local.properties` supplies locally, and only in a non-committed working tree
  state.
- Running `generateDeepLinkHosts` twice in a row with the same `local.properties` does not rewrite
  the manifest the second time (content-equality check, not just "task ran").
- `clearDeepLinkHosts` restores the block to empty regardless of what was previously generated.
- `linking.config.ts`'s `prefixes` never changes regardless of how many hosts are configured.

## Testing

- Kotlin/JUnit (no Robolectric needed — `normalizeDeepLinkUri` is a pure `String -> String?`
  function): custom scheme with a path, http(s) with a path (host stripped), http(s) with a port,
  custom scheme with no path (`null`), http(s) host with no path / trailing slash only (`null`).
- Jest: a test resolving `linking.config` against `deeplink://series/123` and
  `deeplink://reader/123/456` and asserting the extracted route + params match what
  `RootNavigator.tsx` expects (`SERIES_DETAIL` + `seriesId`, `READER` + `seriesId`/`chapterId`);
  a test asserting `prefixes` is exactly `['deeplink://']`.
- If the XML-block-generation logic can be isolated as a pure function (hosts in, XML string out),
  unit-test that function directly rather than only through the Gradle task itself.

## Project-pattern checklist

- No feature is gated by an `if` — hosts being present/absent is handled by the generated block
  simply being empty when absent, never a runtime branch.
- No personal data (real hosts, IPs) ever lands in a committed file — enforced by the
  generate/clear task pair and by the markers always shipping empty.
- `:notifications` is never touched by this task — deep links are a cross-cutting mechanism that
  Task 005 merely *consumes*, matching the "internal-only code never becomes a plugin, but a
  reusable cross-cutting mechanism lives at the right layer" spirit already documented in
  `architecture.md`.
- No new bridge/NativeModule is introduced by this task — normalization is a pure Kotlin
  `String -> String?` function plus one `Activity` method override, nothing crossing into RN.
