---
task: 003 - tools request + ConfigRepository
plan: 001 - Config Screen
status: pending
---

# 003 — tools/ — `request` Tool + `ConfigRepository` Native Module

Create the first bridge primitive (`request`) and the first semantic
repository (`ConfigRepository`) exposed to React Native.

## Deliverables

`android/tools/src/main/kotlin/com/mymangareader/tools/`

**request tool:**
- `RequestTool.kt` — Native Module: `request(url, method, headers, body) → {status, body}`
  Uses OkHttp. No auth, no cache — raw HTTP only.

**ConfigRepository:**
- `ConfigRepository.kt` — Native Module exposing:
  - `getServers() → List<{id, url, timeoutMs, priority}>`
  - `saveServer(url, timeoutMs) → id`
  - `removeServer(id)`
  - `getApiKey() → String`
  - `saveApiKey(apiKey)`
  - `getPreferences() → {keepScreenOnDuringReading, chapterSortMode, chapterSortFixedThreshold, chapterSortProgressPercent}`
  - `savePreferences(prefs)`
  - `observeServers(callback)` — emits on every Room change
  - `observePreferences(callback)` — emits on every Room change

**Bridge registration:**
- `ToolsPackage.kt` — `ReactPackage` that registers `RequestTool` and `ConfigRepository`

## Verification

```bash
make build-android
# Expected: BUILD SUCCESSFUL
```

## Notes

- Native Modules must be registered in `ToolsPackage` and wired in `MainApplication`.
- All async methods use Promises (not callbacks) except `observe*` which use callbacks/events.
- `saveServer` generates a UUID in Kotlin, not in JS.
