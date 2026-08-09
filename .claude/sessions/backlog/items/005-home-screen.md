# Backlog 005 — Home Screen

## What
Dashboard: recently added, recently read, recommended. Fifth screen in migration order.

## Why
Main landing screen after splash — aggregates content from multiple Kavita endpoints.

## Scope (when planned)
- Kotlin: multiple `kavita.*` repo calls (recently added, on deck, etc.)
- RN: `HomeScreen` → horizontal carousels + section headers (all dummy components)
- `HomeService` aggregates data from multiple domain services without new requests
  (data already fetched — transforms only)

## Dependencies
- Plan 001 (Config)
- Backlog 003 (Library) — shared series types
