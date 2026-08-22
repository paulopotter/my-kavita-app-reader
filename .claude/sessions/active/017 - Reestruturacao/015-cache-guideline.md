# Task 015 — Local cache guideline (Phase 3 — Cache guideline)

**Status:** done

## Objective

**Decision session with the user.** Decide when Room cache is mandatory, when in-memory cache
is acceptable, and — the most important open question — **who orchestrates** the cache→network
sequence. Today it is the RN hook/UI in every domain that decides "try cache first, then hit the
network"; this task decides whether that changes to a dedicated repository layer, and in which
cases.

## Inputs

- The original audit finding: Library has no Room cache at all (in-memory, 2-min TTL, does not
  survive restart) — most severe cache finding.
- Even in the "good" domains (Series Detail, Chapter, which do use Room), it is the RN hook that
  orchestrates cache-then-network — no repository layer arbitrates this transparently for the
  UI.

## Steps

1. Present both findings to the user.
2. Decide the guideline: when is Room mandatory (e.g. any list/detail data the user expects to
   see offline or across restarts) vs. when in-memory is acceptable (e.g. short-lived derived
   state that is cheap to recompute).
3. Decide who orchestrates cache→network: stays in the RN hook (status quo, documented as
   intentional) or moves to a dedicated repository/service layer (bigger change, affects Tasks
   016/017 and any future domain).
4. Decide whether this guideline becomes a formal `CLAUDE.md` invariant or stays a lighter
   guideline document (`architecture.md`) — user's call.
5. Write the guideline document. If it becomes a `CLAUDE.md` invariant, hand the wording to
   Task 024 rather than editing `CLAUDE.md` directly in this task.

## Completion criteria

- Cache guideline written and approved by the user, including the orchestration-ownership
  decision.
- Explicit decision recorded on `CLAUDE.md` invariant vs. `architecture.md` guideline.
- Guideline referenced by Task 016 (Library correction) before that task starts implementation.

## Result

Decided, via mini-iteration with the user, that both findings (Library's in-memory-only cache;
RN hook orchestrating cache→network for Series/Chapter) get resolved by two new generic modules,
not per-domain ad-hoc code:

- **`Cache` (Kotlin, Layer 2)** — generic get/put/invalidate by key, only implements the
  `PERSISTENT` mode. Real storage underneath (single generic Room table vs. domain-specific
  tables) deliberately left open, to be judged per real implementation case.
- **`CacheManager` (RN)** — the single orchestrator replacing the old "hook calls two native
  methods and decides the sequence" pattern. Resolves both `PERSISTENT` (delegates to the Kotlin
  `Cache` module via the bridge) and `VOLATILE` (resolved entirely in RN memory, never touches
  the bridge) — caller never needs to know which backend a given cache uses.
- **`CacheDescriptor`** (extends the placeholder already in `cache/contract.ts`) is the shared
  contract carrying `key`/`mode`/`cachedAtEpochMs`, created at Layer 2 and embedded inside every
  domain contract's `cache` field (`PageContract.cache`, `ChapterContract.cache`,
  `SeriesContract.cache`) — the same object handed to `CacheManager` when RN needs to
  resolve/refresh that value.

Deliberately deferred (same philosophy as `EventToken`, Task 013): whether a given field/domain
is `PERSISTENT` or `VOLATILE` (decided per case, at implementation time, not classified upfront
for existing contracts); and `CacheManager`'s exact API (function names/signatures, who
dispatches the `EventBus` event, invalidation, cache-miss behavior, error representation) — none
of this designed yet, deferred to real implementation.

Recorded in two places, per user's explicit decision on where each belongs:
- `_contract-design-notes.md` (§ "Task 015 — Cache guideline...") — the full design rationale,
  alongside every other domain-contract decision from this plan.
- `.claude/docs/architecture.md` (§ "Cache Guideline — `Cache` (Kotlin) + `CacheManager` (RN)")
  — the standing guideline, as an `architecture.md` entry rather than a `CLAUDE.md` invariant
  (user's explicit call: enough nuance/examples to need prose, not a short hard rule).

No code/tests involved — a design-decision task, `make coverage` does not apply.
