# Task 003 — WebView dependency and `book-reader` route

**Status:** done

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

## Implemented (awaiting the device check)

Commit `228fbe3`: `react-native-webview` 13.12.5 (exact) in `package.json`/`yarn.lock`, linked with
`implementation(project(":react-native-webview"))` in `android/app/build.gradle.kts`; autolinking
regenerated and the generated `PackageList` registers `RNCWebViewPackage` (checked by compiling it).
Needs a NEW APK — an OTA bundle alone does not carry it.

**Deviation from the approved wording — no new route.** Instead of a `book-reader` route, the
existing `reader/:seriesId/:chapterId` route now renders `ReaderEntry` (`navigation/ReaderEntry.tsx`),
which picks the screen by the chapter's file format. Same user outcome (an EPUB opens the book
reader) with no change at any call site — series screen, dashboard, notifications, deep links — and
no new route or deep-link shape to maintain. The series screen passes `format` as an optional route
param so it does not have to ask.

## Result

Done, 2026-10-18 (commit `228fbe3`). The new APK was installed (rc8 onwards) and the WebView renders the
book. The route deviation stands: `ReaderEntry` picks the screen by the chapter's format, the series screen
hands it `format`, and a chapter opened from the dashboard or a notification falls back to asking.
