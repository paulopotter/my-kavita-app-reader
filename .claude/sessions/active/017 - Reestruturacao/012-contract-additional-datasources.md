# Task 012 — Contract: additional DataSources (Phase 2 — Contract modeling)

**Status:** todo (blocked by Task 007, Task 008) — **conditional task**

## Objective

**Co-creation session(s) with the user, conditional on Task 007's findings.** If Task 007
(survey of direct Kavita coupling points outside Chapter/Series/Library) finds points that
plausibly need `DataSource`-style isolation, this task generalizes the `ChapterDataSource`
pattern (interface + `Kavita*Feature` impl + Hilt `@Binds` binding) to each of them.

## Scope note

The number of sub-tasks this spawns depends entirely on the Task 007 findings — not fixed in
advance. If Task 007 finds zero points needing this treatment, this task closes as "not
applicable" with that decision recorded, rather than being forced to produce a contract.

## Steps

1. Review the Task 007 findings with the user.
2. For each point that plausibly needs isolation, decide together whether it fits the
   `ChapterDataSource` pattern directly, or whether it should instead be routed through the
   plugin manager module being designed in Task 014 (some points may be premature for a full
   `DataSource` and better handled once the manager module exists).
3. For points chosen for immediate treatment, model the interface + implementation contract
   (reusing the Task 008 template where it fits) and write the contract + supporting code
   together with the user.
4. Update `.claude/docs/architecture.md` with each formalized contract once approved.

## Completion criteria

- Every Task 007 finding has an explicit decision recorded: isolated now (with contract), routed
  to Task 014's manager module instead, or explicitly deferred with a reason.
- Any contract written in this task is reviewed and approved by the user.
- `architecture.md` updated for anything formalized here.
- If code was written: tested on a real device, `make coverage` shows no drop, explicit
  approval before `finalizar-task`.
