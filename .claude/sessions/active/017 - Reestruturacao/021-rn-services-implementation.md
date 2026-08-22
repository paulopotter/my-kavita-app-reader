# Task 021 — RN Services (Page/Chapter/Series) implementation (Phase 4 — Implementation)

**Status:** todo (blocked by Task 020 — needs all 3 domain contracts implemented)

## Objective

Implement the RN Services (Layer 4) for Page, Chapter, and Series — the RN-side layer that
consumes the real Kotlin contracts from Tasks 018-020, calling the `Server` module (Task 017)
directly through the bridge. **Still no `CacheManager`/cache anywhere in this task** — the goal
is only to get the full network flow working end-to-end on the RN side, exactly mirroring Task
017's own "no cache yet" scope. `CacheManager` wiring is Task 023's job, at the end of this phase.

## Inputs

- Task 018/019/020's Kotlin contract implementations — the exact shapes the bridge hands to RN.
- Task 013's formalized RN→Kotlin mechanism (`@ReactMethod` + `Promise`, request→execution→
  response) — every Service call to Kotlin follows this single shape, no exceptions.
- The existing RN hooks/screens (Reader, Series Detail, Library-as-Series-listing) as the
  consumers these Services need to support once wired — this task builds the Services layer
  itself, not the screen/hook migration onto it (that lands per-domain in Phase 5's correction
  tasks, e.g. Task 024/028, and in Phase 6's Reader tasks).

## Steps

1. Implement a Page Service (RN) that calls the bridge method(s) exposing Task 018's `Page`
   contract, returning `PageResult` shapes to its RN callers.
2. Implement a Chapter Service (RN) that calls the bridge method(s) exposing Task 019's `Chapter`
   contract, returning `ChapterResult`/`ChapterNeighborContract` shapes.
3. Implement a Series Service (RN) that calls the bridge method(s) exposing Task 020's `Series`
   contract, returning `SeriesResult` shapes (including the listing operation Library needs, per
   Task 011's decision that Library is a listing operation on Series, not its own domain).
4. Every Service call goes directly to `Server` via the bridge — no cache check, no `CacheManager`
   reference, no TTL logic anywhere in this task's code.
5. Confirm each Service's real network round-trip works end-to-end (a manual smoke test per
   domain is enough at this stage — the full screen/hook migration to consume these Services,
   with cache included, happens in later tasks).

## Completion criteria

- Page, Chapter, and Series RN Services exist, each calling the corresponding Kotlin contract
  (Tasks 018-020) through the bridge, following the single RN→Kotlin `@ReactMethod`+`Promise`
  shape (Task 013).
- No `CacheManager`/cache logic anywhere in this task — direct network round-trip only, end to
  end, real device verified.
- Tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.
- Blocks Task 023 (`CacheManager` wiring — the Services built here are what gets modified to use
  `CacheManager` instead of calling `Server` directly, once Task 023 lands). Does **not** block
  Task 022 (`ExternalMetadata`/BFF is a separate module, independent of these 3 Services).
