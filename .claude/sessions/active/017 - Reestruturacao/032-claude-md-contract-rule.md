# Task 032 — CLAUDE.md contract-change rule with concrete examples (Phase 7 — Safeguards)

**Status:** todo

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
