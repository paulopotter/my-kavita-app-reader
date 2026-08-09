# Backlog 009 — Search Screen

## What
Full-text search across the Kavita library. Ninth (last) screen in migration order.

## Why
Needed once the library grows beyond what browsing can handle.

## Scope (when planned)
- Kotlin: `kavita.search(query)` — debounced, cancellable
- RN: `SearchScreen` → `SearchInput` (dummy) + results list (reuses `SeriesCard` from `shared/`)
- `useSearch` hook with debounce logic

## Dependencies
- Backlog 003 (Library — `SeriesCard` in `shared/`)
