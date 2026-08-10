---
task: 001 - Android scaffold
plan: 001 - Config Screen
status: pending
---

# 001 — Android Scaffold

Set up the Android project from scratch so that subsequent tasks have a
compilable base to build on.

## Deliverables

- `android/app/build.gradle.kts` — `applicationId = "com.mymangareader"`, `versionCode = 1`, `versionName = "0.1.0"`, `minSdk = 26`, `targetSdk = 35`
- `android/settings.gradle.kts` — includes `:app`, `:core`, `:tools`, `:features`
- `android/gradle/libs.versions.toml` — version catalog: Kotlin, AGP, Hilt, Room, RN bridge
- `android/core/build.gradle.kts`, `android/tools/build.gradle.kts`, `android/features/build.gradle.kts`
- `android/app/src/main/AndroidManifest.xml` — package, INTERNET permission, MainActivity
- `android/app/src/main/kotlin/com/mymangareader/MainActivity.kt` — RN host activity
- `android/app/src/main/kotlin/com/mymangareader/MainApplication.kt` — RN application + Hilt
- `android/gradlew` + `android/gradle/wrapper/` — Gradle wrapper

## Verification

```bash
# from the repo root
make build-android
# Expected: BUILD SUCCESSFUL (APK at android/app/build/outputs/apk/debug/app-debug.apk)
```

## Notes

- RN version to use: align with the version chosen in task 005 (frontend setup).
  If frontend hasn't started yet, pin to the latest stable RN at the time.
- No Compose dependency — UI is entirely in RN.
- Hilt for DI in the Kotlin shell only.
