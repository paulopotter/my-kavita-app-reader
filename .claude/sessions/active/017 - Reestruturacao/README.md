# Plan 017 — Domain Restructuring, Cross-Layer Contracts, and Process Safeguards

## Why this plan has maximum priority

This plan started as a narrow Reader bug-fix session (chapter navigation arrow, overscroll,
progress sync). During that session, the agent implemented a navigation-mechanism change
(`startAtBeginning`) after the user had **explicitly asked to talk it through before touching
it**. That is a real process deviation, not a hypothetical risk — the agent proceeded to
implement a contract-level change without the prior conversation the user asked for.

Diagnosing why that happened surfaced a bigger problem: the project has no verified, complete
set of architectural premises. The deviation in the Reader was a symptom, not the root cause —
the root cause is that cross-layer/cross-domain contracts are informal or missing across the
whole app, not just in the Reader. That is why the scope of this plan grew from "fix the
Reader" to "audit and fix the app's domain architecture."

**Until the safeguards task (Phase 7.1) is closed, any new session that touches
`useReader.ts` or any cross-layer contract (Kotlin↔RN event shapes, hook public signatures,
`DataSource` interfaces) must read this plan first.** This is a standing rule for this
repository, not just a note for this session.

---

## Context

During the Reader bug-fixing session (a batch of fixes after real-device testing), it became
clear that the recurring navigation bugs (stuck overlay, broken infinite scroll, skipped
chapter, arrow going to "continue reading" instead of page one) were not isolated bugs — they
were a symptom of the Reader having **two parallel, divergent mechanisms** for the same
conceptual operation ("switch chapter"): one path for natural scroll (incremental reducer
`SET_VIEWER`) and another for manual arrow navigation (which oscillated between reusing the
incremental reducer and rebuilding the whole trio from scratch via `loadInitialViewer`).

The user paused implementation to review the project's architectural premises and check
whether any were being violated. Diagnosis from that conversation:

1. **Dumb components** — partially violated: `ReaderScreen.tsx` makes decisions
   (`handleVisiblePageChanged` decides which action to dispatch) instead of only forwarding
   raw events for the hook to decide.
