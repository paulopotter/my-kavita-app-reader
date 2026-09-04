# Task 017 — Implement the `Server` module for real (Phase 4 — Implementation)

**Status:** done — see `## Result` below. Design diverged from this doc's original framing in
several places (confirmed with the user throughout).

## Objective

Implement the `Server` module (Layer 2) for real, per Task 014's structural design: routing
(which provider is active — today, only Kavita) plus a `KavitaAdapter` (inside
`Server/plugins/kavita/`) that translates the raw plugin's native format into the shared internal
contract. `Server` exposes domain methods directly (e.g. `Server.getChapter(id)`,
`Server.getSeries(id)`), resolving the active provider transparently inside each call — there is
no standalone "get active implementation"/"list implementations" operation, per Task 014's final
simplification.

**No cache in this task.** Every call goes straight to the network. Caching (`Cache`/
`CacheManager`) is deliberately deferred to Task 023, at the end of this phase — the goal here is
to get the direct network path working end-to-end first, without the cache design blocking the
rest of the base.

## Inputs

- Task 014's structural design (`_contract-design-notes.md` § "Task 014" — all 4 entries), in
  particular: the routing-only responsibility of `Server` itself, the adapter doing the real
  translation, `Server`'s public API being independent of the adapter interface's shape, and
  infrastructure-only methods with no adapter counterpart (e.g. `Server.getActiveUrl()`, using
  the `UrlSelector` tool directly — absorbing `KavitaUrlSelector` per Task 012's decision that it
  is removed entirely).
- Task 016's relocated plugin — `KavitaAdapter` lives inside `Server/plugins/kavita/`, alongside
  the raw plugin code it adapts.

## Steps

1. Create the `Server` facade module (Layer 2) exposing domain methods directly
   (`Server.getChapter(id)`, `Server.getSeries(id)`, and any other operation the Layer 3 contracts
   from Tasks 018-020 will need) — `Server` itself has zero domain knowledge, only routing to the
   active provider.
2. Implement `KavitaAdapter` inside `Server/plugins/kavita/`, doing the real translation from
   Kavita's native DTOs (already relocated in Task 016) into whatever intermediate shape `Server`
   needs to hand upward — this is where real domain understanding lives, not in `Server` itself.
3. Absorb `KavitaUrlSelector`'s logic directly into `Server` (per Task 012), using the generic
   `UrlSelector` tool — no provider-named URL-selection class survives.
4. Wire every call straight to the network — no cache-then-network sequencing, no TTL, no
   `CacheDescriptor` resolution yet (that is Task 023's job).
5. Confirm the design validates on paper against a future second provider (no real second
   provider needs to exist — just confirm nothing in `Server`'s public API assumes Kavita).

## Progress so far

Steps 2 (adapter) done, with a materially different shape than sketched above — confirmed with
the user at each design decision:

- **`ServerPlugin`** (`server/plugins/ServerPlugin.kt`) — the generic contract, grouped by domain
  (`auth`, `serials`/`serial(id)`, `Serial.chapters`/`chapter(id)`, `Chapter.pages`/`page(index)`)
  rather than a flat method list. Every operation throws on failure instead of returning `Result`
  (the standing convention for everything built in `:server`, not just this file). Provider-
  agnostic shapes (`PluginSerial`, `PluginChapter`, `PluginProgress`, `PluginPageDimension`) carry
  only scalar fields — no entity nests another entity's list (e.g. no `chapters: []` inside
  `PluginSerial`); callers fetch related entities explicitly via `.chapters`/`.chapter(id)`.
  Exposes `DEFAULT_READ_PROTECTION_WINDOW_MS` (3s) as an optional convention adapters may use or
  ignore.
- **`KavitaServerPlugin`** (`server/plugins/kavita/KavitaServerPlugin.kt`) — the `KavitaAdapter`
  from this doc's step 2, implementing `ServerPlugin` on top of the raw plugin from Task 016.
  `apiKey` required at construction; `jwt`/`refreshToken` optional and mutable (the only state
  this class holds) — any operation lazily authenticates via `ensureToken()` if no JWT is held
  yet, remembering the result; `auth.getToken()` lets whoever built the plugin read the current
  JWT back (e.g. to persist it) without a network call. `auth.reauthenticate()` uses the real
  `refreshToken` Kavita returns alongside the JWT (previously discarded in an earlier draft).
  `Serial`'s `listVolumesForSeries` call is memoized per-instance (`Mutex`-guarded single-flight +
  the 3s window) since `Chapters.list()` and `Chapter.get()` both read the same underlying data —
  every write that could affect it (`setRead`, `setProgress`) invalidates it immediately.

## Result

Steps 1, 4, 5 done for real; step 3 deliberately deferred (see below). Built across several
co-creation mini-iterations, confirmed with the user at each design decision:

