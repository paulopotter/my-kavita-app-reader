# Task 014 — Plugin manager module design (Phase 2 — Contract modeling)

**Status:** todo (blocked by Task 002, Task 007, Task 008)

## Objective

**Co-creation session with the user.** Design the "plugin manager module" pattern described in
Task 002 — a registry/manager that generalizes `ChapterDataSource` to support multiple
simultaneous implementations per category (server, notification provider, etc.), including the
explicit "use provider X" operation as part of the module's own contract.

## Why this is more than `ChapterDataSource`

Today's pattern is 1 interface → 1 fixed implementation, wired once via Hilt `@Binds` — no
registry, no runtime choice of implementation. This task designs the layer that adds: knowing
which implementations exist, managing them, and exposing a single point of contact so the rest
of the app never talks to a concrete implementation directly.

## Inputs

- Task 002's reviewed premise text.
- Task 007's survey of direct Kavita coupling points (informs which categories/points are
  realistic candidates for this module now vs. later).
- Task 008's Chapter contract and `ChapterDataSource` as the direct precedent to generalize.
- Backlog 011 (BFF plugin, multiple `MetadataSource`) and backlog 008 (Notifications, multiple
  providers) as the first concrete cases this design should be validated against (design-time
  validation only — implementing those backlog items is out of scope here).

## Steps

1. Present Task 002's premise and Task 007's findings to the user.
2. Model the manager module's own contract: what operations it exposes to the rest of the app
   (list available implementations, get active implementation, explicitly select an
   implementation, register a new implementation).
3. Validate the design against the two anticipated cases (backlog 011, backlog 008) without
   implementing them — walk through how each would plug into the manager module.
4. Decide how this relates to the Task 012 DataSources (if any) — does the manager module wrap
   them, or are simple single-implementation `DataSource`s (like today's `ChapterDataSource`)
   allowed to stay outside the manager module for domains that will never need multiple
   providers? (user decides — do not assume every domain needs the full manager pattern).
5. Write the contract + a minimal reference implementation together with the user, validating
   feasibility before considering it done.
6. Update `.claude/docs/architecture.md` with the formalized pattern.

## Completion criteria

- Plugin manager module contract modeled, reviewed, and approved by the user.
- Design validated (on paper) against backlog 011 and backlog 008 use cases.
- Decision recorded on which domains need the full manager pattern vs. a simple `DataSource`.
- `architecture.md` updated.
- If code was written: tested on a real device, `make coverage` shows no drop, explicit
  approval before `finalizar-task`.
