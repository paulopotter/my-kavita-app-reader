# Task 016 — Relocate the raw Kavita plugin to `Server/plugins/kavita/` (Phase 4 — Implementation)

**Status:** done

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

## Result

**Diverged from the original plan on purpose, with the user's explicit sign-off at each step**
(mini-iteration process, `_contract-design-notes.md` conventions): this ended up being new code,
not a pure mechanical move, and the old code was left in place rather than deleted.

- **New Gradle module `:server`** (`android/server/`), depending only on `:core` and `:tools` —
  not nested inside `:features`, contrary to the task's original framing of "relocation into
  `features/kavita/`'s eventual generalizer." The user's call: `core` (base) ← `tools` (toolbox) ←
  `Server`, with `features/`'s fate deferred to a later decision.
- **`server/plugins/kavita/{auth,chapter,series}.kt`** — rewritten from scratch (not moved), per
  the user's explicit correction ("you're not moving, you're creating"): no Room/cache access at
  all (removed entirely — cache is a different layer's job), `baseUrl`/`jwt`/`apiKey` received in
  the constructor instead of resolved internally via `KavitaUrlSource`/`ServerConfigDao`. DTOs
  expose only the fields the Task 014 contracts (`SeriesContract`/`ChapterContract`) actually use,
  not the full Kavita schema — cross-checked against the `kavita-api` skill.
- **`KavitaUrlSelector`/`KavitaUrlSource`** — left untouched in `features/kavita/`, per explicit
  decision (Task 017 absorbs this). **`ActiveUrlWatcher`** — also left out of scope (generic,
  not Kavita-specific, not one of the four named classes).
- **Old code in `features/kavita/` was not touched or deleted** — nothing in the app points at
  the new module yet; `KavitaSeriesFeature`/`KavitaChapterFeature`/`KavitaAuthFeature` remain the
  live implementation Task 017 will cut over from.
- Later in the same working session (documented in the Task 017 doc, not repeated here): the
  `ServerPlugin` interface and `KavitaServerPlugin` adapter were also built directly on top of
  this — see Task 017 for that scope.

**Testing:** automated only — 81 tests across `KavitaAuthTest`/`KavitaSeriesTest`/
`KavitaChapterTest` (MockWebServer), `koverVerify` passing with no floor drop. No real-device test
— nothing built here is wired into the running app yet (by design; that's Task 017's job).

**Approval:** explicit, in conversation — user confirmed closing Task 016 as done while Task 017
continues (`"A task 16 pode colocar como concluida... a 17 ainda está em doing, pq vamos fazer
ainda o server"`).
