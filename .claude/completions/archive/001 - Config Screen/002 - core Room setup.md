---
task: 002 - core Room setup
plan: 001 - Config Screen
status: pending
---

# 002 — core/ — Room Setup + Config Entities + DAOs

Create the database infrastructure needed by the Config screen.

## Deliverables

`android/core/src/main/kotlin/com/mymangareader/core/database/`

- `AppDatabase.kt` — Room database, version 1, exports schema
- `ServerConfigEntity.kt` — fields: `id: String (PK)`, `url: String`, `timeoutMs: Int`, `priority: Int`, `healthCheckPath: String`
- `ServerConfigDao.kt` — `upsert()`, `delete()`, `observeAll(): Flow<List<ServerConfigEntity>>`, `getAll()`
- `AuthConfigEntity.kt` — fields: `id: String (PK, fixed = "auth")`, `apiKey: String`, `jwt: String?`
- `AuthConfigDao.kt` — `upsert()`, `observe(): Flow<AuthConfigEntity?>`, `get()`
- `UiPreferencesEntity.kt` — fields: `id (fixed)`, `keepScreenOnDuringReading: Boolean`, `chapterSortMode: String`, `chapterSortFixedThreshold: Double?`, `chapterSortProgressPercent: Int`
- `UiPreferencesDao.kt` — `upsert()`, `observe(): Flow<UiPreferencesEntity?>`, `get()`
- Hilt module wiring `AppDatabase` + all DAOs

## Verification

```bash
# from the repo root
make build-android
# Expected: BUILD SUCCESSFUL
```

## Notes

- Never use `fallbackToDestructiveMigration()` — write real SQL migrations from v1.
- Schema export path: `android/core/schemas/`.
- `priority` in `ServerConfigEntity` determines URL selection order (lower = higher priority).
