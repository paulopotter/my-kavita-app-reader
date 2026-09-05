# Task 001 — `:notifications` module scaffold — entities, DAOs, migration

## Why first

Every other task in this plan reads or writes this schema (connection groups, URLs, history). It
must exist before the provider, resolver, display, service, or either RN screen can be built.

## What to do

1. Create the new Gradle module `android/notifications/` (Layer 2, `:notifications`), wired into
   `settings.gradle.kts` the same way `:server`/`:external-metadata-server` are. Depends only on
   `:core`, `:cache`, `:preferences` — never on `:features`.
2. Room entities (living in `:core`'s `AppDatabase`, same split already used for
   `ServerGroupEntity`/`ServerUrlEntity`):
   - `NotificationGroupEntity` — id, priority-ordering metadata, enabled flag. Mirrors
     `ServerGroupEntity`'s shape.
   - `NotificationUrlEntity` — group id (FK), host, topic, priority. Mirrors `ServerUrlEntity`.
   - `NotificationHistoryEntity` — id (the deterministic per-series hash used for dedup, see
     README decision 7), seriesId, seriesName, chapterIds (stored as a delimited/JSON string
     column — follow whatever existing convention the codebase uses for a list-in-a-column, e.g.
     however `PageCacheEntity`-adjacent code already serializes lists, if any precedent exists;
     otherwise a simple JSON string column), chapterNumbers (same shape), detectedAtMs, read
     (Boolean), createdAtLocalMs.
3. New migration pair (forward + backward, per the `:core` convention — e.g.
   `Migration_14_15`/`Migration_15_14`) creating the three tables. Register in `AppDatabase.kt`
   (bump `version`, `exportSchema = true`) and `DatabaseModule.kt` (add to `addMigrations(...)`).
4. DAOs: `NotificationGroupDao` (CRUD + list ordered by priority), `NotificationUrlDao` (CRUD,
   `getByGroupId`), `NotificationHistoryDao` (`insertOrReplace` by id, `listAll` paginated-ready,
   `markRead(id)`, `markAllRead()`, `delete(id)`, `deleteOlderThan(epochMs)`, `countUnread()`).
5. `Notifications.kt` facade (the module's Layer 2 public API) exposing group CRUD and history CRUD
   as thin passthroughs — no provider/service logic yet (that's Tasks 002-005). This task only
   proves the schema compiles and round-trips.

## Files to create

- `android/notifications/build.gradle.kts`
- `android/notifications/src/main/kotlin/com/mymangareader/notifications/NotificationGroupEntity.kt`
- `android/notifications/src/main/kotlin/com/mymangareader/notifications/NotificationUrlEntity.kt`
- `android/notifications/src/main/kotlin/com/mymangareader/notifications/NotificationHistoryEntity.kt`
- `android/notifications/src/main/kotlin/com/mymangareader/notifications/Notifications.kt`
- `android/core/src/main/kotlin/com/mymangareader/core/database/migrations/Migration_14_15.kt` (+
  the `15_14` backward pair) — exact numbers to confirm against the schema version current at
  implementation time.
- Matching `src/test/` files for every DAO + the migration pair.

## Files to modify

- `settings.gradle.kts`
- `android/core/.../AppDatabase.kt`, `DatabaseModule.kt`

## Acceptance criteria

- Migration test: fresh install lands on the new version with all three tables empty.
- DAO tests cover insert/read/update/delete for groups, URLs (including `getByGroupId` ordering by
  priority), and history (`deleteOlderThan` only removes strictly older rows; `markAllRead` is
  idempotent).
- `koverVerify` passes; floor bumped if coverage rose.

## Project-pattern checklist

- Schema shape for groups/URLs is a deliberate mirror of `ServerGroupEntity`/`ServerUrlEntity` —
  no new pattern invented where an existing one already fits.
- `:notifications` depends only on already-promoted modules, never `:features`.
