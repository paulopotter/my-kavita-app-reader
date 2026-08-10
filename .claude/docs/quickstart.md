# Quick Start — load when you need commands/build/session info

---

## Development

```bash
# Validate environment and install dependencies
make setup

# Build debug APK (Kotlin shell)
make build-android

# Build JS bundle (React Native UI)
make build-bundle

# Install on physical device connected via USB
make deploy

# Stream app logs
make log

# Run Android unit tests
cd android && ./gradlew test

# Run JS tests
cd frontend && yarn test

# List connected devices
adb devices
```

Testing always happens on a real physical device — never an emulator.

Before generating a build that goes to the user's device: apply the
`versionar-build` skill (adds `-rcN` suffix to APK `versionName` AND JS
`bundleVersion` until explicit approval).

---

## OTA bundle

The JS bundle has its own version, independent of the APK version.
Both are bumped and tracked separately by `versionar-build`.

---

## Sessions and completions

- `.claude/sessions/active/` — plans in progress. Each plan is one folder:
  `README.md` (the plan) + `INDEX.md` (task table) + numbered task files.
- `.claude/completions/` — finished work:
  - One doc per finished task: `[YYYY-MM-DD]_NNN-task-name.md`
  - `.claude/completions/archive/` — whole plan folders once every task is done
- Neither is ever auto-loaded.
- Always translate to English when archiving.

Templates: `.claude/templates/`

---

## Release cycle

See `.claude/docs/release-cycle.md` for:
- How to write `[Unreleased]` bullets
- Versioning rules (app tag, Kotlin semver, RN semver)
- How to trigger an RC build via PR comment
- Which secrets are required

---

**Last Updated**: 2026-08-10
