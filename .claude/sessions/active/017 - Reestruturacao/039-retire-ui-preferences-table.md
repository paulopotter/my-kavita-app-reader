# Task 039 — Retire the `ui_preferences` Room table; move the 2 reading toggles to `:preferences` (Phase 5 — Corrections)

**Status:** done

> Promotes backlog item `.claude/sessions/backlog/items/022-aposentar-ui-preferences-room.md` to
> a numbered task. `ui_preferences` (Room, `:core`) is the last orphan of the old preference
> model — every other pref it held already moved: chapter sort → `ChaptersTool.sort`
> (`:preferences`, `chapterSortPrefs`, Migration_12_13); Library/Following layout →
> `library.prefs.ts` (`:preferences`, `libraryLayout`); language → OS per-app locale. Only two
> live booleans remain: `keepScreenOnDuringReading` and `immersiveModeDuringReading`.

## The catch (why it's not just a hook swap)

The two toggles have **two readers**:
1. Config's "Reading" sub-screen writes via `ConfigRepository.upsertUiPreferences` →
   `UiPreferencesEntity`.
2. The real Reader reads via `ScreenControlModule.getKeepScreenOnDuringReading()` /
   `getImmersiveModeDuringReading()` (Kotlin, same entity).

Migrating one side without the other breaks the other on-device.

## User decisions (2026-09-03)

- **No data migration.** `DROP TABLE` directly; the two toggles reset to their defaults
  (keepScreenOn=true, immersive=false) on the first boot after the upgrade and the user
  reconfigures them. Same precedent as `library.prefs.ts` and Migration_12_13 itself.
- **Slices 1a+1b (RN) merged** into a single RN commit (no window where Config writes the new
  store while the Reader still reads the old Kotlin one).

## Slices

### Slice 1 — RN (one commit)
- **New** `frontend/src/screens/config/reader/reader.prefs.ts` — `ReaderPrefs` object modeled on
  `frontend/src/screens/library/library.prefs.ts`: domain `readerPrefs`, single key `'reader'`,
  `variant` = `'keepScreenOn'` / `'immersiveMode'`, value `'true'`/`'false'` string. Defaults:
  keepScreenOn `true`, immersiveMode `false`. API: `getKeepScreenOn/setKeepScreenOn/
  getImmersiveMode/setImmersiveMode` → `PreferencesManager.get/put`.
