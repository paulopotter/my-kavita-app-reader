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

## Environment configuration (`.env`)

`.env` (repo root, gitignored) is the single source of truth for build-time config — copy
`.env.example`, fill in your values. `make setup` and `make build-android` both run
`scripts/env-to-local-properties.sh`, which converts `.env` into `android/local.properties`
(Gradle's own config format) before the build starts. Idempotent: a run with unchanged `.env`
content is a no-op (no `local.properties` mtime churn).

`.env` itself is optional — if it's absent, the script only needs `$ANDROID_HOME` or
`$ANDROID_SDK_ROOT` in the shell to resolve the SDK path, and every other key is simply absent
from `local.properties` (features gated by missing config just stay off, per this project's own
rule — nothing crashes). It only fails if the SDK can't be resolved by any means.

Keys today: `ANDROID_SDK_DIR`, `KAVITA_URL`, `KAVITA_API_KEY`, `OTA_MANIFEST_URL`, `BFF_URL`,
`NOTIFICATION_PROVIDER`, `NTFY_URL`, `NTFY_TOPIC`, `DEEPLINK_HOSTS` (comma-separated, up to 5 —
expanded into `deeplink.host1`..`deeplink.host5` for `android/app/build.gradle.kts`'s
`generateDeepLinkHosts` task, which renders them into `AndroidManifest.xml`'s App Link
intent-filters). `OTA_MANIFEST_URL` also has a CI-only path: `.github/workflows/release.yml`
injects it as a real environment variable for the release build, bypassing `.env` entirely —
`android/app/build.gradle.kts` reads `local.properties` first, then falls back to
`System.getenv("OTA_MANIFEST_URL")`.

To add a new build-time variable: add it to `.env.example` (documented, no real value) and to
your own `.env`; `env-to-local-properties.sh` copies any unrecognized `KEY=value` line straight
through unless it needs a Gradle-specific transformation (like `DEEPLINK_HOSTS`'s expansion).

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
