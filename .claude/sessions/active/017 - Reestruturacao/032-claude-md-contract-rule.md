# Task 032 — CLAUDE.md contract-change rule with concrete examples (Phase 7 — Safeguards)

**Status:** done

> This task is the original plan 017 "Task 004 — Salvaguardas de processo contra desvio de
> arquitetura", reslotted into Phase 7, expanded with the concrete examples and additional
> premises agreed during this plan's expansion (provider isolation, internationalization,
> device-test-delivery flow).

## Objective

The user reported, during this session, a recurring deviation from project rules on every
interaction — concretely: the agent implemented a navigation change (`startAtBeginning`) after
being explicitly asked to talk it through first. This task creates concrete mechanisms so this
does not repeat, not just a text reinforcement (`CLAUDE.md` already says "Test + approval before
commit" and that did not prevent the deviation).

## Real problem identified

The failure was not committing without approval (the current rule already covers that) — it was
**implementing a design change without first validating the design with the user**, despite
being explicitly asked not to. `CLAUDE.md` today has no rule distinguishing "point bug fix"
from "contract/architecture change that needs prior conversation".

## Steps

1. Propose an addition to `CLAUDE.md` (§ Rules or § Invariants) along these lines:
   > A change that alters an existing cross-layer contract (e.g. a hook's public signature, a
   > navigation mechanism, an event shape) requires describing the proposal in text and waiting
   > for approval **before** editing code — even if the fix looks small. A point bug fix that
   > does not change a contract does not need this step.
2. Add concrete examples distinguishing the two categories, per the plan's expansion:
   - **Contract change** (needs prior conversation): changing a public hook's signature (e.g.
     `useReader.ts`), changing a Kotlin↔RN event shape, changing navigation behavior, changing
     the shape of a domain contract defined in Phase 2 (Tasks 008-014).
   - **Point fix** (does not need it): fixing a wrong label, adjusting a color/icon, fixing a
     typo, adjusting visual spacing without changing behavior.
3. Add the provider isolation premise (Task 002) to `CLAUDE.md` § Invariants, using the wording
   reviewed in that task.
4. Add the internationalization premise as an explicit invariant: all UI text must be
   translatable, never hardcoded in a single language — flagged as missed in the original audit.
5. Add, as a permanent process rule (not just for this plan): on every code delivery for device
   testing, bump the RC via `versionar-build` + generate the build (compile-check) before asking
   the user to test; when reading "the log", always look in `/tmp/reader-log-v{N}.txt` for the
   file with the most recent timestamp, never trust which `N` was last mentioned in the
   conversation.
6. Evaluate whether a short self-check list makes sense before any edit touching
   `useReader.ts` or other central hooks: "does this change alter the navigation/data contract?
   If so, have I already explained it and gotten approval?"
7. Review whether `.claude/docs/mistakes.md` should record this episode as a concrete example —
   the file exists exactly for this.
8. Do not propose automated enforcement (hook/lint) for the contract-change distinction — it is
   a matter of judgment (what counts as "contract"), not a mechanically checkable rule. (A
   separate, complementary mechanical check is Task 033 — it does not replace this judgment
   call, it supplements it.)

## Completion criteria

- User approves the final wording of the rule(s) added to `CLAUDE.md`, including the concrete
  contract-vs-point-fix examples, the provider isolation premise, the internationalization
  premise, and the device-test-delivery flow rule.
- `.claude/docs/mistakes.md` updated, if the user agrees the episode is worth recording.

## Result

Scope grew in-session from "add a rule to `CLAUDE.md`" to a full documentation review, per the
user's call.

**`CLAUDE.md`** — moved from `.claude/CLAUDE.md` to the repo root (where the Claude Code / CTO
hook convention expects it — `user-prompt-validate-claude-md.sh` and the token guards all point
at `./CLAUDE.md`, so structure/token validation had never actually run). Reorganized from 4
loosely-split sections (Docs / Invariants / Rules / Coverage, the Invariants-vs-Rules line
blurred, screen rules scattered) to 5 by theme: **Docs / Code structure / Process / Fixed
conventions / Coverage**. ~590 tokens, under the CTO validator's 600 ceiling (validator passes
clean).

