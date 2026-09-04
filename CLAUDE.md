# mymangareader

Kotlin shell + React Native UI + OTA bundle. GPL v3. Open-source.

## Docs — under `.claude/docs/`, load on demand
- Commands / build / sessions → `quickstart.md`
- File locations / layers → `architecture.md`
- Pitfalls → `mistakes.md`
- Read-path freshness (force / cache-first / optimistic) → `data-freshness.md`

## Code structure
- Data flow: `Bridge → Service → Tool/model → Hook → Screen → Component`
- A screen never imports from another screen — only from `shared/`. Used by a 2nd screen → promote to `shared/`
- A dumb component never imports a service; a Kotlin tool is always global, never screen-coupled
- A Service only calls its own bridge (`DigestBridge`/`ServerBridge`). Needs another domain →
  call that domain's Service, never its bridge/digest directly
- Provider knowledge lives only in `plugins/<name>/`, nested inside its generalizer module.
  Every external connection gets a generalizer + plugin (even with one provider); internal-only
  code never becomes a plugin
- New file: `name.type.ext`, folder/file always plural, test beside it (not `__tests__/`). A
  method with an argument → one named object, never positional
- Domain Composition: micro → macro (Page → Chapter → Series → Library); each domain handles only
  its own concern and delegates downward. Full rules → architecture.md § Domain Composition

## Process
- **Contract change** — a public hook signature, an event shape, navigation behavior, a domain
  digest (`useReader()`, an EventBus event, a route, `SeriesDigest`). Describe it in text and
  wait for approval **before** editing code, even if it looks small. A point fix (label, color,
  icon, typo, spacing — no behavior change) doesn't need this
- Test + approval before committing. Cannot commit Kotlin/TS source without `make coverage`
  passing (pre-commit hook enforces it)
- Build for device → `versionar-build` skill (bump `-rcN` + compile-check before asking the user
  to test). "The log" = the newest `/tmp/reader-log-v*.txt` by mtime, never the `N` last mentioned
- Commits: Conventional Commits, pt-BR message, no `Co-Authored-By`
- Replies → pt-BR; code + `.claude/` → English

## Fixed conventions
- No personal data in code (IPs, tokens, private usernames). Zero telemetry / analytics / user
  identifiers
- A feature is gated by missing config, never by an `if`
- All UI text is translatable — never hardcode a string in one language
- "Splash" = the RN one (`frontend/src/screens/splash/`). The native one is just the OS minimum
  — frozen

## Coverage
- Every feature ships with tests. Only skip if technically impossible — ask the user first
- Never let coverage drop below the current floor (`koverVerify` + Jest threshold)
- After a task: run `make coverage`. If it rose, bump the floor — Kotlin: `COVERAGE_FLOOR_KOTLIN`
  in `android/build.gradle.kts`; JS: `coverageThreshold` in `frontend/package.json`
- Cannot close a task without coverage passing
