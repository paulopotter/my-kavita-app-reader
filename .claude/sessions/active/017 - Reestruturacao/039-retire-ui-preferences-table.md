# Task 039 — Retire the `ui_preferences` Room table; move the 2 reading toggles to `:preferences` (Phase 5 — Corrections)

**Status:** todo

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
