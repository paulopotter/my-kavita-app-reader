# Task 033 — Architectural compliance skill/agent (Phase 7 — Safeguards)

**Status:** done

## Objective

New task, additive to Task 032 (does not replace it). Create a skill or agent that runs at the
end of every task in this plan (and future plans) mechanically checking the premises in the
audit inventory (the 5 originally audited — dumb components, scope-bound responsibility,
events, single contract, local cache — plus internationalization and provider isolation/plugin
manager) against the task's diff.

## Scope note

This is a mechanical, diff-level check — it does not replace the human judgment call from Task
024 (what counts as a "contract change" needing prior conversation). It is a complementary,
additional check.

## Steps

1. Define what the skill/agent checks for each premise, at a diff level (e.g. for "dumb
   components": does a screen component import a service directly; for "provider isolation":
   does new code outside a `*Feature`/`DataSource` reference `Kavita`-specific names).
2. Decide the invocation point — end of each task (`finalizar-task`) is the natural hook,
   confirm with the user.
3. Decide the failure mode — does it block `finalizar-task`, or just report findings for the
   user to review? (user decides — Task 032 explicitly ruled out automated *enforcement* for the
   contract-vs-point-fix judgment; this task's checks are narrower and more mechanical, so the
   answer may differ, but must be confirmed, not assumed).
4. Implement the skill/agent.
5. Validate it against at least one already-known violation (e.g. run it against the current
   `KavitaSeriesFeature.listSeries()` reading `chapterCacheDao` directly, before Task 024 fixes
   it) to confirm it actually catches real cases.

## Completion criteria

- Skill/agent implemented and reviewed by the user.
- Invocation point and failure mode (block vs. report) explicitly decided and documented.
- Validated against at least one known real violation before being considered functional.

## Result

**Delivered as a skill**, `checar-arquitetura` (`.claude/skills/checar-arquitetura/SKILL.md`).
Skill over hook, decided with the user: a hook can't bind to "before `finalizar-task`"
specifically, and the checks need judgment (distinguish deliberate legacy from a new violation,
ignore comments) that bash regex can't do cleanly. A blocking hook on a false positive would
also jam the whole commit flow, not just the task close.

**Invocation point**: step 0 of `finalizar-task`, blocking (edited into
`finalizar-task/SKILL.md`). `finalizar-task` invokes it first; a BLOCKING finding stops it until
the code is fixed or the user confirms a false positive. Also invocable directly
(`/checar-arquitetura`). REPORT-ONLY findings (i18n) surface but don't block.

**Scope**: only the task's own diff — the range from the task's "abre a task" commit (or the
first commit whose message references the task) to `HEAD`. A pre-existing violation the task
merely moved is noted, not blocked.

**The 6 checks**:
1. Dumb component (`components/`) imports a service / `NativeModules.` / a `*Bridge` — BLOCKS.
2. A screen imports from another screen — BLOCKS.
3. Provider knowledge (`Kavita`/`m3`/`Bff`) in new non-comment code outside `plugins/` — BLOCKS
   if newly introduced. Allowlist: `features/kavita/**`, `server/plugins/kavita/**`,
   `external-metadata-server/plugins/m3/**`, `shared/bridge/*`, the legacy bridges
   (`SeriesModule`, `ReaderChapterModule`, `SetupModule`, `StartupModule`), `AppReactPackage` /
   `MainApplication`.
4. A `*.services.ts` imports another domain's `Digest`/`Service` — BLOCKS.
5. Hardcoded UI string in JSX (no `{t.…}`) — REPORT-ONLY.
6. Kotlin coupling reversed (`core/` → `tools`/`features`; `tools/` → `features`) — BLOCKS.
   `:tools` may import `:cache` (documented exception).

**Validation**: each grep was run against a synthetic violating sample (checks 1–3 catch the
violation, ignore comments, ignore `shared/`) and against the current codebase (checks 4–6
clean, zero false positives). Two BSD-grep bugs fixed during validation: the comment filter used
`\s` (macOS `grep -E` needs `[[:space:]]`), and check 3 used `\bKavita\b` (no word boundary after
`Kavita` in `KavitaAuthFeature` — switched to substring match). Then the skill was run for real
against Task 033's own diff → `✓ passed, no blocking findings` (it only touched 2 `SKILL.md`
files).

**Not done**: the "run it against `KavitaSeriesFeature.listSeries()` reading `chapterCacheDao`
directly" example from step 5 — that violation is `chapterCacheDao` access from a legacy
`features/kavita/` file, which is *allowlisted* legacy, not a check-3 target. The synthetic
"new Service names Kavita" test covers the same rule against a real would-be violation instead.

**Commit**: `91846b2`.

**Approval**: user confirmed the skill+step-0 approach and the blocking-before-`finalizar-task`
behavior in this conversation.
