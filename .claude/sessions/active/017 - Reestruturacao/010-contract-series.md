# Task 010 — Contract: Series (Phase 2 — Contract modeling)

**Status:** todo (blocked by Task 005, Task 008)

## Objective

**Co-creation session with the user.** Model the formal Series domain contract, reusing the
template shape from Task 008, anchored in real TypeScript data examples.

## Inputs

- Task 005 survey (fields, operations, consumers for Series, including the 3 duplicated
  progress-aggregate computations and the direct `chapterCacheDao` read finding).
- The finished Chapter contract (Task 008) — Series composes Chapter data (progress aggregate
  is derived from chapter-level read state).

## Steps

1. Present the Task 005 survey findings to the user, including the exact 3 locations where
   `readCount`/`progressFraction` are currently recomputed differently.
2. Model the Series contract using the Task 008 template.
3. Decide the single canonical way to compute the series progress aggregate (`readCount`/
   `progressFraction`) — this becomes the one source of truth Task 017 implements.
4. Decide how Series should obtain chapter data going forward (must delegate to the Chapter
   contract/layer, not read `chapterCacheDao` directly — the actual code fix is Task 017, this
   task only decides the contract shape that fix will follow).
5. Write the contract + any supporting code together with the user, validating feasibility
   before considering it done.
6. Update `.claude/docs/architecture.md` with the formalized contract once approved.

## Completion criteria

- Series contract modeled, reviewed, and approved by the user, including the single canonical
  progress-aggregate formula.
- Decision recorded on how Series delegates to Chapter (informs Task 017).
- `architecture.md` updated.
- If code was written: tested on a real device, `make coverage` shows no drop, explicit
  approval before `finalizar-task`.
