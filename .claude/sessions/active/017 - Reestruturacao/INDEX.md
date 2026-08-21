# Plan 017 — Domain Restructuring — Tasks

> This plan expanded from a Reader-only bug-fix scope to a full architectural audit and
> cross-domain contract effort. See `README.md` for the full context, the premise audit, and
> why this plan has maximum priority. Task numbering below is sequential across phases
> (001-021); each row also shows its phase for navigation.

**Note on changelog**: the old "Task 005 — session changelog" is **not** a task anymore.
Changelog generation is automatic at plan closure, not a task — the `plan-manager` agent calls
the `atualizar-changelog` skill when the whole plan closes, using the real diff
`<latest-origin-tag>..HEAD` (see Task 021 / Phase 6.3). No task in this plan writes a
changelog entry by hand.

| # | Phase | Task | Status |
|---|-------|------|--------|
| [001](001-fix-three-mechanisms-diagnosis.md) | 0 — Foundations | Fix the 3-mechanisms diagnosis (RN→RN is new, not existing) | doing |
| [002](002-provider-isolation-premise.md) | 0 — Foundations | Formalize the provider isolation premise in text, for review | todo |
| [003](003-survey-page-domain.md) | 1 — Survey | Survey — Page domain | todo (blocked by 001) |
| [004](004-survey-chapter-domain.md) | 1 — Survey | Survey — Chapter domain | todo (blocked by 001) |
| [005](005-survey-series-domain.md) | 1 — Survey | Survey — Series domain | todo (blocked by 001) |
| [006](006-survey-library-domain.md) | 1 — Survey | Survey — Library domain | todo (blocked by 001) |
| [007](007-survey-kavita-coupling-points.md) | 1 — Survey | Survey — direct Kavita coupling points outside the 3 core domains | todo (blocked by 001) |
| [008](008-contract-chapter.md) | 2 — Contracts | Contract — Chapter (pilot, defines the template) | todo (blocked by 004) |
| [009](009-contract-page.md) | 2 — Contracts | Contract — Page | todo (blocked by 003, 008) |
| [010](010-contract-series.md) | 2 — Contracts | Contract — Series | todo (blocked by 005, 008) |
| [011](011-contract-library.md) | 2 — Contracts | Contract — Library | todo (blocked by 006, 008) |
| [012](012-contract-additional-datasources.md) | 2 — Contracts | Contract — additional DataSources (conditional on Task 007 findings) | todo (blocked by 007, 008) |
| [013](013-formalize-communication-mechanisms.md) | 2 — Contracts | Formalize the 3 communication mechanisms (Kotlin→RN, RN→Kotlin, RN→RN) | todo (blocked by 001, 008) |
| [014](014-plugin-manager-module.md) | 2 — Contracts | Plugin manager module design | todo (blocked by 002, 007, 008) |
| [015](015-cache-guideline.md) | 3 — Cache guideline | Local cache guideline (Room vs. memory, who orchestrates cache→network) | todo |
| [016](016-fix-library.md) | 4 — Corrections | Correction — Library (`KavitaLibraryFeature.kt`, `LibrarySummaryCacheDao`) | todo (blocked by 011, 015, 002) |
| [017](017-fix-series.md) | 4 — Corrections | Correction — Series (stop reading `chapterCacheDao` directly, unify `SeriesSummary`) | todo (blocked by 010, 008) |
| [018](018-fix-chapter.md) | 4 — Corrections | Correction — Chapter (unify duplicated `emitProgressChanged`) | todo (blocked by 008) |
| [019](019-fix-dummy-components-library-series.md) | 4 — Corrections | Correction — dumb components (Library/SeriesDetail) | todo (blocked by 011, 010) |
| [020](020-fix-dummy-components-reader.md) | 4 — Corrections | Correction — dumb components (Reader, `toBlock` → `ReaderTransform.ts`) | todo (blocked by 008) |
| [021](021-reader-chapter-switch-contract.md) | 5 — Reader | Reader — chapter-switch contract + 3-mechanism consumption (was Task 001) | todo (blocked by 008, 013) |
| [022](022-reader-progress-sync-audit.md) | 5 — Reader | Reader — progress sync audit local↔server (was Task 002) | todo |
| [023](023-reader-dummy-components-review.md) | 5 — Reader | Reader — dumb components review (was Task 003) | todo (integrates with 020) |
| [024](024-claude-md-contract-rule.md) | 6 — Safeguards | CLAUDE.md contract-change rule with concrete examples (was Task 004) | todo |
| [025](025-architectural-compliance-skill.md) | 6 — Safeguards | Architectural compliance skill/agent | todo (blocked by 024) |
| [026](026-changelog-skill-origin-tag.md) | 6 — Safeguards | `atualizar-changelog` skill — use `<origin-tag>..HEAD` diff as cross-check | todo |
