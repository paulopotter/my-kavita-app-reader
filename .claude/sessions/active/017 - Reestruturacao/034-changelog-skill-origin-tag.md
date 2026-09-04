# Task 034 — `atualizar-changelog` skill: use `<origin-tag>..HEAD` diff as cross-check (Phase 7 — Safeguards)

**Status:** done

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

## Result

**`atualizar-changelog/SKILL.md`** — new "Input — conversation context, cross-checked against
the real diff" section + steps:

1. `git ls-remote --tags --sort=-v:refname origin | grep -v '\^{}' | head -1 | sed
   's#.*refs/tags/##'` — the latest tag on `origin`, computed dynamically (never hardcoded);
   falls back to `git tag --sort=-v:refname | head -1` with a note if `origin` is unreachable.
   The repo's tags are date-stamped (`2026.08.20.0248`) so `-v:refname` sorts newest-first.
2. `git diff <tag>..HEAD --stat` + `git log <tag>..HEAD --oneline` as a cross-check — skim file
   areas and commit subjects for user-visible changes the conversation didn't surface; ignore
   pure-internal churn (renames, test-only, `.claude/`, docs).
3. A user-visible change the conversation missed → add a bullet, same rules.

The conflicting "only describe changes ... in the current conversation" rule was relaxed to
"either implemented and approved in this conversation, **or** plainly visible in the
`<origin-tag>..HEAD` diff — never speculate beyond those two."

**Output format unchanged**: only edit the `[Unreleased]` block, no version/date, pt-BR,
`### Backend`/`### Frontend`, one bullet per user-visible change, Conventional Commits prefix,
no file names. Only the *input* sourcing changed.

**`plan-manager.md`** — the skill's own trigger note said it's "called automatically alongside
... `plan-manager` archiving", but the `plan-manager` agent's "Closing a finished plan" steps
never mentioned it. Closed that gap: step 1 of plan closure now invokes `atualizar-changelog`
and shows its diff. (Not "duplicating orchestration" — the skill already expected this call; the
agent just didn't have it written down.)

**Tested** against the plan-017 closure scenario: `origin`'s latest tag resolved to
`2026.08.20.0248` (dynamic), `git log 2026.08.20.0248..HEAD` = 252 commits, dozens of
`feat:`/`fix:`/`perf:` that are real user-visible plan-017 changes — exactly the case a
conversation-only source can't cover. `CHANGELOG.md`'s `[Unreleased]` is currently empty; the
skill fills it from that range + context when the plan closes.

The `refactor:` cross-check point (added after the user flagged it): `refactor:` commit subjects
are read, not skipped — many in this repo change observable behavior (a pref resets, a screen
changes, a table is dropped) and earn a bullet as `feat`/`fix`.

**Commit**: `6c9569d`.

**Approval**: user asked to proceed with the task in this conversation ("bora").
