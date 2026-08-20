---
name: versionar-build
description: Use every time you're about to generate an APK or JS bundle meant to be installed/deployed to the user's physical device. Bumps both APK versionName and JS bundle version (frontend/package.json → "version") to an -rcN suffix for unapproved test builds, and promotes to the clean version once the user explicitly approves. Do not use for CI-only or local compile-check builds.
---

# Versionar Build

This project has **two independent versioned artifacts**:

- **APK** — `versionName` in `android/app/build.gradle.kts`
- **JS bundle** — `version` in `frontend/package.json` (NOT `bundleVersion` —
  that field doesn't exist in this project; `version` is read at Gradle
  build time into `BuildConfig.RN_VERSION`, which the app displays as "F:"
  in its version footer)

Both must be bumped before any build that goes to the user's device — the
user relies on seeing a new `-rcN` in the app's version footer to confirm a
fresh build actually landed on their device, so skipping this step is a real
regression, not just a formality.

---

## Source of truth

- APK: `android/app/build.gradle.kts` → `defaultConfig { versionCode; versionName }`
- Bundle: `frontend/package.json` → `"version"`

`versionCode` is derived automatically from `git rev-list --count HEAD`
(`val gitCommitCount` in `build.gradle.kts`) — always strictly increasing on
its own. Never hand-edit it; nothing to bump here.

Always read the current values before changing anything.

---

## Before generating a build for the device (not yet approved)

### APK

1. Read `versionName` from `android/app/build.gradle.kts`.
2. Decide the target version:
   - **New feature** → bump minor, reset patch (e.g. `0.5.1` → `0.6.0`)
   - **Bugfix / tweak** → keep current version number
3. If no `-rcN` suffix yet → append `-rc1`.
4. If already `-rcN` for that version → increment N.
5. Edit `android/app/build.gradle.kts`. Do not touch `versionCode` — it's
   automatic.

### JS bundle

1. Read `version` from `frontend/package.json`.
2. Apply the same version-bump logic as the APK (they track the same
   feature scope, but their `-rcN` counters are independent).
3. Edit `frontend/package.json`.

### Then build

```bash
make build-android   # APK
make build-bundle    # JS bundle
```

Tell the user which `-rcN` this is for each artifact.

---

## When the user approves a specific build

1. Strip `-rcN` from `versionName` (e.g. `0.6.0-rc3` → `0.6.0`).
2. Strip `-rcN` from `frontend/package.json`'s `version` the same way.
3. Edit both files.
4. Natural moment to run `finalizar-task` if this closes out a plan task.

---

## Constraints

- Never install/deploy yourself — hand the APK to the user via `SendUserFile`
  or tell them where it is.
- Never mark approved (strip `-rcN`) without explicit approval from the user
  for that specific build.
- APK version and bundle version are independent — one can be approved
  before the other.