2. **Scope-bound responsibility** ("only Series code touches Series, only Chapter code touches
   Chapter") — violated: there is no "Chapter" domain today with its own contract that the
   screen/Series layer calls into. `useReader.ts` is a monolithic hook that accumulates
   chapter fetching, trio assembly, progress calculation, navigation decisions, physical
   scrolling, and read-marking — with no boundary between these responsibilities. This is the
   root cause of the dual navigation mechanism.
3. **Events** — exists in the Kotlin→RN direction (`onVisiblePageChanged`,
   `onScrollToChapterHandled`), but is ad-hoc in the RN→Kotlin direction
   (`scrollToPageRequest`/`scrollToChapterId`/`scrollToPageIndex` as manually-zeroed "one-shot
   state", not a real event). A third case, RN→RN, was flagged during this same planning
   session as **not existing today** (corrected from an earlier, wrong diagnosis — see
   "Premise audit" below).
4. **Single contract** — does not exist: `ViewerChapters` is an internal Reader structure, not
   a replicable domain contract (the Series screen has its own chapter modeling via
   `SeriesBridge`, unrelated to `ViewerChapters`).
5. **Local cache → cache calls server** — respected in most of the app (Room-first in
   Series/Library/Chapter list). In the Reader, local and remote progress calls happen in
   parallel inside `loadInitialViewer`, and it is the opening function itself (not a dedicated
   cache layer) that decides which one wins. Needed an audit: the user suspected progress was
   not being synced to the server at every point it should be (leaving the Reader, periodic
   intervals).

## Why the scope grew from "Reader" to "whole app"

Reviewing the Reader's premise violations raised the obvious question: are the same violations
present elsewhere? A full audit was run (read-only, this planning session) against 5 premises
(dumb components, scope-bound responsibility, events, single contract, local cache) across both
Kotlin (`core/tools/features/app`) and RN (`screens/*`, `shared/*`). It found comparable
violations in Library, Series, and Chapter — see "Audit findings" below. The user also
identified a **new premise** that was never formalized: provider isolation / generic plugin
manager (see below). The plan was expanded to cover the whole app, with the original Reader
tasks reslotted as the final phase that *consumes* the new domain contracts instead of
inventing its own.

---

## Premise audit — existing vs. newly requested

Cross-reference between what is already formalized today (`CLAUDE.md` + `architecture.md`) and
what the user raised in conversation. None of the premises already listed below are reopened by
this plan — they continue to hold as-is (explicit user decision); the new contracts from Phase
2 must respect them, not replace them.

| Existing premise | Source | Relation to what was requested |
|---|---|---|
| Screen never imports from another screen — only `shared/` | CLAUDE.md Invariants | Reinforces domain scope, unchanged |
| Dummy component never imports a service | CLAUDE.md Invariants | Same as the "dumb components" premise the user raised |
| Kotlin tool always global, never screen-coupled | CLAUDE.md Invariants | Unchanged |
| Used by 2nd screen → promote to `shared/` | CLAUDE.md Invariants | Reinforces "scope-bound responsibility" |
| Kotlin layers unidirectional: `core ← tools ← features` | CLAUDE.md Invariants | Unchanged |
| Feature gated by missing config, never `if` | CLAUDE.md Invariants | Unchanged |
| Zero telemetry/analytics/user identifiers | CLAUDE.md Invariants | Unchanged |
| Domain Composition micro→macro (Page→Chapter→Series→Library) | CLAUDE.md + architecture.md | Same as the "scope-bound responsibility" premise the user raised |
| `Kotlin Tool → Hook → Service → Transform → Screen → Component` flow | CLAUDE.md Rules | Related to "dummy components"/"local cache" — data pipeline |
| **SDU (Server-Driven UI)** — when Kotlin needs to render something (rare, the Reader's exception), it interprets a generic node tree sent by RN; never hardcodes layout/labels | architecture.md § Reader Screen | Not raised in the original conversation — unchanged, it is already the safeguard for "Kotlin draws pixels" not becoming UI coupling |
| Bridge RPC (`request`/`cachedRequest`/`authenticatedRequest`/`db.*`) vs. Bridge Stream (events) — formal naming already existing for Kotlin↔RN | architecture.md § Key Concepts | Partially covers "events", but only Kotlin↔RN — RN→RN has no naming yet (see Phase 2.5) |
| `ChapterDataSource` — interface+impl+binding (Hilt `@Binds`) pattern isolating the Kavita provider behind a generic interface | architecture.md § ChapterDataSource | **Direct precedent** of the "provider isolation" premise the user raised — Phase 2 generalizes this pattern, see below |
| Layered preference override (session > per-item > global) | architecture.md § Key Concepts | Not raised — specific to settings, unchanged |
| **Internationalization** — the app already works in more than one language (pt/en today); all UI text must be translatable, never hardcoded in a single language | current project usage (site/i18n, `docs/`) | **Missed in the original audit** — flagged by the user. Becomes an explicit CLAUDE.md invariant (Phase 7.1) and a review criterion for any task that adds UI text (Phases 2/5/6) |

### The 3 communication mechanisms — actual state (corrected)

1. **Kotlin→RN** (native event): exists and is already documented as "Bridge Stream" —
   consistent.
2. **RN→Kotlin** (RN requests an action from Kotlin): exists and is documented as "Bridge RPC"
   for the general case — but the Reader also uses a separate ad-hoc pattern, the **"one-shot
   state"**: instead of calling an imperative method directly, RN writes a value into a state
   field (e.g. `scrollToChapterId: "123"`), Kotlin observes that field via an effect
   (`LaunchedEffect`), performs the action, and reports back (`onScrollToChapterHandled`) so RN
   can **manually zero** the field — otherwise the next read re-triggers the same action. It
   works, but it is fragile: it is the identified root cause of the race bug documented in
   Task 029 (delayed/concurrent zeroing racing another in-flight action). Task 029 already
   considers replacing it with an imperative `ref` call; this plan formalizes that decision
   inside the event contract template (Phase 2.5), covering both existing mechanisms (not just
   the new RN→RN one).
3. **RN→RN** (React dispatches, React itself listens — e.g. an operation finishes → event →
   another part of the app reacts): **does not exist today**. It is new capability to be
   *designed and built from scratch*, not something to map (correction to the original 017
   diagnosis, which assumed `SeriesProgressChangedEmitter` was an example of this — in
   practice that event originates in Kotlin, it is Kotlin→RN).

Phase 2.5 covers formalizing all 3 mechanisms together — the 2 that already exist (giving them
formal naming/contract, and deciding the fate of the "one-shot state") and the new RN→RN one.

### Generic plugin — bigger premise than just "generalize `ChapterDataSource`"

Important correction from the user: the premise is not merely replicating
`ChapterDataSource` for more data domains — it is a **plugin manager module** per category
(e.g. "server module", "notification module"). This module is the only one that knows which
concrete implementations exist (Kavita, a future second server, ntfy, Firebase, etc.), knows
how to manage them, and is the app's single point of contact with them. The app never talks to
a concrete implementation directly — at most, it may, *through* the manager module, **explicitly
request** "use server X" (an operation of the module's own contract, not a bypass of it). Every
method the app uses is served by the manager module, never by the implementation.

This is one layer more than the current `ChapterDataSource`: today there is 1 interface → 1
fixed implementation, wired once via Hilt `@Binds` — there is no registry managing multiple
simultaneous implementations, nor an operation to "choose which one to use". Phase 2.5b (new)
designs this "plugin manager module" pattern, generalizing the `ChapterDataSource` precedent,
using backlog item 011 (BFF plugin, which already anticipates multiple `MetadataSource`) and
backlog item 008 (Notifications, multiple providers) as the first concrete cases.

Phase 1.5 (survey) is still needed to map every point that currently knows Kavita directly, but
the target design (Phases 2.4b/2.5b) follows this "manager module" model, not a 1:1 repeat of
the Reader's current pattern.

---

## Audit findings (input for the correction tasks)

Read-only audit performed during this planning session, covering Kotlin
(`core/tools/features/app`) and RN (`screens/*`, `shared/*`) against the 5 premises. Summary
per premise — full detail (file:line) lives inside each correction task, not repeated here.

**1. Dumb components** — `ReaderScreen.tsx` decides an action instead of forwarding an event
(already known, Task 5.3) + builds domain structure (`toBlock`) inline, which should live in
`ReaderTransform.ts` (new finding). `LibraryScreen.tsx`/`SeriesDetailScreen.tsx` derive
presentation state (alphabetIndex, handleScroll) inline instead of in the hook/transform —
smaller, but repeated across more than one screen.

**2. Scope-bound responsibility** — severe finding: **`KavitaLibraryFeature.kt` does not
exist**. The architecture doc describes this file; in practice, `KavitaSeriesFeature.listSeries()`
assumes that role and still reads `chapterCacheDao` directly, skipping the Chapter layer. Also:
`emitProgressChanged` duplicated in `SeriesModule.kt` and `ReaderChapterModule.kt` with no
shared function.

**3. Events** — full map of the 3 mechanisms done. Finding that corrects plan 017 itself:
**RN→RN does not exist today** — the cited examples (`SeriesProgressChangedEmitter`) are,
at origin, Kotlin→RN. RN→RN (React dispatches and React itself listens — e.g. an operation
finishes, an event fires, another part reacts) is new capability to **design and build**, not
an existing category to map.

**4. Single contract** — `Chapter` is consistent in field shape between TS/Kotlin, but has no
shared schema/validator (implicit contract, silent breakage possible). The "series progress"
aggregate (`readCount`/`progressFraction`) is recomputed 3 slightly different ways in 3 files.

**5. Local cache** — most severe finding: **Library does not use Room**, it uses an in-memory
cache (2-min TTL) that does not survive a restart — no `LibrarySummaryCacheDao` exists. Even
in the "good" domains (Series Detail, Chapter, which use Room), it is the **RN hook that
orchestrates** "cache first, then network" — no repository layer arbitrates this transparently
for the UI.

**Areas with no code yet** (Home, Notifications, Search, generic plugin, JS-side DB) — do not
generate a correction task, only "apply these premises from initial design" guidance when they
are implemented. Notifications in particular is the natural next case for the "single
translation module" premise (only the notification module should know the provider is ntfy).

---

## New premise: provider isolation (Kavita as a swappable module)

Confirmed by the user this session, not yet documented in `CLAUDE.md`/`architecture.md`:

> No part of the project outside an external provider's translation module should know that
> provider's name/format. A single module per provider "translates" to the project's internal
> format (the domain contract) — the rest of the app consumes only the contract, never the
> provider's native format. Switching providers in the future (e.g. another manga server,
> another notification provider) should not require changes outside that module.

There is already a partial precedent in the code: `ChapterDataSource` (interface) +
`KavitaChapterFeature` (impl) + Hilt binding, documented in `architecture.md` §
"ChapterDataSource — the swappable-provider boundary". This plan generalizes that pattern to
the remaining domains (Series, Library) and formalizes it as a project invariant, not just an
isolated Reader case.

This premise enters `CLAUDE.md`/`architecture.md` via Phase 7.1 (safeguards) and guides Phase 1
(surveys) and Phase 5 (corrections) — especially the Library fix.

---

## Execution rules confirmed by the user for this plan

- No code changes during the planning session itself — only plan/task files.
- Number of tasks is not a constraint — dozens are expected and acceptable; granular and
  trackable beats large and vague.
- Every contract task is **conversation + code together**, task by task — the agent never
  hands over a finished contract without the user having validated feasibility first.
- Contract task 2.2 (Chapter) is the pilot: the contract template itself is designed *during*
  that task's modeling session, not before it, and grounded in real TypeScript data examples
  (the user reads/speaks TS, not Kotlin) — subsequent contract tasks (2.1, 2.3, 2.4...) reuse
  whatever comes out of it, adjusting when a new case does not fit the initial shape.
- **Plan closure changelog**: when the whole plan is done (all tasks approved), the
  `[Unreleased]` CHANGELOG entry is generated by the plan-closing skill/agent
  (`plan-manager` + `atualizar-changelog`) from the **real diff between `HEAD` and the latest
  tag that exists in the repository** (computed dynamically, e.g.
  `git describe --tags --abbrev=0`, cross-checked against the remote — see Phase 7.3), never
  hardcoded as fixed text in any task file. `2026.08.20.0248` is cited in this plan only as
  *today's* latest tag, for reference — no task may hardcode that value as a fixed parameter
  of the process.
- Conversation with the user stays in pt-BR; plan/task files (once approved) and code follow
  `CLAUDE.md` and are in English.
- Every task in this plan must be **testable in isolation on a real device** and must not
  reduce test coverage (floors in `CLAUDE.md` § Coverage). This shapes the ordering and sizing
  of the execution phases (2/4/5/6): no task leaves the app in a broken or under-covered state —
  see the standard completion criterion on Phases 4/5/6/7.
- **Device test delivery flow** — applies to this plan and is formalized as a permanent
  project rule in Phase 7.1 (`CLAUDE.md`), not just a local instruction: whenever a task
  produces code ready for the user to test, before asking for the test: (1) run the RC bump via
  the `versionar-build` skill (guarantees the user is picking up the new version, not a cached
  one); (2) generate the build (compile-check) — whoever installs/deploys to the device is
  always the user, via `make redeploy-log`, never the agent. When the user mentions "the log",
  look in `/tmp`, pattern `reader-log-v{N}.txt` (`N` incremental, counter in `/tmp/counter.txt`)
  — always read the file with the **most recent timestamp**, never assume it is the last `N`
  that appeared earlier in the conversation (the cached notion of "the last one" can be stale).

---

## Phase structure (8 phases, 0 through 7)

See `INDEX.md` for the full task table with statuses and dependencies. Summary:

- **Phase 0 — Foundations**: correct the original 017 diagnosis of the 3 mechanisms; formalize
  the provider isolation premise in text for review.
- **Phase 1 — Per-domain survey**: survey-only (no contract proposal) for Page, Chapter,
  Series, Library, plus a sweep for direct Kavita coupling points outside those 4 domains.
- **Phase 2 — Contract modeling** (co-creation with the user, one task per domain): Chapter is
  the pilot that defines the contract template during modeling; then Page, Series, Library,
  additional DataSources (conditional on Phase 1.5 findings), formalization of the 3
  communication mechanisms, and the plugin manager module design.
- **Phase 3 — Local cache guideline**: decide when Room is mandatory, when in-memory is
  acceptable, and who orchestrates cache→network.
- **Phase 4 — Implementation** (bottom-up, Layer 0 → 4, added after realizing Phase 5's
  domain corrections assumed a real base that only existed on paper): relocate the raw Kavita
  plugin into `Server/plugins/kavita/`; implement the `Server` module for real (routing +
  `KavitaAdapter`, no cache yet); implement Page/Chapter/Series as idiomatic Kotlin contracts;
  implement the RN Services consuming them directly (still no cache); implement the
  `ExternalMetadata`/BFF module; implement `Cache` (Kotlin) + `CacheManager` (RN) last, closing
  the cache gap deliberately deferred until the rest of the base works end-to-end.
- **Phase 5 — Corrections by domain**: Series (stop reading `chapterCacheDao` directly), Chapter
  (unify duplicated `emitProgressChanged`), dumb-component fixes for Library/SeriesDetail and
  Reader, and Library last (`LibraryModule.kt` removal, series listing moves into `Server`) —
  reslotted to the end of this phase since it depends on the entire Phase 4 base existing first.
- **Phase 6 — Reader** (the original plan 017 tasks 001-003, reslotted): chapter-switch
  contract (now consuming Phase 2's Chapter contract and Phase 2.5's RN→RN mechanism instead of
  designing its own), progress-sync audit, dumb-component review.
- **Phase 7 — Process safeguards**: CLAUDE.md contract-change rule with concrete examples,
  architectural-compliance skill/agent, `atualizar-changelog` skill upgrade to also compute the
  latest tag from `origin`.

**Task 5.5 (formerly "005 — session changelog") no longer exists as a manual task.**
Changelog generation is automatic at plan closure (see Phase 7.3 and INDEX.md note) — it is
never written by hand inside a task file.

## Standard completion criterion for code-changing tasks (Phases 4/5/6/7)

Tested on a real device by the user, `make coverage` shows no drop relative to the current
floor (`COVERAGE_FLOOR_KOTLIN` in `android/build.gradle.kts`, `coverageThreshold` in
`frontend/package.json`), explicit approval before `finalizar-task`.

## Plan closure

- All tasks approved by the user, tested on a real device, no coverage drop (existing rule in
  `CLAUDE.md` § Coverage, reinforced by the execution rules above).
- The `finalizar-task` skill closes each task individually as it completes.
- When the whole plan closes: the flow fixed by Phase 7.3 generates the `[Unreleased]` entry
  from the real diff between the repository's latest tag (recomputed at closure time, not the
  one cited in this plan) and `HEAD` — never written manually in any task.