- `frontend/src/screens/config/reader/reader.hooks.ts` — swap `ConfigRepository` for
  `ReaderPrefs`. Keep the hook's exposed shape (`prefs: {keepScreenOnDuringReading,
  immersiveModeDuringReading} | null`, `update(patch)`) so `reader.screen.tsx` (config) and its
  UI test are untouched; internally read/write via `ReaderPrefs`.
- `frontend/src/screens/reader/reader.screen-control.ts` — `fetchKeepScreenOnPref` /
  `fetchImmersiveModePref` call `ReaderPrefs.getKeepScreenOn()` / `.getImmersiveMode()`. Remove
  `getKeepScreenOnDuringReading` / `getImmersiveModeDuringReading` from `ScreenControlBridgeShape`.
  `keepScreenOn` / `allowScreenOff` / `setImmersiveMode` stay on the bridge.
- `frontend/src/shared/bridge/config.ts` — remove `interface UiPreferences` +
  `getUiPreferences` / `upsertUiPreferences` from `ConfigRepositoryModule`.
- Tests: `frontend/src/screens/config/reader/reader.tests.tsx` — mock
  `../../../shared/managers/preferences` instead of `ConfigRepository`. New
  `reader.prefs.tests.ts` modeled on `library.prefs.tests.ts`. Check `reader` screen tests that
  mock `reader.screen-control`.
- **Device-smoke** (rc bump): Config → Reading, toggle each; open the Reader, confirm
  keep-screen-on + immersive reflect the choice; kill the app, reopen, repeat. Kotlin still has
  the now-orphan DB methods (nobody calls them) — removed in slices 2-4.

### Slice 2 — Kotlin: `ScreenControlModule` side-effect-only + wiring
- `android/app/.../ScreenControlModule.kt` — drop `getKeepScreenOnDuringReading` /
  `getImmersiveModeDuringReading`, the `@Inject uiPreferencesDao`, `scope`, now-idle coroutine /
  `UiPreferencesDao` imports. Keep all WindowManager code + `zeroOutSystemBarsInsets` + the
  `WindowInsets` comments.
- `android/app/.../AppReactPackage.kt` — `ScreenControlModule(context)`; drop `@Inject
  uiPreferencesDao` + import if unused elsewhere.
- `android/app/.../MainApplication.kt` — drop `@Inject uiPreferencesDao` + the arg in the
  AppReactPackage call + import, if unused elsewhere.
- `android/app/src/test/.../ScreenControlModuleTest.kt` — delete the 2 `get*DuringReading`
  describes; fix the constructor in the remaining tests.
- Verify: `./gradlew :app:testDebugUnitTest koverVerify`.

### Slice 3 — Kotlin: strip `*UiPreferences*` from `ConfigRepository` / `ConfigStore`
- `android/tools/.../bridge/ConfigRepository.kt` — delete `getUiPreferences` /
  `upsertUiPreferences` + unused `Arguments` import.
- `android/tools/.../bridge/ConfigStore.kt` — delete `getUiPreferences` /
  `observeUiPreferences` / `upsertUiPreferences`, `@Inject uiPreferencesDao`, the
  `UiPreferencesDao` / `UiPreferencesEntity` imports.
- `ConfigRepositoryTest.kt` / `ConfigRepositoryRobolectricTest.kt` / `ConfigStoreTest.kt` —
  remove UI-pref cases; fix the `ConfigStore` constructor (no `uiPreferencesDao`).
- Verify: `./gradlew :tools:testDebugUnitTest :app:testDebugUnitTest koverVerify`.

### Slice 4 — Kotlin: DROP the table + entity/DAO + migration 13→14
- New pair in `android/core/.../database/migrations/Migration_12_13.kt` (the file already
  aggregates more than one pair):
  - `Migration_13_14` = `db.execSQL("DROP TABLE IF EXISTS ui_preferences")`.
  - `Migration_14_13` = `CREATE TABLE ui_preferences (...)` with the current 9-column schema
    (downgrade path — precedent `Migration_13_12`). Copy the CREATE from
    `android/core/schemas/com.mymangareader.core.database.AppDatabase/13.json`.
- `android/core/.../database/AppDatabase.kt` — `version = 14`; remove `UiPreferencesEntity::class`
  from the entity list + `abstract fun uiPreferencesDao()`; declare `MIGRATION_13_14` /
  `MIGRATION_14_13` where the others live.
- `android/core/.../database/DatabaseModule.kt` — remove `provideUiPreferencesDao`;
  `.addMigrations(...)` gains `MIGRATION_13_14` + `MIGRATION_14_13`.
- Delete `UiPreferencesEntity.kt` and `UiPreferencesDao.kt`.
- Schema JSON: the build generates `14.json` under `android/core/schemas/...` (via
  `room.schemaLocation`, `android/core/build.gradle.kts:34`). Commit it — `12.json`/`13.json`
  are versioned; `MigrationTestHelper` validates against it.
- `SchemaValidator.kt` only compares `version` (a number). Bump any hardcoded `13` in
  `SchemaValidatorTest.kt` / wherever `assertNoSchemaDrift` is called at boot.
- New `Migration_13_14_Test.kt` modeled on `Migration_12_13_Test.kt`: (a) v13→v14 drops
  `ui_preferences` (`sqlite_master` count 0); (b) downgrade v14→v13 recreates it empty.
- Verify: `./gradlew :core:testDebugUnitTest koverVerify`. **Device-smoke** (rc bump): install
  OVER an app that already has data (13→14 upgrade runs the DROP): app opens with no migration
  crash, Reader + Config work, toggles persist.

### Slice 5 — docs + close
- `.claude/docs/architecture-refactor-map.md` — §2.1 (Room tables table) and §4 (migration
  state): mark `ui_preferences` / `UiPreferencesDao` removed.
- `.claude/sessions/backlog/items/022-aposentar-ui-preferences-room.md` — delete, noting the
  completion doc / this task closed it.
- `finalizar-task`: task file `## Result`, `INDEX.md` → done, completion doc, `docs(session)`
  commit. Final `-rcN` bump if the last device-smoke passed.

## Risks

- `version` bump Room 13→14 — no other active task touches Room (032/033/034 are doc/skill
  safeguards). No conflict.
- `koverVerify` floor — `ScreenControlModule` / `ConfigRepository` / `ConfigStore` tests shrink;
  percentage may rise or the floor may need a bump. Run `make coverage`, follow the `CLAUDE.md`
  rule (`COVERAGE_FLOOR_KOTLIN` in `android/build.gradle.kts`).
- Slices 2-4 order — each removes dead code the previous left unused; out of order the Kotlin
  won't compile. Slice 1 (RN) is the only behavior change; 2-4 are cleanup.

## Completion criteria

- `ui_preferences` / `UiPreferencesEntity` / `UiPreferencesDao` deleted; Room at v14 with the
  13↔14 migration pair + `14.json`.
- The 2 toggles persisted via `PreferencesManager` (`readerPrefs`); `ScreenControlModule` is
  WindowManager-only; `ConfigRepository` / `ConfigStore` have no `*UiPreferences*` methods.
- `grep -rn "ui_preferences\|UiPreferences" android/ frontend/ --include=*.kt --include=*.ts
  --include=*.tsx | grep -v /build/` → empty (bar historical comments in migration files).
