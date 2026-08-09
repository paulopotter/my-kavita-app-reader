# Backlog 007 — Reader Screen

## What
Manga reader: displays pages of a chapter, tracks reading progress.
Seventh screen in migration order — most complex.

## Why
The core feature of the app.

## Scope (when planned)
- Kotlin tools: `cachedRequest` for page images, `progress.save()` repo
- RN: `ReaderScreen` → `PageView` (dummy) + `ReaderControls` (dummy)
  + `useReader` hook + `ReaderService` + `ReaderTransform`
- Horizontal/vertical scroll modes
- Keep-screen-on (from Config preference)
- Progress saved on page turn and on exit
- Double-tap to zoom

## Dependencies
- Plan 001 (Config — keep-screen-on preference)
- Backlog 006 (Series Detail — chapter navigation source)
