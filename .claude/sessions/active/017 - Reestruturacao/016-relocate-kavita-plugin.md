# Task 016 — Relocate the raw Kavita plugin to `Server/plugins/kavita/` (Phase 4 — Implementation)

**Status:** todo

## Objective

Pure repositioning of folders/packages: move the existing raw Kavita plugin code (Layer 0/1 —
`KavitaChapterFeature`, `KavitaSeriesFeature`, `KavitaAuthFeature`, `KavitaUrlSelector` and any
other Kavita-named class/file) so it physically lives nested inside its future generalizer
module, per Task 014's structural decision: `Server/plugins/kavita/`, never as a sibling
top-level folder. This task changes **no behavior** — it is folder/package relocation only,
laying the ground for Task 017 to build the real `Server` module (Layer 2) around it.

## Why this is its own task, before Task 017

Task 014 decided the folder shape (`Server/plugins/kavita/`) as a structural rule, but nothing
in the codebase reflects it yet — the Kavita classes still live wherever the original
(pre-plan-017) code put them. Moving them first, with zero behavior change, makes Task 017's
diff (building the actual `Server` routing/adapter layer) isolated to genuinely new code,
instead of being mixed with a large, hard-to-review file move.

## Inputs

- Task 014's structural design (`_contract-design-notes.md` § "Task 014 — Server manager module:
  structural design") — the folder nesting rule and the Layer 0/1/2 split.
- Task 012's decision that `KavitaUrlSelector` is removed entirely (its logic moves into `Server`
  in Task 017, not relocated as-is here — confirm this class is either left behind for Task 017
  to absorb, or moved and clearly marked as pending removal, whichever is less disruptive to do
  in a pure-relocation task).

## Steps

1. Identify every Kavita-named class/file currently in the codebase (`KavitaChapterFeature`,
   `KavitaSeriesFeature`, `KavitaAuthFeature`, `KavitaUrlSelector`, any DAO/DTO that is
   Kavita-specific rather than generic).
2. Create the `Server/plugins/kavita/` package structure and move each identified file into it,
   updating package declarations and imports — no logic changes inside any moved file.
3. Update every call site (Hilt bindings, `AppReactPackage.kt`, any direct reference) to the new
   package path.
4. Confirm the app builds and behaves identically to before the move (this is a mechanical
   refactor — any behavior difference is a bug in this task, not an intended change).

## Completion criteria

- Every raw Kavita class/file lives under `Server/plugins/kavita/`, nested inside the future
  `Server` module per Task 014.
- No behavior change — app builds and runs identically to before the move.
- Tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.
- Blocks Task 017 (building the real `Server` module around this relocated plugin).
