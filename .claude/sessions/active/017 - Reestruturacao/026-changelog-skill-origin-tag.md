# Task 026 — `atualizar-changelog` skill: use `<origin-tag>..HEAD` diff as cross-check (Phase 6 — Safeguards)

**Status:** todo

## Objective

Upgrade the `atualizar-changelog` skill so it also computes the latest tag from the **remote**
(not just local) and reads the real diff `<latest-origin-tag>..HEAD` as an additional
cross-check — without changing how it writes the changelog. This is what makes this plan's own
closure changelog (see README.md "Execution rules") work correctly, and covers every future
plan closure too.

## What does not change

The skill keeps generating entries the way it does today (Semantic Release format,
Backend/Frontend grouping, pt-BR, one line per user-visible change, no speculation/inference).
Only the *input* changes.

## What changes

Today the skill only reads conversation context ("use conversation context; do not read git
diff"). It should **additionally**:

1. Compute the latest tag from the remote — `git fetch --tags` then
   `git ls-remote --tags --sort=-v:refname origin | head -1`, or equivalent — validate which
   approach is more reliable in this repo (do not trust a local-only tag; the user may not have
   fetched).
2. Read the real diff `<latest-origin-tag>..HEAD` as a cross-check against what the
   conversation context surfaced, to avoid missing something that happened during the session
   but wasn't obvious in conversation.
3. `plan-manager` (plan closure) continues to be the one that **calls** `atualizar-changelog` at
   plan closure — this task does not duplicate that orchestration logic, only fixes what the
   skill itself does when invoked.

## Steps

1. Locate the `atualizar-changelog` skill definition and identify where it currently sources its
   input (conversation context only).
2. Add the remote-tag computation step and the diff cross-check step, per the "what changes"
   section above.
3. Test it against this plan's own closure scenario: current latest tag `2026.08.20.0248` (cited
   here only as *today's* value — the skill must compute it dynamically, never hardcode it) and
   whatever commits exist by the time this plan closes.
4. Confirm the skill's *output format* is unchanged — only its input sourcing changed.

## Completion criteria

- Skill computes the latest tag from `origin`, not just locally.
- Skill reads and cross-checks the real diff `<origin-tag>..HEAD` in addition to conversation
  context.
- Output format unchanged (verified against an existing changelog entry style).
- `plan-manager`'s orchestration (calling the skill at plan closure) is unchanged.
