# Task 018 — Contract: Page implementation (Phase 4 — Implementation)

**Status:** done

## Objective

Implement the Page contract (Layer 3) for real, in idiomatic Kotlin, from the TypeScript
specification already modeled in Task 009 and recorded in `_contract-design-notes.md` §
"Current contract shapes" (`page/contract.ts`). This is the first of the three domain-contract
implementation tasks (Page → Chapter → Series, in composition order per the Domain Composition
invariant) — Page has no downstream domain dependency, so it is implemented first.

## Inputs

- `_contract-design-notes.md`'s `page/contract.ts` shape — `PageContract extends ImageDescriptor`
  (Page IS an image, not merely composed of one), `PageResult` as the
  `{isSuccess: true} & PageContract | {isSuccess: false} & ErrorContract` discriminated shape.
- `ImageDescriptor`, `CacheDescriptor`, `ServerDescriptor`, `ErrorContract` — the shared
  sub-contracts Page depends on (also not yet fully modeled in Kotlin; model the minimal shape
  each needs to support `PageContract`, without over-designing fields no real task uses yet).
- Task 017's `Server` module — this is what a Page implementation calls to resolve real data.

## Steps

1. Translate `PageContract`/`PageResult` into idiomatic Kotlin: a `data class PageContract(...)`
   mirroring the TS fields, and a `sealed interface PageResult` (or equivalent sealed hierarchy)
   with `Success`/`Failure` variants carrying `PageContract`/`ErrorContract` respectively —
   whichever idiom keeps the discriminated-union shape closest to the TS original without forcing
   an unnatural Kotlin pattern.
2. Model the minimal Kotlin shapes for `ImageDescriptor`, `CacheDescriptor` (without any actual
   cache resolution — just the data shape, per Task 015's guideline that `CacheDescriptor` is
   embedded in every domain contract), `ServerDescriptor`, and `ErrorContract` as needed to
   support `PageContract`.
3. Wire the real implementation to call `Server` (Task 017) directly — no cache layer involved
   yet, matching Task 017's own "no cache in this phase" scope.
4. Validate against real data: confirm the Kotlin shape round-trips correctly against what
   `Server`/`KavitaAdapter` actually returns for a real page.

## Completion criteria

- `PageContract`/`PageResult` implemented in idiomatic Kotlin, matching the TS specification in
  `_contract-design-notes.md`.
- Minimal `ImageDescriptor`/`CacheDescriptor`/`ServerDescriptor`/`ErrorContract` Kotlin shapes
  exist, sufficient to support `PageContract` (not necessarily complete for every future
  contract's needs — extend later if a subsequent task's real shape doesn't fit).
- Calls `Server` directly, with no cache logic.
- Tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.
- Blocks Task 019 (Chapter contract, which composes `PageResult[]`).

## Result

Implemented as a new Gradle module `android/content-digest/` (naming discussion recorded in
`_contract-design-notes.md`'s Task 018 section and in memory — `:contract`/`:features`/`:app`/
`:service*`/`:enrichment` all rejected before landing on `:content-digest`, depending only on
`:server`). `PageResult` collapsed into `PageDigest` itself being the `sealed interface`
(`Success`/`Failure` variants, no separate wrapper type — same idiom as `:tools`' existing
`OtaCheckResult`). Minimal `ErrorDigest(code, message)` added; `ServerDescriptor` became
`ServerActiveInfo` (`:server`'s own new type, added in this task — see below); `cache` is always
`null` (no Cache module yet, per Task 015's guideline).

**Real scope grew beyond the original plan, resolved with the user across several mini-
iterations, in order:**

1. **`:server` gap found and closed first.** No existing `Server` method could answer "which
   group+URL, without credentials, actually served the last real content call" — needed for
   `PageDigest.server`. Added `Server.getActiveInfo()`, `group(id).getActive()`, and the new
   `ServerActiveInfo` type (flattened group+URL, no `credentialsJson`/`healthCheckPath`).
2. **Redesigned further into `ServerResponse<T>`** — every READ content method on `Server`
   (`serials.list`, `serial().get`, `chapters.list`, `chapter().get`, `getProgress`,
   `page().getDimensions`, `page().getUrl`) now returns `ServerResponse<T>` (`data`, `serverInfo`,
   `resolvedAtEpochMs`), assembled from the exact group+URL that resolved *that specific call* —
   eliminating a race a separate `getActiveInfo()` call after the fact would have had. Write
   methods (`setRead`, `setProgress`) stay `Unit`. `ServerBridgeModule.kt` updated to unwrap
   `.data` before crossing the RN bridge (bridge shape unchanged for RN).
3. **New general rule R11** recorded in `_contract-design-notes.md`: `server`/`resolvedAtEpochMs`
   on any Layer 3 contract reflect the last `:server` call that *succeeded*, overwritten in call
   order — not necessarily the last call attempted. Applies beyond Page, to Chapter/Series too.
4. **`PageDigest.chapter` carries the entire `Chapter` parameter unchanged**, not a `{id,
   pageTotal}` recorded subset as originally modeled in Task 009 — general rule (user's framing):
   a field populated by handing back another module's own object is never re-shaped/filtered by
   the receiving module. `Chapter` itself (`id`, `serial.id`) is an explicit Task-018-only
   placeholder — **flagged to revisit once Task 019/020 build the real
   `ChapterDigest`/`SeriesDigest`** (also recorded in memory,
   `project_page_digest_chapter_placeholder.md`).

**Assembly logic** (`buildPageDigest(server, chapter, pageIndex)`): `getUrl()` first (vital —
failure makes the whole result `Failure`), `getDimensions()` second (tolerated failure — caught,
`width`/`height` stay `null`, doesn't escalate). `hasFetchedDimensions` requires non-null AND `>
0` (a real `0` counts as unusable, not present). `orientation` is `null` both when `aspectRatio`
is `null` and when it's exactly `1` (square) — `landscape` when `> 1`, `portrait` when `< 1`.

## Como foi testado

Automated only, per explicit user decision for this phase — no real-device testing for any
Contract-implementation task. `./gradlew :server:test` (117 tests) and `./gradlew
:content-digest:test` (8 new tests) both passing, `./gradlew koverVerify` clean (consolidated
Kotlin line coverage rose 62% → 72.15%, `:content-digest` added to the merged Kover group in the
root `build.gradle.kts`). `make coverage` (Kotlin + JS) run clean end to end. Floor bump to the
project's `COVERAGE_FLOOR_KOTLIN` deferred to the closing commit.

## Aprovação

User approved explicitly via `AskUserQuestion` after a full summary of what was delivered
(`:content-digest` module, `Server.getActiveInfo()`/`ServerResponse<T>` additions to `:server`,
8 new tests, coverage delta, README/design-notes updates) — reply: "Sim, aprovo".
