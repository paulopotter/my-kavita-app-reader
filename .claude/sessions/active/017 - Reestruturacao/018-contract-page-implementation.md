# Task 018 — Contract: Page implementation (Phase 4 — Implementation)

**Status:** todo (blocked by Task 017 — needs the real `Server` module to call)

## Objective

Implement the Page contract (Layer 3) for real, in idiomatic Kotlin, from the TypeScript
specification already modeled in Task 009 and recorded in `_contract-design-notes.md` §
"Current contract shapes" (`page/contract.ts`). This is the first of the three domain-contract
implementation tasks (Page → Chapter → Series, in composition order per the Domain Composition
invariant) — Page has no downstream domain dependency, so it is implemented first.

## Inputs

- `_contract-design-notes.md`'s `page/contract.ts` shape — `PageContract extends ImageDescriptor`
  (Page IS an image, not merely composed of one), `PageResult` as the
  `{isSuccess: true} & PageContract | {isSuccess: false} & ErrorContract` discriminated shape.
- `ImageDescriptor`, `CacheDescriptor`, `ServerDescriptor`, `ErrorContract` — the shared
  sub-contracts Page depends on (also not yet fully modeled in Kotlin; model the minimal shape
  each needs to support `PageContract`, without over-designing fields no real task uses yet).
- Task 017's `Server` module — this is what a Page implementation calls to resolve real data.

## Steps

1. Translate `PageContract`/`PageResult` into idiomatic Kotlin: a `data class PageContract(...)`
   mirroring the TS fields, and a `sealed interface PageResult` (or equivalent sealed hierarchy)
   with `Success`/`Failure` variants carrying `PageContract`/`ErrorContract` respectively —
   whichever idiom keeps the discriminated-union shape closest to the TS original without forcing
   an unnatural Kotlin pattern.
2. Model the minimal Kotlin shapes for `ImageDescriptor`, `CacheDescriptor` (without any actual
   cache resolution — just the data shape, per Task 015's guideline that `CacheDescriptor` is
   embedded in every domain contract), `ServerDescriptor`, and `ErrorContract` as needed to
   support `PageContract`.
3. Wire the real implementation to call `Server` (Task 017) directly — no cache layer involved
   yet, matching Task 017's own "no cache in this phase" scope.
4. Validate against real data: confirm the Kotlin shape round-trips correctly against what
   `Server`/`KavitaAdapter` actually returns for a real page.

## Completion criteria

- `PageContract`/`PageResult` implemented in idiomatic Kotlin, matching the TS specification in
  `_contract-design-notes.md`.
- Minimal `ImageDescriptor`/`CacheDescriptor`/`ServerDescriptor`/`ErrorContract` Kotlin shapes
  exist, sufficient to support `PageContract` (not necessarily complete for every future
  contract's needs — extend later if a subsequent task's real shape doesn't fit).
- Calls `Server` directly, with no cache logic.
- Tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.
- Blocks Task 019 (Chapter contract, which composes `PageResult[]`).
