# Task 023 — `Cache` (Kotlin) + `CacheManager` (RN) implementation (Phase 4 — Implementation)

**Status:** todo (blocked by Task 021 — wires the RN Services built there to actually use
`CacheManager` instead of calling `Server` directly)

## Objective

Implement the two generic cache modules decided in Task 015, together, as the final piece that
closes the deliberately-deferred cache gap left open by Tasks 017-021: **`Cache`** (Kotlin, Layer
2) does generic get/put/invalidate by key, backed by Room, implementing only the `PERSISTENT`
mode. **`CacheManager`** (RN) is the single orchestrator resolving both `PERSISTENT` (delegates
to `Cache` via the bridge) and `VOLATILE` (resolved entirely in RN memory, never touching the
bridge) — callers never need to know which backend a given cache uses. Once this lands, the
Page/Chapter/Series Services from Task 021 are updated to call `CacheManager` instead of
`Server` directly.

## Why this is deliberately last

Per the user's explicit ordering rationale (recorded across Tasks 016-021): get the direct
network path working end-to-end first, with contracts modeled per-domain individually, before
introducing cache — so the base implementation isn't blocked waiting on the cache design to be
finalized. This task is where that deferred piece finally lands, closing the loop.

## Inputs

- Task 015's cache guideline (`_contract-design-notes.md` § "Task 015 — Cache guideline...") —
  the full design rationale for `Cache`/`CacheManager`/`CacheDescriptor`, and the explicitly
  deferred decisions this task must now resolve: whether a given field/domain is `PERSISTENT` or
  `VOLATILE` (per case, at this implementation time), and `CacheManager`'s exact API (function
  names/signatures, who dispatches the `EventBus` event on cache update, invalidation, cache-miss
  behavior, error representation).
- `.claude/docs/architecture.md` § "Cache Guideline — `Cache` (Kotlin) + `CacheManager` (RN)" —
  the standing guideline document.
- `CacheDescriptor` (`cache/contract.ts`) — already embedded as a field in `PageContract`/
  `ChapterContract`/`SeriesContract` (Tasks 018-020); this task is what actually resolves/
  refreshes that field, rather than it being an inert placeholder.
- Task 013's `EventBus` (RN→RN) design — `CacheManager` is a plausible first real consumer of
  `EventBus`, if a cache-updated notification is needed by more than one part of the app at once
  (confirm with the user whether this is actually needed now, or still deferred).

## Steps

1. Implement `Cache` (Kotlin, Layer 2): generic `get`/`put`/`invalidate` by key, single Room-backed
   `PERSISTENT` implementation (schema — single generic table vs. domain-specific tables — decided
   here, per Task 015's explicit deferral).
2. Implement `CacheManager` (RN): the single orchestrator resolving `PERSISTENT` (bridge call into
   `Cache`) and `VOLATILE` (in-memory RN, no bridge) transparently for the caller.
3. Decide, per field/domain (Page/Chapter/Series' `cache: CacheDescriptor | null` fields), whether
   it is `PERSISTENT` or `VOLATILE` — case by case, not a blanket rule.
4. Update the Page/Chapter/Series RN Services (Task 021) to call `CacheManager` instead of
   `Server` directly — this is the point where the "direct network, no cache" scope from Tasks
   017/021 ends.
5. Decide and implement `CacheManager`'s exact API surface (names, signatures, invalidation,
   cache-miss behavior, error representation) — previously deferred, resolved here for real.
6. Update `architecture.md` if the real implementation diverges from the guideline as written.

## Completion criteria

- `Cache` (Kotlin) implemented: generic get/put/invalidate, Room-backed `PERSISTENT` mode.
- `CacheManager` (RN) implemented: resolves both `PERSISTENT` (via `Cache` bridge) and `VOLATILE`
  (RN memory only) transparently.
- Every field/domain's `PERSISTENT` vs. `VOLATILE` classification explicitly decided and recorded.
- Page/Chapter/Series RN Services (Task 021) updated to use `CacheManager`, no longer calling
  `Server` directly.
- `architecture.md` updated if the real implementation diverges from the existing guideline text.
- Tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.
- Unblocks Task 028 (Library correction — its listing cache-then-network sequencing is finally
  owned by `CacheManager`, not an ad-hoc `@Volatile var`).
