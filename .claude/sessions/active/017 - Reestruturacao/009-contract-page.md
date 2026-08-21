# Task 009 — Contract: Page (Phase 2 — Contract modeling)

**Status:** done

## Objective

**Co-creation session with the user.** Model the formal Page domain contract, reusing the
template shape defined during Task 008, anchored in real TypeScript data examples (how the app
receives and uses page data today).

## Inputs

- Task 003 survey (fields, operations, consumers for Page).
- Task 008's contract template shape and the finished Chapter contract (Page nests inside
  Chapter in the domain composition — `Page → Chapter → Series → Library` per `CLAUDE.md`
  Invariants — so the Page contract must compose cleanly under Chapter).

## Steps

1. Present the Task 003 survey findings to the user.
2. Model the Page contract using the Task 008 template — adjust the template if Page does not
   fit it cleanly (expected: Page is smaller/simpler than Chapter, template may need trimming
   rather than expanding).
3. Confirm how Page composes under the Chapter contract (is Page a field inside Chapter's
   shape, or a separate fetchable unit? — user decides).
4. Write the contract + any supporting code together with the user, validating feasibility
   before considering it done.
5. Update `.claude/docs/architecture.md` with the formalized contract once approved.

## Completion criteria

- Page contract modeled, reviewed, and approved by the user.
- Composition with the Chapter contract confirmed.
- `architecture.md` updated.
- If code was written: tested on a real device, `make coverage` shows no drop, explicit
  approval before `finalizar-task`.

## Result

Page contract modeled first, as the actual pilot of the co-creation process (before Chapter's
own template got formalized retroactively). Final shape: `PageContract extends ImageDescriptor`
(Page's core identity *is* an image, so it inherits the descriptor's fields flattened rather
than nesting them), plus `PageResult`, and the new shared `ImageDescriptor`/`ServerDescriptor`
types this session produced along the way. Composition under Chapter confirmed:
`ChapterContract.pages.list: PageResult[]`, built by Chapter calling the Page domain module
directly (same-layer composition, R1). Final shapes live in
`.claude/sessions/active/017 - Reestruturacao/_contract-design-notes.md`.

**Explicit caveats, per user decision (same as Task 008):**
- **Base contract**, not final — expected to evolve (e.g. `bookScrollId`, a real field found on
  Kavita's `ProgressDto` via the `kavita-api` skill, was deliberately left unreviewed and not
  incorporated — flagged in the design notes' Open/rejected section for explicit follow-up).
- `architecture.md` update deferred, not done — recorded pending item, likely bundled with
  Library's contract task.
- No production code written this session — coverage/device-testing criterion does not apply.
