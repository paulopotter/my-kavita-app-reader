---
task: 004 - features ActiveUrlSelector + KavitaAuth
plan: 001 - Config Screen
status: pending
---

# 004 — features/ — ActiveUrlSelector + KavitaAuthFeature

Business logic for URL selection and Kavita authentication, exposed to
JS via `ConfigRepository` extensions.

## Deliverables

`android/features/src/main/kotlin/com/mymangareader/features/kavita/`

- `ActiveUrlSelector.kt`
  - `getActiveBaseUrl(): Result<String>` — returns fastest responding URL (parallel health checks); caches result for 15 min
  - `getLastKnownBaseUrl(): String?` — returns last cached URL without checking
  - `invalidateAndReselect(): Result<String>` — bypasses cache, runs health checks again
  - Health check path: `GET {url}/api/Health` with configurable timeout per URL

- `KavitaAuthFeature.kt`
  - `authenticate(apiKey: String): Result<Unit>` — calls `POST /api/Plugin/authenticate`; stores JWT in `AuthConfigDao`
  - `extractApiKeyToken(input: String): String` — if input starts with `http(s)://`, extracts last path segment (handles OPDS URL paste)

**ConfigRepository extensions** (in `tools/`, calling into `features/`):
  - `testConnection() → {ok: Boolean, error?: String}` — delegates to `ActiveUrlSelector`
  - `authenticate(apiKey) → {ok: Boolean, error?: String}` — delegates to `KavitaAuthFeature`
  - `forceReselectUrl() → {activeUrl?: String, error?: String}` — delegates to `ActiveUrlSelector.invalidateAndReselect()`

## Verification

```bash
make build-android
# Expected: BUILD SUCCESSFUL
```

## Notes

- `ActiveUrlSelector` result is cached in memory (not Room) — resets on process death.
- Parallel health checks: all URLs checked simultaneously, first to respond wins.
- `features/` may depend on `core/` and `tools/` — never the reverse.
