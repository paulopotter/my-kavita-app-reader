# Task 003 — WebView dependency and `book-reader` route

**Status:** pending

## Why

The HTML fragment needs a WebView, which is a native dependency, and the reader needs its own
route.

## What to do

- Add `react-native-webview` to `frontend/package.json`.
- Link it into `:app`: add `implementation(project(":react-native-webview"))` to
  `android/app/build.gradle.kts` next to `react-native-screens`, then
  `rm -rf android/build/generated/autolinking` (see `.claude/docs/mistakes.md` #6).
- Add the new route `book-reader` to the navigation.
- This is a **native dependency: it needs a new APK**, not just an OTA bundle. Bump `-rcN` per the
  `versionar-build` skill; the user builds and installs.

## Contract-change gate

Approved: the new route `book-reader`. Its params follow Task 004.

## Tests

- Route is registered and resolves to the screen.
- `make coverage` must pass.

## Done when

- The app builds with the dependency linked and the route exists.
- The user installed the new APK.
