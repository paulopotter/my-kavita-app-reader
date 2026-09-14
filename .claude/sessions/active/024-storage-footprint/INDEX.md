# Plan 024 — Storage Footprint & Resource Hygiene — Tasks

See `README.md` for full context, decisions, non-goals, and the open questions each task is
blocked on.

| # | Task | Depends on | Status |
|---|------|------------|--------|
| [001](001-storage-measurement.md) | `:storage` module scaffold + `StorageSource` measurement — find out what the ~900 MB actually is | — | pending |
| [002](002-storage-budget-preference.md) | `StorageBudget` — the user-configurable max-cache-size preference | 001 | pending |
| [003](003-ceiling-enforcement-and-splash-purge.md) | Enforce the ceiling in Coil + fire the existing `:cache` purge on splash | 002 | pending |
| [004](004-clear-action-and-bridge.md) | `clear()` per source + `StorageBridgeModule` + RN Service | 001, 002 | pending |
| [005](005-storage-config-screen.md) | RN: `config/storage/` — usage breakdown, ceiling control, clear action | 003, 004 | pending |

## Suggested execution order

Strictly sequential 001 → 005, and the order matters more here than usual because the first task
is what stops the rest from guessing.

**001 first, always.** The default ceiling (open question 1), the purge policy (open question 2)
and the screen's own control shape all depend on knowing what the 900 MB is actually made of (open
question 4). Measuring is cheap; picking a number blind and discovering later that pages were never
the problem is not.

**002 before 003** — enforcement needs somewhere to read the ceiling from, and defining that
storage first keeps the default declared in exactly one place.

**003 before 005** — the screen must be able to say truthfully that the ceiling applies from the
next app start, which is only knowable once the Coil wiring is real.

**004 can start as soon as 001/002 exist** (it needs the `StorageSource` interface and the budget,
not the boot wiring), but it lands before 005, which consumes it.

**005 last** — it is the only task that touches the UI, and it consumes all four.

## Open questions blocking specific tasks

| Question (README) | Blocks |
|---|---|
| 1 — default ceiling + the options offered | 002, 003, 005 |
| 2 — purge by age, by size, or both | 002, 003 |
| 3 — triggers beyond splash (e.g. leaving the Reader) | nothing in this list — a follow-up task if adopted |
| 4 — what actually composes the ~900 MB | answered *by* 001; gates the numbers in 1 and 2 |
