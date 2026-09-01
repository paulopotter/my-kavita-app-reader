# Data freshness — the 3 principles

The single reference every read path — Digest builders (Kotlin), Services/Tools (RN), screen
hooks — must follow. When a concrete rule (e.g. `resolveInitialPage`) seems to contradict one of
these, the principle wins; fix the rule. See also `architecture.md` § Cache Guideline for the
mechanism these principles ride on.

*Consolidated during the plan 017 Reader migration (Task 029), 2026-09-01, after several rounds
where cache rules and UI rules kept fighting each other.*

## The 3 principles

### 1. Force always wins

An explicit `force: true` (pull-to-refresh, "reload") bypasses every cache and every optimistic
override. The value it fetches from the server is authoritative for that moment, full stop.
Nothing — not a session override, not a still-valid cache entry, not a local optimistic mark —
takes precedence over a force refresh's result.

### 2. Cache-first, refresh in background

A normal read (mount, focus, navigation — no `force`) returns the cached value **immediately**
if present, and kicks off a background refresh from the server. The caller renders the cached
value now; when the fresh value lands it replaces it (and any subscriber is notified). This is
the default path and already lives in the Kotlin Digest builders (see `architecture.md` § Cache
Guideline). RN never re-implements this decision.

### 3. Optimistic local for instant feedback

An action the user just took (mark read/unread, follow) is reflected in the UI **before** the
server confirms — an optimistic value, applied locally, while the write goes out in the
background. Similar to #2 but the source is the user's own just-performed action, not
necessarily the cache. On confirm it's kept; on failure it's reverted.

## How they compose (precedence, highest first)

1. **Force refresh in flight / just completed** → its server value. Ignore everything below.
2. **Optimistic local value** for an action the user performed this session and that hasn't been
   superseded by a newer authoritative value → use it.
3. **Cache-first value** (immediate) + background refresh → use the cache value now, swap on
   refresh.
4. **Server fetch** (cache miss) → wait for it.
5. **Nothing** → the domain's defined "empty" (e.g. page 0, empty list).

"Superseded by a newer authoritative value" (step 2) means: a force refresh happened after the
optimistic value, OR a background refresh returned a value whose `resolvedAtEpochMs` is newer
than when the optimistic value was recorded. Timestamps are the tiebreaker, not source priority.

## Consequences for open work

- **`ChapterTool.mark.*` must invalidate the cache entries** it just wrote through — the
  `ChapterDigest` for that chapter AND the `SeriesDigest` for its series (both hold `readStatus`)
  — so the next non-force read doesn't serve the pre-mark value. Without this, principle #3
  leaks: the optimistic value only lives in the mounted component tree (via EventBus) and a
  screen that mounts later (e.g. the Reader opened after marking in the series screen) reads the
  stale cache. This is the concrete bug seen on device in Task 029.
  - **Tried and reverted in Task 029**: `invalidateDomain('chapter')` + `invalidateDomain('series')`
    — too broad, dropped every cached series/chapter for one mark. `invalidate` by key would
    need the Kotlin key format (`"{chapterId}:{full}"` variant `"full"` for ChapterDigest;
    `seriesDigestCacheKey(seriesId, options)` for SeriesDigest) replicated in RN — coupling the
    user explicitly rejected.
  - **Constraint for the real fix (user's explicit call):** the logic stays in RN. Kotlin's
    `:cache` / `:server` must remain as dumb as possible — no "invalidate the digests after a
    write" rule on the Kotlin side. The RN tool needs a scoped way to invalidate exactly the two
    affected entries without hardcoding the Kotlin key shape — e.g. the caller hands the tool the
    `digest.cache` descriptor(s) it already has, or `:cache` exposes a "list keys under domain X
    matching prefix Y" primitive the RN tool uses. To be designed in the cache task.
- **Local reading progress vs. server resume point** (Task 029 Fase 4): both carry a timestamp
  (`updatedAtEpochMs` / `recordedAtEpochMs`); newest wins — a direct application of "timestamps
  are the tiebreaker, not source priority".
- **A session-level override store** was considered (a generic namespace/key store as an
  EventBus companion) and set aside: with `resolvedAt` + the reconciliation rules it needs
  (force wins, drop on cache-invalidate, drop when a newer digest arrives) it becomes a second
  in-memory cache in front of `:cache`, duplicating exactly what the plan removes. Revisit only
  if a use case appears that cache invalidation genuinely can't serve.

## Applies to

Every read path in the app, and specifically: the cache-invalidation tasks (patch/invalidate the
digest after a write), Task 029/030 (Reader), Task 036 (Library on the digest stack), and the
Splash reconciliation task (push newer local progress → server, drop what the server caught up
to).
