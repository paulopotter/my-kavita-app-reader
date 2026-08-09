# Backlog 004 — Following Screen

## What
Lists series the user is actively following (reading in progress).
Fourth screen in migration order.

## Why
Quick access to series the user cares about most.

## Scope (when planned)
- Kotlin: `kavita.getInProgress()` or equivalent endpoint
- RN: `FollowingScreen` → reuses `SeriesCard` from Library (promote to `shared/` if not already)
- Sorted by last read date

## Dependencies
- Plan 001 (Config)
- Backlog 003 (Library) — `SeriesCard` likely promoted to `shared/` there
