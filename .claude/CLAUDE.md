# mymangareader

Kotlin shell + React Native UI + OTA bundle. GPL v3. Open-source.

## Docs (load on demand)
- Commands/build/sessions → `.claude/docs/quickstart.md`
- File locations/layers → `.claude/docs/architecture.md`
- Pitfalls → `.claude/docs/mistakes.md`

## Invariants
- No personal data in code (no IPs, tokens, private usernames)
- Features gated by missing config, never by `if`
- Screen never imports from another screen — only `shared/`
- Dummy component never imports a service
- Kotlin tool always global, never screen-coupled
- Used by 2nd screen → promote to `shared/`
- Kotlin layers: `core` ← `tools` ← `features` (unidirectional)
- Zero telemetry / analytics / user identifiers
- Domain Composition: micro → macro (Page → Chapter → Series → Library).
  Each domain only handles its own concern and delegates downward.
  See architecture.md § Domain Composition for full rules.

## Rules
- Replies → pt-BR; code + `.claude/` → English
- Commits: Conventional Commits, pt-BR message, no Co-Authored-By
- Build for device → `versionar-build` skill (APK + bundle both get `-rcN`)
- Test + approval before commit
- Data flow: `Kotlin Tool → Hook → Service → Transform → Screen → Component`

## Coverage
- Every feature ships with tests. Only skip if technically impossible — ask the user first.
- Never let coverage drop below the current floor (checked by `koverVerify` + Jest threshold).
- After finishing a task: run `make coverage`. If coverage increased, bump the floor:
  - Kotlin: `COVERAGE_FLOOR_KOTLIN` in `android/build.gradle.kts` → `minValue`
  - JS: `coverageThreshold` in `frontend/package.json`
- Cannot commit Kotlin/TS source without passing `make coverage` first (pre-commit hook enforces this).
- Cannot close a task without passing coverage.
- Floors: Kotlin LINE ≥ 40% · JS statements ≥ 20% lines ≥ 20% functions ≥ 36% branches ≥ 70%
