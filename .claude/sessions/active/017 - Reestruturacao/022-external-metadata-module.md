# Task 022 — `ExternalMetadata`/BFF module implementation (Phase 4 — Implementation)

**Status:** todo (blocked by Task 017 — follows the same generalizer-module pattern `Server`
established, and per Task 012's decision this is its own sibling module, not folded into
`Server`)

## Objective

Implement the `ExternalMetadata` module (Layer 2) — the module decided in Task 012 for BFF/
external-metadata enrichment (a distinct purpose from Server's readable-content responsibility,
per Task 012's explicit decision that `BffFeature` becomes its own separate module rather than
being folded into `Server`). Follows the same generalizer pattern established for `Server` in
Task 014/017: a Layer 2 facade with zero provider-specific knowledge, routing to whichever
concrete metadata provider(s) are plugged in underneath.

## Scope decision deferred to implementation time

Whether this task is a **thin skeleton** (the module shape/routing exists, but internally still
delegates to today's `BffFeature` largely unchanged) or a **real migration** of `BffFeature`'s
existing logic into the new module's plugin structure is **not fixed here** — the user decides
in a mini-iteration when this task is actually picked up, the same way Task 028's Library scope
was revised mid-plan once real code was inspected. Do not assume either direction before that
conversation happens.

## Inputs

- Task 012's decision (`_contract-design-notes.md` § "Task 012") — `BffFeature` is its own
  module, not absorbed into `Server`.
- Task 014/017's generalizer pattern (folder nesting `<Module>/plugins/<provider>/`, facade-only
  routing, adapter doing the real translation) — the same shape applies here, with whatever the
  concrete metadata provider(s) are playing the role Kavita plays for `Server`.
- Today's real `BffFeature` code as the starting point for whichever scope (skeleton vs.
  migration) the mini-iteration decides.

## Steps

1. Present Task 012's decision and today's real `BffFeature` code to the user; decide the scope
   (skeleton vs. real migration) before writing any code.
2. Create the `ExternalMetadata` module (Layer 2) following the same generalizer shape as
   `Server`: the facade knows only routing, the adapter(s) (nested under
   `ExternalMetadata/plugins/<provider>/`) hold the real translation logic.
3. Implement whichever scope was decided — either the routing skeleton alone, or the full
   migration of `BffFeature`'s existing behavior into the new structure.
4. Confirm Series' `syncBff` orchestration (per Task 028's decision — RN decides *when* to sync;
   the Series↔`ExternalMetadata` composition happens inside Kotlin as same-layer delegation)
   still works against whichever scope was implemented.

## Completion criteria

- Scope (skeleton vs. real migration) explicitly decided with the user before implementation,
  and recorded in this task's result.
- `ExternalMetadata` module exists as a Layer 2 generalizer, structurally consistent with
  `Server`'s pattern (facade routing only, adapter doing real translation, nested plugin folder).
- Whatever scope was implemented is tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.
