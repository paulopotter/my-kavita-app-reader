# Task 025 — Architectural compliance skill/agent (Phase 6 — Safeguards)

**Status:** todo (blocked by Task 024)

## Objective

New task, additive to Task 024 (does not replace it). Create a skill or agent that runs at the
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
   user to review? (user decides — Task 024 explicitly ruled out automated *enforcement* for the
   contract-vs-point-fix judgment; this task's checks are narrower and more mechanical, so the
   answer may differ, but must be confirmed, not assumed).
4. Implement the skill/agent.
5. Validate it against at least one already-known violation (e.g. run it against the current
   `KavitaSeriesFeature.listSeries()` reading `chapterCacheDao` directly, before Task 017 fixes
   it) to confirm it actually catches real cases.

## Completion criteria

- Skill/agent implemented and reviewed by the user.
- Invocation point and failure mode (block vs. report) explicitly decided and documented.
- Validated against at least one known real violation before being considered functional.
