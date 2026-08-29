# Plan 017 — Domain Restructuring — Tasks

> This plan expanded from a Reader-only bug-fix scope to a full architectural audit and
> cross-domain contract effort. See `README.md` for the full context, the premise audit, and
> why this plan has maximum priority. Task numbering below is sequential across phases
> (001-034); each row also shows its phase for navigation.

**Note on changelog**: the old "Task 005 — session changelog" is **not** a task anymore.
Changelog generation is automatic at plan closure, not a task — the `plan-manager` agent calls
the `atualizar-changelog` skill when the whole plan closes, using the real diff
`<latest-origin-tag>..HEAD` (see Task 034 / Phase 7). No task in this plan writes a
changelog entry by hand.

| # | Phase | Task | Status |
|---|-------|------|--------|
| [001](001-fix-three-mechanisms-diagnosis.md) | 0 — Foundations | Fix the 3-mechanisms diagnosis (RN→RN is new, not existing) | done |
| [002](002-provider-isolation-premise.md) | 0 — Foundations | Formalize the provider isolation premise in text, for review | done |
| [003](003-survey-page-domain.md) | 1 — Survey | Survey — Page domain | done |
| [004](004-survey-chapter-domain.md) | 1 — Survey | Survey — Chapter domain | done |
| [005](005-survey-series-domain.md) | 1 — Survey | Survey — Series domain | done |
| [006](006-survey-library-domain.md) | 1 — Survey | Survey — Library domain | done |
| [007](007-survey-kavita-coupling-points.md) | 1 — Survey | Survey — direct Kavita coupling points outside the 3 core domains | done |
| [008](008-contract-chapter.md) | 2 — Contracts | Contract — Chapter (pilot, defines the template) | done (base contract, `architecture.md` update deferred) |
| [009](009-contract-page.md) | 2 — Contracts | Contract — Page | done (base contract, `architecture.md` update deferred) |
| [010](010-contract-series.md) | 2 — Contracts | Contract — Series | done (base contract, `architecture.md` update deferred) |
| [011](011-contract-library.md) | 2 — Contracts | Contract — Library | done (decision: no Layer 3 Library contract; see task file) |
| [012](012-contract-additional-datasources.md) | 2 — Contracts | Contract — additional DataSources (conditional on Task 007 findings) | done (no new DataSource — see task file) |
| [013](013-formalize-communication-mechanisms.md) | 2 — Contracts | Formalize the 3 communication mechanisms (Kotlin→RN, RN→Kotlin, RN→RN) | done (design 2026-08-21; EventBus reference implementation + cycle guard + first real use case shipped 2026-08-29 in Task 025 — see task file's "Result — implementation follow-up" + `completions/2026-08-29_013-...`) |
| [014](014-plugin-manager-module.md) | 2 — Contracts | Plugin manager module design | done (design only, no reference implementation yet) |
| [015](015-cache-guideline.md) | 3 — Cache guideline | Local cache guideline (Room vs. memory, who orchestrates cache→network) | done |
| [016](016-relocate-kavita-plugin.md) | 4 — Implementation | Relocate the raw Kavita plugin to `Server/plugins/kavita/` (pure repositioning) | done (diverged from plan — see task file's Result section) |
| [017](017-server-module-implementation.md) | 4 — Implementation | Implement the `Server` module for real (routing + `KavitaAdapter`, no cache yet) | done (RN bridge included; `KavitaUrlSelector` absorption deferred to 021/024-028 — see task file's Result) |
| [018](018-contract-page-implementation.md) | 4 — Implementation | Contract — Page implementation (idiomatic Kotlin `PageContract`/`PageResult`) | done (grew into `:server` additions — `ServerResponse<T>`, `getActiveInfo()` — see task file's Result) |
| [019](019-contract-chapter-implementation.md) | 4 — Implementation | Contract — Chapter implementation (`ChapterContract`/`ChapterResult`/`ChapterNeighborContract`) | done (`ChapterDigest`/`ChapterFields`/`ChapterNeighborDigest`, same idiom as Task 018 — see task file's Result) |
| [020](020-contract-series-implementation.md) | 4 — Implementation | Contract — Series implementation (`SeriesContract`/`SeriesResult`) | done (`SeriesDigest`/`SeriesFields`, no `SeriesNeighborDigest`; post-close `full` param cuts payload ~97%; post-close RN↔Kotlin digest bridge added (Kotlin + TS types only) — see task file's Result) |
| [021](021-rn-services-implementation.md) | 4 — Implementation | RN Services (Page/Chapter/Series) — real network flow, no cache yet | done (4 Services incl. Server; see task file's Result) |
| [022](022-external-metadata-module.md) | 4 — Implementation | `ExternalMetadata`/BFF module implementation (own module, per Task 012) | done |
| [023](023-cache-module-implementation.md) | 4 — Implementation | `Cache` (Kotlin) + `CacheManager` (RN) implementation — closes the deferred cache gap | done (RN `CacheManager` diverges from the original 2-mode design — 4 modes, no Service wiring since digests are already cache-first in Kotlin; see task file's Result) |
| [024](024-fix-series.md) | 5 — Corrections | Correction — Series (stop reading `chapterCacheDao` directly, unify `SeriesSummary`) — expanded in-session to a full rewrite of `series-detail`'s RN layer onto `SerialService`/`ChapterService`, surfacing gaps like where "favorited" should actually be persisted | done (original Kotlin scope carved out into Task 036 — see task file's Result for everything actually shipped) |
| [025](025-fix-chapter.md) | 5 — Corrections | Correction — Chapter — scope changed from "unify duplicated `emitProgressChanged`" to "remove it from both Kotlin bridges + rebuild the cross-screen progress notification on the RN→RN EventBus" (Task 013's reference implementation, shipped here) | done (see task file's Result; Reader still on the legacy mark path — Task 029/030) |
| [026](026-fix-dummy-components-library-series.md) | 5 — Corrections | Correction — dumb components (Library/SeriesDetail) | todo (blocked by 011, 010, 016-023) |
| [027](027-fix-dummy-components-reader.md) | 5 — Corrections | Correction — dumb components (Reader, `toBlock` → `ReaderTransform.ts`) | todo (blocked by 008, 016-023) |
| [028](028-fix-library.md) | 5 — Corrections | Correction — Library (`LibraryModule.kt` removal, series listing moves into `Server`) | todo (blocked by 015, 011, 002, 016-023 — last in this phase, depends on the whole new base) |
| [029](029-reader-chapter-switch-contract.md) | 6 — Reader | Reader — chapter-switch contract + 3-mechanism consumption (was Task 001) | todo (blocked by 008, 013, 016-023) |
| [030](030-reader-progress-sync-audit.md) | 6 — Reader | Reader — progress sync audit local↔server (was Task 002) | todo |
| [031](031-reader-dummy-components-review.md) | 6 — Reader | Reader — dumb components review (was Task 003) | todo (integrates with 027) |
| [032](032-claude-md-contract-rule.md) | 7 — Safeguards | CLAUDE.md contract-change rule with concrete examples (was Task 004) | todo |
| [033](033-architectural-compliance-skill.md) | 7 — Safeguards | Architectural compliance skill/agent | todo (blocked by 032) |
| [034](034-changelog-skill-origin-tag.md) | 7 — Safeguards | `atualizar-changelog` skill — use `<origin-tag>..HEAD` diff as cross-check | todo |
| [035](035-fix-config-setup-session-auth.md) | 5 — Corrections | Correction — Config/Setup session & auth (401 on Library/Following, migrate to `:server`/`ServerService`) | todo (blocked by 017; related to 021 but not blocked by it) |
| [036](036-library-sobre-digest.md) | 5 — Corrections | Library screen moves to the new Server/digest stack (drop `KavitaSeriesFeature.listSeries`) | todo (carved out of Task 024's closing conversation; needs its own fetch-strategy and Library-card-contract design phase) |
