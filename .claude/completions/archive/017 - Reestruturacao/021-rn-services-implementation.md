---
status: done
---

# Task 021 — RN Services (Page/Chapter/Series) implementation (Phase 4 — Implementation)

**Status:** done

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

## Result

Implemented as 4 Services, not 3 — `PageService`, `ChapterService`, `SerialService`/
`SerialsService`, and `ServerService`/`ServersService` (the last one not in the original scope,
added because `Server` will also front BFF operations in the future). Each lives in
`frontend/src/shared/services/<domain>/<domain>.services.ts` (plural folder/file, `nome.type.ext`
convention — new project-wide standard from this task on, tests beside the file instead of
`__tests__/`, `Jest.testMatch` extended accordingly).

**Real design decisions, on top of the original scope:**
- Naming convention formalized: plural namespace = batch operation (`SerialsService.list`,
  `ServersService.providers.list`), singular = single-item (`SerialService.get`). Every exported
  namespace ends in `Service`.
- Every method with 2+ fields takes a single named-argument object, never positional params —
  this is what lets the generic `Methods.bound` (new tool, `shared/tools/methods/methods.tool.ts`)
  merge in fixed ids without knowing each method's signature. Every Service exposes its own
  `bound(ids)`, fixing repeated ids (`seriesId`/`chapterId`/`groupId`) with no state beyond that —
  every call still hits the bridge fresh.
- `full: boolean` became two named methods (`get`/`getFull`), never a boolean parameter. Binary
  writes (`setChapterRead`) became 3 public methods: `status.set({isRead})` (the real call),
  `read()`/`unread()` (convenience wrappers).
- `raw` is the single root namespace for direct, non-Digest `ServerBridge` reads (e.g.
  `ChapterService.raw.get`, `SerialService.raw.chapters.list`) — kept separate from
  Digest-backed `get`/`getFull`.
- Read/write scope grew beyond the original "GET-only" framing: `ServerBridge` (Task 017's
  `Server`) already had real, working writes (`setChapterRead`, `setChaptersRead`,
  `setChapterProgress`) and non-Digest reads that had never been wired to any RN Service — these
  now live alongside each Service's Digest-backed `get`/`getFull`. The pre-Digest bridges
  (`SeriesBridge`, `LibraryBridge`, sort prefs, screen-control, BFF sync) are untouched.

**Real bug found and fixed during device testing (out of the original scope, but blocking
verification):** `RequestTool.request`/`ActiveUrlSelector.selectFastest` used
`withTimeout(OrNull)` around a blocking `Call.execute()` — with no coroutine suspension point
inside, a timed-out coroutine only observes cancellation on its next real suspension, which never
comes until `execute()` itself returns. Under real Android network conditions (radio doze, a
network switch mid-request) this left `SerialsService.list()` hanging forever with no exception,
no log — reproduced live via the Debug smoke test screen. Fixed with a `java.util.Timer`
watchdog (independent thread, not coroutine-based) that calls `call.cancel()` after the timeout —
closing the socket forces a stuck `execute()` to return immediately. Registered as a real finding
in Task 035, which also covers the underlying reason this was findable at all: the app's session
still lives on the pre-`:server` auth path, with no JWT refresh — separate root cause, tracked
there, not fixed in this task.

**New Debug screen** (`frontend/src/screens/config/`, `ConfigScreen.tsx`/`DebugSmokeTest.ts`,
`AppVersions.tsx`): 5 toques on the app-version column unlocks a "Debug" menu item running a
read-only smoke test against all 4 Services (including `bound()`) on the real active server —
used to verify this task on-device and to catch the `RequestTool` hang above.

**Tested on a real device** (`make redeploy-log`), via the Debug screen: `ServersService`/
`ServerService` (providers/groups/group/urls/session), `SerialsService`/`SerialService` (list,
get, getFull, raw.get, raw.chapters.list via `bound`), `ChapterService` (get, getFull, raw.get,
progress.get via `bound`), `PageService` (get, raw.dimensions via `bound`) — all confirmed
working end-to-end against the real Kavita server, including the `RequestTool` fix.

`make coverage`: no drop relative to the floor — 100% statements/branches/functions/lines on all
4 new `*.services.ts` files and `methods.tool.ts`; Kotlin `koverVerify` passes project-wide
(`RequestTool`/`ActiveUrlSelector` changes covered by new tests simulating a never-responding
connection).
