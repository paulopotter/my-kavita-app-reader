# Task 013 — Formalize the 3 communication mechanisms (Phase 2 — Contract modeling)

**Status:** todo (blocked by Task 001, Task 008)

## Objective

**Co-creation session with the user.** Formalize Kotlin→RN, RN→Kotlin, and RN→RN as named,
documented contracts — covering both mechanisms that already work today and designing the one
that does not exist yet (RN→RN).

## Scope

1. **Kotlin→RN** — name/formalize the existing "Bridge Stream" pattern as a per-event contract
   template (event name, payload shape, emitter location, consumer expectations). Already
   works; this is documentation + a reusable shape, not new mechanism design.
2. **RN→Kotlin** — same treatment for "Bridge RPC" (already documented, formalize into the
   per-operation contract template). Separately, **decide the fate of the "one-shot state"
   ad-hoc pattern** used by the Reader (`scrollToChapterId`/`scrollToPageRequest`/
   `scrollToPageIndex`): replace it with a direct imperative `ref` call, or keep it but add a
   proper race guard. This is a user decision, not an agent default — present both options with
   their tradeoffs (imperative `ref` is simpler and removes a class of race bugs but changes the
   Kotlin/RN calling convention; keeping "one-shot state" with a guard is a smaller diff but
   keeps inherent fragility).
3. **RN→RN** — design and build this mechanism **from scratch** (it does not exist today —
   see Task 001's corrected diagnosis). Design it generic, not tied to a single domain, so any
   future "operation finishes here, another part reacts" case (not just Reader/Library
   progress) can reuse it.

## Steps

1. Present the corrected 3-mechanism diagnosis (Task 001) to the user as the starting point.
2. Formalize Kotlin→RN and RN→Kotlin (Bridge RPC) into a documented, reusable per-event/
   per-operation contract shape.
3. Present the "one-shot state" fate decision with tradeoffs; get the user's explicit choice.
4. Design the RN→RN mechanism together with the user; write the contract + a minimal working
   implementation, validating feasibility before considering it done.
5. Update `.claude/docs/architecture.md` with all 3 formalized mechanisms.

## Completion criteria

- Kotlin→RN and RN→Kotlin (Bridge RPC) formalized as documented, reusable contract shapes.
- "One-shot state" fate decided explicitly by the user and recorded.
- RN→RN mechanism designed, implemented (minimal working version), reviewed, and approved.
- `architecture.md` updated.
- If code was written: tested on a real device, `make coverage` shows no drop, explicit
  approval before `finalizar-task`.
