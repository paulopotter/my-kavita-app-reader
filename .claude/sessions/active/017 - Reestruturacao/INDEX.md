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
| [026](026-fix-dummy-components-library-series.md) | 5 — Corrections | Correction — dumb components (Library/SeriesDetail) | done (2026-09-02 — Library half fell out of the 028/036 rewrite; SeriesDetail half moved handleScroll + read count to useSerie) |
| [027](027-fix-dummy-components-reader.md) | 5 — Corrections | Correction — dumb components (Reader, `toBlock` → transform) | done (2026-09-01 — resolved by the reader rewrite; `toBlock` → `webtoon-blocks.transform.ts`) |
| [028](028-fix-library.md) | 5 — Corrections | Correction — Library (`LibraryModule.kt` removal, series listing moves into `Server`) | done (2026-09-02 — closed together with 036; legacy removed, listing via `Server.serials.list()` + `buildSerialsDigest`) |
| [029](029-reader-chapter-switch-contract.md) | 6 — Reader | Reader — chapter-switch contract + 3-mechanism consumption (was Task 001) | done (2026-09-01 — ground-up reader rewrite: `ReaderWindow` + `moveFocus` + `nativeListKey`; validated rc42–rc45) |
| [030](030-reader-progress-sync-audit.md) | 6 — Reader | Reader — progress sync audit local↔server (was Task 002) | done (2026-09-01 — audit + 3 sync gaps fixed: AppState flush, openChapter flush, 2s timer guard) |
| [031](031-reader-dummy-components-review.md) | 6 — Reader | Reader — dumb components review (was Task 003) | done (2026-09-01 — resolved by the reader rewrite; screen forwards native events verbatim, overlay in the dumb-component structure) |
| [032](032-claude-md-contract-rule.md) | 7 — Safeguards | CLAUDE.md contract-change rule with concrete examples (was Task 004) | done (2026-09-04 — grew into a full doc review: CLAUDE.md → repo root + regrouped by theme + contract-change/i18n/log rules; architecture.md rewritten for the new Kotlin model; architecture-refactor-map.md deleted; mistakes.md compacted 521→160 lines) |
| [033](033-architectural-compliance-skill.md) | 7 — Safeguards | Architectural compliance skill/agent | todo (blocked by 032) |
| [034](034-changelog-skill-origin-tag.md) | 7 — Safeguards | `atualizar-changelog` skill — use `<origin-tag>..HEAD` diff as cross-check | todo |
| [035](035-fix-config-setup-session-auth.md) | 5 — Corrections | Correction — Config/Setup session & auth (401 on Library/Following, migrate to `:server`/`ServerService`) | done |
| [036](036-library-sobre-digest.md) | 5 — Corrections | Library screen moves to the new Server/digest stack (drop `KavitaSeriesFeature.listSeries`) | done (2026-09-02 — `buildSerialsDigest` cache-first, freshness banner, Library↔Following handoff, `Following` folded into `LibraryScreen` via route param) |
| [037](037-kill-transform-layer.md) | 6 — Reader | Kill the `Transform` layer — move `reader/transforms/` into a screen-local model + the webtoon adapter | done (2026-09-03 — `transforms/` deleted; `reader.model.ts` + `reader.window.ts` + `modes/webtoon.adapter.ts`; NOT promoted to shared `ChapterTool` since only the reader uses it; device-smoked rc104, no rc30 crash. SeriesScreen stale-read-status spun off to a separate fix) |
| [038](038-splash-migration.md) | 5 — Corrections | Splash — kill Kotlin sync machinery, migrate RN splash to the new pattern + Library warm-up | done (2026-09-02 — no SplashActivity, MainActivity owns the OTA gate via core-splashscreen; `screens/splash/` on the new convention as a real route; boot graph + light Library warm-up; 3 OTA modes device-confirmed rc83; `:cache` patch/patchAll killed the ~11.6s per-series loop) |
| [039](039-retire-ui-preferences-table.md) | 5 — Corrections | Retire the `ui_preferences` Room table — move `keepScreenOnDuringReading` / `immersiveModeDuringReading` to `:preferences` (`ReaderPrefs`); `ScreenControlModule` becomes WindowManager-only; DROP TABLE at Room v14 (promotes backlog 022) | done (2026-09-03 — 4 slices, Room v14, `14.json` committed, `ScreenControlModule` side-effect-only; also fixed 2 pre-existing immersive-mode bugs: cutout SHORT_EDGES + shell paddingTop; device-smoked rc109 incl. upgrade-over-existing) |