- `make coverage` (JS + Kotlin) green, no floor drop.
- Device-smoked: fresh install + upgrade-over-existing, both open clean; toggles work and
  persist across restart.
- Explicit user approval before `finalizar-task`.

## Result

**Delivered.** `ui_preferences` retired; Room at v14.

**Slice 1 — RN** (`d9a4b5c`). New `frontend/src/shared/tools/reader/reader-prefs.tool.ts` —
`ReaderPrefs` (`PreferencesManager`, domain `readerPrefs`, key `reader`, variants
`keepScreenOn`/`immersiveMode`, `'true'`/`'false'` string values). In `shared/tools/` because two
screens consume it (Config writes, Reader reads — same shape as `ChaptersTool.sort`). `config/
reader/reader.hooks.ts` and `reader/reader.screen-control.ts` now read/write via `ReaderPrefs`;
`shared/bridge/config.ts` lost `UiPreferences` + `getUiPreferences`/`upsertUiPreferences`.

**Slice 2 — Kotlin `ScreenControlModule`** (`3dd11e2`). Dropped `getKeepScreenOnDuringReading` /
`getImmersiveModeDuringReading`, the `@Inject uiPreferencesDao`, the `CoroutineScope`, idle
imports. Side-effect-only now (WindowManager). `AppReactPackage` / `MainApplication` stopped
injecting `uiPreferencesDao` into it.

**Slice 3 — Kotlin `ConfigRepository` / `ConfigStore`** (`0e0778b`). Removed all
`*UiPreferences*` methods, the `@Inject uiPreferencesDao`, `UiPreferencesDao`/`Entity` imports,
`FakeUiPreferencesDao` + the UI-pref test cases.

**Slice 4 — Kotlin `:core` DROP** (`Migration_13_14.kt` commit). New `Migration_13_14.kt`
(file-per-pair, as `scripts/validate-room-schema.sh` requires): `Migration_13_14` = `DROP TABLE
ui_preferences`; `Migration_14_13` recreates it empty with the v13 schema (downgrade path).
`AppDatabase` at `version = 14`, `UiPreferencesEntity` out of the entity list,
`uiPreferencesDao()` gone; `DatabaseModule` lost `provideUiPreferencesDao`.
`UiPreferencesEntity.kt` / `UiPreferencesDao.kt` deleted. `schemas/AppDatabase/14.json`
generated + committed. New `Migration_13_14_Test.kt` (drop + downgrade round-trip).

**Deviation from plan:** the migration went in its own `Migration_13_14.kt`, not aggregated
into `Migration_12_13.kt` — `validate-room-schema.sh` enforces one file per version pair.

**No data migration** (user's call): `keepScreenOn` / `immersiveMode` reset to their defaults
(true / false) once on the first post-upgrade boot; the user reconfigures.

**Also fixed here** (pre-existing immersive-mode bugs, own commits `a1db125` + `5f9a8ed`):
- `ScreenControlModule.setImmersiveMode` now sets
  `layoutInDisplayCutoutMode = LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES` (API 28+) and
  `zeroOutSystemBarsInsets` also zeroes `displayCutout()` — the reader draws behind the
  notch/camera.
- New `frontend/src/shared/context/immersive/` — `App.tsx` drops its root `paddingTop:
  statusBarHeight` while `immersive` is on (set by `reader.hooks.ts` on mount / cleared on
  unmount). Immersive off keeps the padding so notifications stay visible.

**Versions:** APK `0.8.0-rc105` → `0.8.0-rc109`; bundle `0.9.0-rc105` → `0.9.0-rc109`.

**Tests:** `./gradlew test koverVerify` green (incl. the 2 new migration tests + the 3 new
`ScreenControlModuleRobolectricTest` cutout cases); `yarn test:coverage` — 72 suites / 862 tests
green, coverage 91.75/90.98/79.74/91.75 (no floor drop); `scripts/validate-room-schema.sh`
green. Device-smoked at rc109 (`make redeploy-log`, install over existing): 13→14 migration ran,
app opened clean, toggles work and persist across restart, immersive mode draws edge-to-edge
behind the cutout.

**Approval:** user confirmed each device-smoke in this conversation ("funcionou" after rc108 for
the immersive fixes, "funcionou, pode fazer a fatia 5" after rc109 for slices 2-4).

## Out of scope / follow-ups

- `bff_match` (`BffMatchEntity`) is also fully orphaned — `BffMatchDao` has no real callers, only
  the `AppDatabase`/`DatabaseModule` registration. Candidate for the same `DROP TABLE` treatment,
  separate task.
- The other 7 legacy Room tables (`chapter_cache`, `series_detail_cache`, `reading_progress`,
  `page_cache`, `auth_config`, `server_config`, `bff_server_config`) still have live old-model
  code behind them (`KavitaChapterFeature`/`KavitaSeriesFeature`/`KavitaAuthFeature`/`BffFeature`)
  — they go only when those features are switched off.
