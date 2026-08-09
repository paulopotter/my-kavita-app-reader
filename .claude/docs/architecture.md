# Architecture Map — load when you need file locations or layer rules

---

## Directory Structure

```
my-kavita-app-reader/
├── android/                    # Kotlin shell (Android)
│   ├── core/                   # Infrastructure: Room, lib adapters, build config
│   ├── tools/                  # Reusable capabilities: request, bridge, plugins, schema validator
│   ├── features/               # Business domains: kavita, bff, notifications
│   └── app/                    # Android shell: services, manifest, DI wiring
│
├── frontend/                   # React Native / Expo
│   └── src/
│       ├── screens/            # One folder per screen (DDD: domain-first)
│       │   └── library/
│       │       ├── components/ # Screen-specific dummy components
│       │       ├── hooks/      # Screen-specific hooks
│       │       ├── LibraryScreen.tsx
│       │       ├── LibraryService.ts
│       │       └── LibraryTransform.ts
│       └── shared/
│           ├── components/     # Generic reusable components
│           ├── hooks/          # Shared hooks
│           ├── services/       # Shared domain services (Series, Chapter…)
│           ├── transforms/     # Pure shared data functions
│           └── bridge/         # TypeScript types for Kotlin tools
│
├── docs/                       # Developer documentation
│   ├── architecture/
│   └── contributing/
│
├── site/                       # GitHub Pages (internationalised)
├── scripts/                    # build, setup, deploy, release helpers
│
├── .github/
│   ├── workflows/              # CI/CD pipelines
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE/
│
└── .claude/                    # AI documentation (English)
    ├── sessions/
    │   ├── active/             # Plans in progress
    │   └── backlog/items/      # Roadmap ideas without a numbered plan yet
    ├── completions/            # Finished task docs + archive/
    ├── skills/                 # Claude Code skills
    ├── agents/                 # Subagents
    └── templates/              # Document templates
```

## Kotlin Layer Rules

| Layer      | May depend on  | Never depends on |
|------------|---------------|-----------------|
| `core/`    | —             | `tools/`, `features/` |
| `tools/`   | `core/`       | `features/`     |
| `features/`| `core/`, `tools/` | —           |
| `app/`     | all three     | —               |

## Key Concepts

- **Plugin point**: one install file wires up the active implementation;
  the rest of the app only knows the abstraction.
- **Bridge RPC**: JS calls Kotlin tools (`request`, `cachedRequest`,
  `authenticatedRequest`, `db.*`, domain repos).
- **Bridge Stream**: Kotlin emits events RN observes (`events.notification`,
  `events.syncProgress`, `events.dbChanged`, `events.networkState`).
- **JS-side DB**: isolated SQLite (not Room) for tables owned entirely by JS.
  Can be promoted to Room later via a defined migration protocol.
- **OTA**: app checks `latest.json` on startup; downloads newer JS bundle
  in background; switches on next launch. Rollback: keeps previous bundle,
  marks stable after N crash-free opens.

## Versioning

- `android/app/build.gradle.kts` → `versionCode` / `versionName` (APK)
- `frontend/package.json` → `bundleVersion` (JS bundle)
- Both are bumped by the `versionar-build` skill before any device build.

---

**Last Updated**: 2026-08-08
