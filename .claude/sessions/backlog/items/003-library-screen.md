# Backlog 003 — Library Screen

## What
Lists all series available in the Kavita library. Third screen in migration order.

## Why
Core feature — the main content discovery surface of the app.

## Scope (when planned)
- Kotlin tools: `request` (plan 001) + `authenticatedRequest` (new tool) + `kavita.getSeries()`
- RN: `LibraryScreen` → `SeriesCard` (dummy) + `useLibrary` hook + `LibraryService` + `LibraryTransform`
- Supports grid and list view modes (preference from Config)
- Infinite scroll / pagination

## Dependencies
- Plan 001 (Config Screen, API key, active URL)
