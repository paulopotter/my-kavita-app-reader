# Task 015 — Local cache guideline (Phase 3 — Cache guideline)

**Status:** todo

## Objective

**Decision session with the user.** Decide when Room cache is mandatory, when in-memory cache
is acceptable, and — the most important open question — **who orchestrates** the cache→network
sequence. Today it is the RN hook/UI in every domain that decides "try cache first, then hit the
network"; this task decides whether that changes to a dedicated repository layer, and in which
cases.

## Inputs

- The original audit finding: Library has no Room cache at all (in-memory, 2-min TTL, does not
  survive restart) — most severe cache finding.
- Even in the "good" domains (Series Detail, Chapter, which do use Room), it is the RN hook that
  orchestrates cache-then-network — no repository layer arbitrates this transparently for the
  UI.

## Steps

1. Present both findings to the user.
2. Decide the guideline: when is Room mandatory (e.g. any list/detail data the user expects to
   see offline or across restarts) vs. when in-memory is acceptable (e.g. short-lived derived
   state that is cheap to recompute).
3. Decide who orchestrates cache→network: stays in the RN hook (status quo, documented as
   intentional) or moves to a dedicated repository/service layer (bigger change, affects Tasks
   016/017 and any future domain).
4. Decide whether this guideline becomes a formal `CLAUDE.md` invariant or stays a lighter
   guideline document (`architecture.md`) — user's call.
5. Write the guideline document. If it becomes a `CLAUDE.md` invariant, hand the wording to
   Task 024 rather than editing `CLAUDE.md` directly in this task.

## Completion criteria

- Cache guideline written and approved by the user, including the orchestration-ownership
  decision.
- Explicit decision recorded on `CLAUDE.md` invariant vs. `architecture.md` guideline.
- Guideline referenced by Task 016 (Library correction) before that task starts implementation.