Added (the Task 032 rules):
- **Contract change** rule — "describe the proposal in text and wait for approval **before**
  editing code, even if it looks small", with inline examples (contract: `useReader()`, an
  EventBus event, a route, `SeriesDigest`; point fix: label / color / icon / typo / spacing).
- **i18n invariant** — all UI text is translatable, never a hardcoded single-language string.
- **"The log"** = the newest `/tmp/reader-log-v*.txt` by mtime, never the `N` last mentioned.

Brought in from `_contract-design-notes.md` (live design decisions worth keeping visible):
- Service isolation rule (a Service only calls its own bridge).
- Generalizer pattern expanded (every external connection → generalizer + plugin, even with one
  provider; internal-only code never becomes a plugin).
- New-file convention (`name.type.ext`, plural, test beside it).

Removed: the `core ← tools ← features` layer line (the layer concept was an explanatory crutch,
not a code-enforced rule — the generic access rule + provider-isolation line cover the intent),
the "no per-screen Transform" caveat (gone from the code since Task 037), the Splash detail
(SplashActivity / MainActivity / Task 038 — already in architecture.md), "floors live in code
not here".

**`architecture.md`** — was describing the OLD Kotlin model (3 layers `core`/`tools`/`features`)
as primary and referenced things that no longer exist: `shared/transforms/` (Task 037),
`screens/series-detail/` + `SeriesDetailTransform/Service/useSeriesDetail` (Task 024),
`features/kavita/library/KavitaLibraryFeature.kt` (never existed), `LibraryModule.kt` (Task 028),
"CacheManager (RN) not started yet" (exists since Task 023),
`ScreenControlModule.getKeepScreenOnDuringReading` (Task 039), `frontend/package.json →
bundleVersion` (the field is `version`), § Layered preference override citing `series_sort_prefs`
as a live table. Rewritten: the 6-layer reference architecture + the 9 Gradle modules
(`:server` / `:content-digest` / `:cache` / `:preferences` / `:external-metadata-server`) as the
primary model, with `features/` in a "Legacy Kotlin — being removed" section listing what still
lives and what removes each piece. Absorbed the useful tables from the refactor-map (Kotlin
modules, bridges by responsibility, the 3 communication mechanisms) and added what was missing
(immersive mode, `shared/context/`, `shared/managers/store`, `ReaderPrefs`). Added the 3
structural rules from `_contract-design-notes.md` in full (generalizer pattern in the layers
section; Service conventions + isolation in the `shared/services/` section).

**`architecture-refactor-map.md`** — deleted. It was a "transition snapshot" from the middle of
plan 017's migration; with Library / Reader / Splash / `ui_preferences` all migrated it was
obsolete. What still had value went into `architecture.md`.

**`mistakes.md`** — compacted 521 → 160 lines (~4400 → ~2200 tokens). Removed the entries that
duplicate `CLAUDE.md` invariants (screen-imports-screen, dummy-imports-service, kotlin-tool
screen-coupled, feature-gated-by-if, coupling-direction) → one line at the top. Each remaining
entry: symptom → rule, no historical root-cause prose, a `→ file` pointer for the full context.
Removed all `Reference: reader-log-vNN.txt` blocks. Fixed an editing bug in the old entry 14 (an
orphan `Fix: react-native-svg` leaked from entry 12). Added a new entry: the negative
`waitFor(toBeNull())` anti-pattern that made `server.screen.tests.tsx` drag (found this session).

**Not done** (user's call): recording the `startAtBeginning` episode in `mistakes.md` — the user
didn't recognize the specific case; the generic contract-change rule in `CLAUDE.md` covers it.
The self-check list (step 6) and an automated enforcement (explicitly ruled out by step 8) were
not pursued — Task 033 is the complementary mechanical check.

**Commits:** `30787fc` (CLAUDE.md → root), `d509eb6` (architecture.md rewrite + refactor-map
delete), `d671b14` (CLAUDE.md regroup + Task 032 rules + 3 structural rules into architecture.md),
`3762e71` (mistakes.md compaction). Also this session, outside the task: `12fa7b1` + `3118128`
(CLA workflow — action archived upstream, pointed at the user's own fork), `a993e46` (the
`server.screen` test-suite slowness fix).

**Approval:** the user reviewed and approved the `CLAUDE.md` wording line by line in this
conversation, then asked to close the task and move to 033.