- **`Server` facade** (`server/Server.kt`) — the routing/orchestration layer. Knows only
  `ServerPlugin`/`ServerPluginRegistration`, never a concrete plugin. Covers: provider catalog
  (`providers.list()`), full group CRUD (`groups.add/update/list/get/remove`) with per-provider
  credential validation via `ServerPluginRegistration.credentialFields`, per-group URL CRUD
  (`group(id).getUrls/addUrl/updateUrl/removeUrl`), active-group selection/authentication
  (`setActiveGroup`/`reauthenticateActiveGroup`, session state generalized as an opaque blob via
  `Auth.getSession()` — never assumes a "jwt" field exists), and a content-call mirror of
  `ServerPlugin`'s own tree (`serials`/`serial(id)`/`chapters`/`chapter(id)`/`page(index)`), with
  `auth` deliberately excluded (already handled internally).
- **URL resolution** (step 4/5, done differently than sketched): `Server` uses the generic
  `UrlSelector` tool directly (no provider-named wrapper) via `ServerGroupEntity`/`ServerUrlEntity`
  (new Room tables in `:core` — `server_group`/`server_url`, replacing the old
  `server_config`/`auth_config` model for this new path; migration 8→9 copies existing data as a
  one-time snapshot, paired with a 9→8 downgrade). Two operations landed beyond the original
  scope, both explicitly requested: `Group.validateUrls()` (tests every URL fresh, ignoring the
  15-min cache — for a "test my server" config-screen flow) and automatic retry-with-reselect on
  any content call that fails with a network `IOException` (one retry against a freshly-resolved
  URL, transparent to the caller — for the "wifi switched mid-session" case).
- **RN↔Kotlin bridge** (new, not in original scope but a natural extension once the facade
  existed): `ServerBridgeModule.kt` (`:app`) exposes every `Server` operation as a
  `@ReactMethod`+`Promise` pair, following the existing `SeriesModule`/`resolveOrReject` pattern.
  `frontend/src/shared/bridge/server.ts` mirrors it in TS. No screen consumes it yet — this is
  wiring only, validated by compiling/type-checking, not by exercising it on device.

**Step 3 (`KavitaUrlSelector` absorption) deliberately deferred, not abandoned.** Confirmed with
the user: this doc's "no provider-named URL-selection class survives" refers to the *new* path
(`Server` already uses the generic `UrlSelector` directly, satisfying that for anything built
here). `KavitaUrlSelector`/`KavitaUrlSource` still exist and are still the real production path —
`KavitaAuthFeature`/`KavitaSeriesFeature`/`KavitaChapterFeature`/`ActiveUrlWatcher`/
`SplashSyncCoordinator`/`SetupModule` all still depend on them. Migrating those consumers onto
`Server` and then deleting the old class is explicitly Task 021's job (wires RN Services to
`Server` for real) followed by Task 024-028 (the "Corrections" phase that removes the old
`features/kavita/` code once the new base is proven) — not this task's, per the plan's own
sequencing. Cutting over now would mean swapping the app's actual production path before any
contract/service layer above `Server` exists to replace it.

**Testing:** automated only — `:server` module (104 tests: `ServerTest.kt`,
`KavitaServerPluginTest.kt`, `Migration_8_9_Test.kt`), `koverVerify`/`make coverage` passing
(Kotlin floor unchanged; JS floor unchanged too — the new `server.ts` bridge file, along with the
other pre-existing bridge files that are pure typing with no consumer yet, is excluded from JS
coverage calculation rather than lowering the floor). No real-device test — nothing in the app
calls `ServerBridgeModule`/`Server` yet, so there is nothing to exercise on a device; that
happens starting Task 021.

## Completion criteria

- [x] `Server` module exists, exposing domain methods directly, with zero Kavita-specific naming
  in its public API.
- [x] `KavitaAdapter` (inside `Server/plugins/kavita/`) does the real format translation; `Server`
  itself only routes.
- [~] `KavitaUrlSelector` no longer exists as a standalone class — satisfied for the *new* path
  (`Server` uses `UrlSelector` directly); the *old* class and its consumers are untouched,
  deliberately deferred to Tasks 021/024-028 per the plan's sequencing (see Result above).
- [x] Every `Server` method call goes directly to the network — no cache logic anywhere in this
  task.
- [x] Real-device testing — not applicable yet (nothing wired into the app to exercise); deferred
  to Task 021, confirmed with the user.
- [x] `make coverage` shows no drop relative to the current floor.
- [x] Explicit user approval before `finalizar-task`.
- Blocks Tasks 018-020 (the Layer 3 contracts consume `Server`'s methods) and, transitively,
  Task 021 (Services) and Task 023 (Cache, which wraps `Server` calls with caching at the end).
