# Task 022 — `ExternalMetadata`/BFF module implementation (Phase 4 — Implementation)

**Status:** done

## Objective

Implement the `ExternalMetadata` module (Layer 2) — the module decided in Task 012 for BFF/
external-metadata enrichment (a distinct purpose from Server's readable-content responsibility,
per Task 012's explicit decision that `BffFeature` becomes its own separate module rather than
being folded into `Server`). Follows the same generalizer pattern established for `Server` in
Task 014/017: a Layer 2 facade with zero provider-specific knowledge, routing to whichever
concrete metadata provider(s) are plugged in underneath.

## Scope decision deferred to implementation time

Whether this task is a **thin skeleton** (the module shape/routing exists, but internally still
delegates to today's `BffFeature` largely unchanged) or a **real migration** of `BffFeature`'s
existing logic into the new module's plugin structure is **not fixed here** — the user decides
in a mini-iteration when this task is actually picked up, the same way Task 028's Library scope
was revised mid-plan once real code was inspected. Do not assume either direction before that
conversation happens.

## Inputs

- Task 012's decision (`_contract-design-notes.md` § "Task 012") — `BffFeature` is its own
  module, not absorbed into `Server`.
- Task 014/017's generalizer pattern (folder nesting `<Module>/plugins/<provider>/`, facade-only
  routing, adapter doing the real translation) — the same shape applies here, with whatever the
  concrete metadata provider(s) are playing the role Kavita plays for `Server`.
- Today's real `BffFeature` code as the starting point for whichever scope (skeleton vs.
  migration) the mini-iteration decides.

## Steps

1. Present Task 012's decision and today's real `BffFeature` code to the user; decide the scope
   (skeleton vs. real migration) before writing any code.
2. Create the `ExternalMetadata` module (Layer 2) following the same generalizer shape as
   `Server`: the facade knows only routing, the adapter(s) (nested under
   `ExternalMetadata/plugins/<provider>/`) hold the real translation logic.
3. Implement whichever scope was decided — either the routing skeleton alone, or the full
   migration of `BffFeature`'s existing behavior into the new structure.
4. Confirm Series' `syncBff` orchestration (per Task 028's decision — RN decides *when* to sync;
   the Series↔`ExternalMetadata` composition happens inside Kotlin as same-layer delegation)
   still works against whichever scope was implemented.

## Completion criteria

- Scope (skeleton vs. real migration) explicitly decided with the user before implementation,
  and recorded in this task's result.
- `ExternalMetadata` module exists as a Layer 2 generalizer, structurally consistent with
  `Server`'s pattern (facade routing only, adapter doing real translation, nested plugin folder).
- Whatever scope was implemented is tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.

## Result

**Scope:** real migration, not a skeleton. New module `:external-metadata-server`, Gradle
sibling of `:server` (Task 012's decision reaffirmed and clarified: real Gradle-module isolation,
not folder-only separation within `:server`), with a from-scratch adapter (`M3Plugin`, provider
id `"m3"`) inspired by but never copying `BffFeature`'s logic. `BffFeature` itself is untouched
and still in production — RN's actual consumers (`LibraryModule`/`SplashSyncCoordinator`/
`SetupModule`) were not migrated to the new module in this task; that's deferred to a future task.

**What was built, layer by layer:**

- **`:core`** — `ExternalMetadataGroupEntity`/`UrlEntity` (Room), migration v9→v10 (one-time
  snapshot copy from legacy `bff_server_config`), DAOs.
- **`:server`** — `Server.group(id).getInfo()` and `Server.getActiveGroupInfo()` (new,
  group-plus-all-urls shape, credentials/healthCheckPath omitted), reused by ExternalMetadataServer
  to resolve the Server↔ExternalMetadata link.
- **`:external-metadata-server`** (new module) — `ExternalMetadataServer` facade replicating
  `Server`'s full shape (`providers`/`groups`/`group(id)`/active-group state with its own
  `activeMutex`/`setActiveGroup`/`reauthenticateActiveGroup`/`getActive*`), minus the content tree
  (no `serials`/`chapters`/`page` — `match`/`matches` namespaces are the sole domain operations,
  each with 4 resolution shapes: `sync` (no hint, 2-level fallback), `syncByGroup`,
  `syncByServerId`, `syncByServerUrl`). `Server` is never a constructor dependency — passed by
  parameter only where same-layer composition (R1) is needed. `M3Plugin` caches its `/manga`
  listing for 180s (own constant, wider than the generic 3s window) since M3 has no
  single-series endpoint.
- **`:content-digest`** — `SeriesDigestOptions.includeExternalMetadata`/`externalMetadataGroupId`;
  new `buildExternalMetadataDigest` (own builder, same shape as `buildChapterDigest`), returning
  `ExternalMetadataDigest` (`Success`/`Failure` — "no group configured" is a `Failure` with a
  stable `not_configured` error code, discovered internally, never a bool passed in).
  `SeriesFields.Metadata.external` populated only when asked.
- **`:app`** — `ExternalMetadataBridgeModule` (new), `DigestBridgeModule.getSeriesDigest` now
  takes an `options` `ReadableMap`.
- **Frontend (`frontend/src/shared`)** — `bridge/external.ts` (new), `bridge/digest.ts` updated;
  `services/servers/external.services.ts` (new — `ExternalsService`/`ExternalService`, "server"
  surface only), `ServerService.external`; `SerialsService.externalDetails`/`SerialService.
  externalDetail` (convenience `sync`, plus `raw.externalDetail(s)` exposing all 4 resolution
  shapes); new barrel `shared/services/index.ts`.
- **Debug screen** — new "External" smoke-test section plus a `SerialService.externalDetail.sync`
  step in the existing Serial section.

**Real-device test:** user ran the Debug screen's External section and the extended Serial
section against their real M3/Kavita setup — confirmed working end to end.

**Coverage:** `make coverage` passed for both Kotlin and JS. Kotlin line coverage rose from
~76% to ~77.13% (module-wide, via the combined `koverHtmlReport koverXmlReport koverVerify`
run — `koverVerify` alone, without the report tasks, measures a stale/incomplete number and
should never be trusted in isolation). Floor bumped `76→77`
(`COVERAGE_FLOOR_KOTLIN`, `android/build.gradle.kts`). JS floor also bumped (`45/45/70/86` →
`46/46/71/87`, `frontend/package.json`).

**Known gap, not blocking:** `external.services.ts` (RN) has no dedicated unit tests yet — only
verified via the real-device smoke test, not the mocked-bridge pattern the rest of `shared/
services` uses. Flagged as follow-up, not fixed in this task (see next-task prompt).

**Also found during this task:** a flaky test in `ExternalMetadataServerTest.kt`
(`match syncByServerId falls back to the unlinked group when no link matches`) that fails only
when run via `make coverage` (debug+release variants together), never in isolation — likely
`ActiveUrlSelector`'s file-level `Timer` singleton or MockWebServer port reuse across variants.
Flagged as a background task (`task_3e9c47ac`), not investigated further here.
