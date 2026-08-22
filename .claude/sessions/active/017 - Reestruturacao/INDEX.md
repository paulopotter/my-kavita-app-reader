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
| [013](013-formalize-communication-mechanisms.md) | 2 — Contracts | Formalize the 3 communication mechanisms (Kotlin→RN, RN→Kotlin, RN→RN) | done (design only, no EventBus implementation yet) |
| [014](014-plugin-manager-module.md) | 2 — Contracts | Plugin manager module design | done (design only, no reference implementation yet) |
| [015](015-cache-guideline.md) | 3 — Cache guideline | Local cache guideline (Room vs. memory, who orchestrates cache→network) | done |
| [016](016-relocate-kavita-plugin.md) | 4 — Implementation | Relocate the raw Kavita plugin to `Server/plugins/kavita/` (pure repositioning) | todo |
| [017](017-server-module-implementation.md) | 4 — Implementation | Implement the `Server` module for real (routing + `KavitaAdapter`, no cache yet) | todo (blocked by 016) |
| [018](018-contract-page-implementation.md) | 4 — Implementation | Contract — Page implementation (idiomatic Kotlin `PageContract`/`PageResult`) | todo (blocked by 017) |
| [019](019-contract-chapter-implementation.md) | 4 — Implementation | Contract — Chapter implementation (`ChapterContract`/`ChapterResult`/`ChapterNeighborContract`) | todo (blocked by 018) |
| [020](020-contract-series-implementation.md) | 4 — Implementation | Contract — Series implementation (`SeriesContract`/`SeriesResult`) | todo (blocked by 019) |
| [021](021-rn-services-implementation.md) | 4 — Implementation | RN Services (Page/Chapter/Series) — real network flow, no cache yet | todo (blocked by 020) |
| [022](022-external-metadata-module.md) | 4 — Implementation | `ExternalMetadata`/BFF module implementation (own module, per Task 012) | todo (blocked by 017; scope decided at implementation time) |
| [023](023-cache-module-implementation.md) | 4 — Implementation | `Cache` (Kotlin) + `CacheManager` (RN) implementation — closes the deferred cache gap | todo (blocked by 021) |
| [024](024-fix-series.md) | 5 — Corrections | Correction — Series (stop reading `chapterCacheDao` directly, unify `SeriesSummary`) | todo (blocked by 010, 008, 016-023) |
| [025](025-fix-chapter.md) | 5 — Corrections | Correction — Chapter (unify duplicated `emitProgressChanged`) | todo (blocked by 008, 016-023) |
| [026](026-fix-dummy-components-library-series.md) | 5 — Corrections | Correction — dumb components (Library/SeriesDetail) | todo (blocked by 011, 010, 016-023) |
| [027](027-fix-dummy-components-reader.md) | 5 — Corrections | Correction — dumb components (Reader, `toBlock` → `ReaderTransform.ts`) | todo (blocked by 008, 016-023) |
| [028](028-fix-library.md) | 5 — Corrections | Correction — Library (`LibraryModule.kt` removal, series listing moves into `Server`) | todo (blocked by 015, 011, 002, 016-023 — last in this phase, depends on the whole new base) |
| [029](029-reader-chapter-switch-contract.md) | 6 — Reader | Reader — chapter-switch contract + 3-mechanism consumption (was Task 001) | todo (blocked by 008, 013, 016-023) |
| [030](030-reader-progress-sync-audit.md) | 6 — Reader | Reader — progress sync audit local↔server (was Task 002) | todo |
| [031](031-reader-dummy-components-review.md) | 6 — Reader | Reader — dumb components review (was Task 003) | todo (integrates with 027) |
| [032](032-claude-md-contract-rule.md) | 7 — Safeguards | CLAUDE.md contract-change rule with concrete examples (was Task 004) | todo |
| [033](033-architectural-compliance-skill.md) | 7 — Safeguards | Architectural compliance skill/agent | todo (blocked by 032) |
| [034](034-changelog-skill-origin-tag.md) | 7 — Safeguards | `atualizar-changelog` skill — use `<origin-tag>..HEAD` diff as cross-check | todo |
