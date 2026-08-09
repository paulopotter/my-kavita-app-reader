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

## Rules
- Replies → pt-BR; code + `.claude/` → English
- Commits: Conventional Commits, pt-BR message, no Co-Authored-By
- Build for device → `versionar-build` skill (APK + bundle both get `-rcN`)
- Test + approval before commit
- Data flow: `Kotlin Tool → Hook → Service → Transform → Screen → Component`
