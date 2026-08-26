# Task 023 — `Cache` (Kotlin) + `CacheManager` (RN) implementation (Phase 4 — Implementation)

**Status:** done

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

## Result

**Kotlin side** (`:cache`, `Cache`/`CacheStore`/`CacheDescriptor`/`PersistentCache`/
`MemoryKotlinCache`/`NetworkCache`) was already implemented, tested, and committed before this
session (see `af379bf`, `1794383`, `faf8e92`). This session's Kotlin work was narrower than the
task originally scoped: `PageDigest`/`ChapterDigest`/`SeriesDigest` already carried a real
`CacheDescriptor` internally, but `DigestBridgeMappers.kt` discarded it with an unconditional
`putNull("cache")` before crossing the bridge. Fixed to send the real descriptor when present
(commit `e4f74f0`); `CacheDescriptor.toWritableMap()`/`CacheEntry.toWritableMap()` were promoted
from private (inside `CacheBridgeModule.kt`) to a shared `CacheBridgeMappers.kt`, reused by
`DigestBridgeMappers.kt` instead of duplicated. `digest.ts` (TS) now types `cache:
CacheDescriptorBridge | null` instead of a hardcoded `cache: null` on the three digest successes.

**RN side** (`CacheManager`) diverges from the task's original 2-mode design
(`PERSISTENT`/`VOLATILE`) — that shape predates the real Kotlin implementation, which ended up
with 4 modes (`PERSISTENT`, `MEMORY_KOTLIN`, `MEMORY` [RN-only], `NETWORK`). `CacheManager`
(`frontend/src/shared/managers/caches/`, commit `8817389`) mirrors that: a root hub
(`get`/`put`/`invalidate`/`invalidateDomain`/`invalidateVariant`/`purgeExpired`/`purgeOlderThan`)
dispatching by `mode` via a `MODE_HANDLERS` lookup map, plus three mode modules (`persistent/`,
`memory/`, `network/`), each following the same folder/file naming convention as
`shared/services/` (plural folder, `<name>.<type>.ts`, `index.ts` aggregator, sibling test file).
`persistent` and `memory.external` are thin passthroughs over the already-existing `CacheBridge`;
`memory.local` (RN-only in-memory, no real consumer yet) and `network` (no RN bridge exists for
`Cache.network` — its `block` param is a Kotlin function that can't cross the bridge) are declared
as explicit-throw stubs, keeping the interface complete without inventing unused implementation.
`Methods.requireArgs` (new, `shared/tools/methods/methods.tool.ts`) is a generic runtime guard —
validates required object-argument fields with a dynamic error message, protecting a caller that
bypasses TypeScript (plain JS, `any`, `// @ts-ignore`), reused by `PersistentMode`/
`MemoryMode.external`.

**Explicitly NOT done, and why:** Page/Chapter/Series RN Services were **not** updated to call
`CacheManager` instead of `Server`, contrary to the task's original step 4/completion criteria.
Investigating this in-session revealed the premise no longer held: `buildPageDigest`/
`buildChapterDigest`/`buildSeriesDigest` (Kotlin, `:content-digest`) already do cache-first +
stale-while-revalidate entirely inside Kotlin, before the RN Service ever sees a result — there
is no cache-first decision left for a Service to make. `CacheManager` therefore has no real
consumer yet; it exists as a ready, tested surface for whichever future need actually requires
direct cache access from RN (manual invalidation, a settings-screen "clear cache" action, etc.).
`purgeExpired`/`purgeOlderThan` on app startup — the task's other still-open item — was
deliberately deferred to whenever the splash screen is rewritten for the new architecture (the
user's call: the splash will interact heavily with cache/background requests, so wiring purge
into the current splash now would likely be thrown away).

**Versions:** no `versionar-build` bump — no APK/bundle change, TS/Kotlin-only.

**Tests:** `make coverage` (Kotlin: `koverHtmlReport`/`koverXmlReport`/`koverVerify`, piso 76%,
unchanged this session; JS: piso subiu de 46/46/71/87 para 47/47/73/88%
statements/lines/functions/branches, refletindo cobertura nova real de `CacheManager` — 74 testes
próprios, 489 no total). Não testado em dispositivo real — task não envolveu nenhum fluxo de UI
visível, só módulos de infraestrutura sem consumidor ainda.
