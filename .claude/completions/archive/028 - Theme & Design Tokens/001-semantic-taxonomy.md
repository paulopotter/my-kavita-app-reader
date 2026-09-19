# Task 001 — Semantic taxonomy + written application rules

## Why first

Every other task in this plan consumes these names: the lint rule allows them, the provider
distributes them, the Kotlin prop path forwards them, and the three themes fill them. Renaming after
any of that exists means touching all of it twice.

The groundwork is done — centralization (commit `639d808`) and value convergence (working tree) both
landed, and the convergence already answered the hard question of *which tones are actually
different*. This task only has to turn "the role this value plays today" into "the role this token
plays in any identity".

## What to do

### 1. Rename the 51 tokens to semantic names

Constraint from README Decision 1, non-negotiable: **no name may mention luminosity.** `textOnDark`,
`white80`, `deep`, `readerSurface` are all disqualified by their own names, because under an amber or
forest identity they describe something that is no longer true. Names describe the **role and the
surface relationship** — `surface`, `surfaceRaised`, `surfaceInset`, `onSurface`, `onSurfaceMuted`,
`accent`, `onAccent`, `border`, `scrim`, … — never a brightness, never a scale position.

Work from the converged table: the 38 distinct values across 51 tokens in
`frontend/src/shared/theme/colors.ts` are the input, and the convergence comments in that file
already explain which tokens share a value and why. Tokens that were merged onto the same value are
strong candidates to become **one** token.

### 2. Write the application rules — this is the actual deliverable

For **every** token, a written rule saying **where it is allowed to be used**, e.g.
*"`surfaceRaised` = card, list row, context menu"*. README Decision 2 exists because renaming alone
leaves the next person choosing between two plausible tokens by feel.

These rules are checked in as `frontend/src/shared/theme/tokens.rules.md`, beside the tokens. No
token may be documented as "misc", "various" or "wherever it looks right" — a token that cannot be
given a rule is a sign that it should be merged into one that can.

### 3. Migrate the call sites

Mechanical, once the mapping is agreed: the old name → the new name across the 44 `*.styles.ts`
files and the ~15 `.tsx` files that consume `colors`. No value changes in this task — the device
already approved these values, and mixing a rename with a value change would make any visual
regression impossible to attribute.

## Contract-change gate

**This is a contract change.** The token table is imported by essentially the whole frontend.
Per CLAUDE.md, produce the full old-name → new-name mapping plus the draft rules **in text**, get it
approved, and only then edit code.

## The reader background is settled

Per Decision 7 the reader page background is **always black, in every theme**. Name it as the
identity-independent constant it is, and write its rule so that it reads as a reading surface rather
than a themed surface — a future identity must not be able to repaint it by filling in the table.

## Blocked on

- **README open question 2** — whether `positive`/`msgOk` and `dangerDeep` survive as three distinct
  tokens or are re-expressed (status-dot role vs message role; destructive surface vs destructive
  foreground). Both were kept apart for recorded reasons; the taxonomy may honour that distinction
  under different names, but it must not silently drop it.

## Files to create

- `frontend/src/shared/theme/tokens.ts` (replacing `colors.ts`) + tests beside it.
- `frontend/src/shared/theme/tokens.rules.md`.

## Files to modify

- `frontend/src/shared/theme/index.ts` — the public export surface.
- All 44 `*.styles.ts` and ~15 `.tsx` consumers.
- `frontend/src/screens/reader/reader-sdu.ts` — confirm it emits a token, not a literal (README
  finding a).

## Acceptance criteria

- No token name contains `dark`, `light`, `white`, `black` or any other brightness word.
- `tokens.rules.md` covers 100% of the tokens, each with a concrete "used for" rule.
- Rendered output is byte-for-byte unchanged versus the pre-task build: same values, new names only.
- The `'#123456'` in `follow-star.tests.tsx` is untouched (README context).
- `tsc --noEmit`, ESLint and Jest pass; JS coverage floor bumped if coverage rose.

## Project-pattern checklist

- Everything stays under `shared/theme/`; no screen owns a token.
- File naming follows `name.type.ext` and tests sit beside the file, not in `__tests__/`.
- The rules document is in English, like everything under `.claude/` and in code.
