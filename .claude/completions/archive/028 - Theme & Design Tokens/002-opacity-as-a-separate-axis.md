# Task 002 — Opacity as a separate axis

## Why here

It has to come immediately after Task 001 because it **removes 13 tokens from the table Task 001
just published** — the 8 `whiteNN` and the 5 `overlay*`. Publishing a taxonomy and then deleting a
quarter of it is worse than doing both in sequence; doing it later, after the provider and the lint
rule exist, is worse still.

## What to do

### 1. Define the mechanic

README Decision 3: **any colour must be able to take opacity, and the level belongs to the
context/component, not to the colour.** Two shapes are on the table — an `alpha(token, level)`
helper, or a named opacity scale applied at the call site. Pick one and justify it; do not ship both.

Whatever is chosen must make this expressible: *"a secondary button's border is the border colour at
the border level"*, with neither half hardcoded.

### 2. Define the scale

A small set of **named levels**, not free numbers. The evidence below is already collected and is
the input to the scale — it shows alpha tracking the component's role with no exceptions found:

| Current token | Always used for |
|---|---|
| `white20` | secondary-button **border** — detail-modal, chapter-sort, serie, splash/alert, confirm-dialog |
| `white80` | secondary-button **label** — same files |
| `white45` / `white40` / `white35` | **placeholder or inactive item** — MainNavigator `INACTIVE`, search-input placeholder, chapter-sort placeholder |
| `white60` | **supporting text / secondary note** |

Name the levels after those roles, not after their numbers — a level called `border` survives a
designer changing 0.2 to 0.24; a level called `alpha20` does not.

### 3. Fold the scrims in, or keep them apart — decide explicitly

The 5 `overlay*` tokens converged onto two values (a light scrim and a heavy one). They are the same
mechanic (a base colour at an opacity) but a different role (darkening content behind a modal rather
than de-emphasising a foreground). Whether they join the same scale or get their own is part of this
task's decision, and the reasoning goes in `tokens.rules.md`.

### 4. Migrate the call sites

Using the evidence table above: each `whiteNN`/`overlay*` use site becomes base colour + named level.
No visual change is intended — the converged values were already approved on the device, so the
resulting alphas should reproduce them.

## Contract-change gate

**Contract change.** 13 tokens disappear from a table the whole frontend imports, and a new helper
enters its public surface. Describe the mechanic, the level names and the full migration mapping in
text, get approval, then edit code.

## How it actually landed

The mechanic is `alpha(token, level)` in `shared/theme/alpha.ts`, and the levels are **plain
numbers at the call site** — not the named scale this task proposed. The user rejected naming them:
a level called `border` is a second word for an alpha, and the indirection buys nothing when the
number is already right there in the component that owns the decision.

Two things came out stronger than planned. Tokens are written `rgb(r, g, b)` and typed `RgbColor`,
so **a token carrying an alpha is a compile error** rather than a convention. And the scrims did not
need deciding separately: `surface.dim` is one colour, and 0.5 vs 0.72 is the level, which is
exactly what treating opacity as an axis means.

The levels were then consolidated 23 → 12, folding the pairs no eye separates (0.75 → 0.72,
0.55/0.6 → 0.5 for scrims, 0.72 → 0.8 for secondary labels, 0.35 → 0.4 for placeholders).

## Blocked on

~~README open question 1~~ — answered by the shape above: there is no named scale to size, and the
scrims share `surface.dim` with the level applied per call site.

## Files to create

- `frontend/src/shared/theme/opacity.ts` (the scale + the mechanic) + tests beside it.

## Files to modify

- `frontend/src/shared/theme/tokens.ts` — the 13 tokens removed.
- `frontend/src/shared/theme/tokens.rules.md` — a rule per opacity level, same standard as Task 001.
- Every call site of a `whiteNN` or `overlay*` token.

## Acceptance criteria

- No token in the table encodes an alpha in its name or its value where a level would do.
- Every opacity level has a documented role in `tokens.rules.md`.
- The rendered colours match the pre-task converged values (no unintended visual change).
- The mechanic works for **any** token, not just the ones that used to be `whiteNN` — proven by a
  test applying a level to an unrelated token.
- `tsc --noEmit`, ESLint and Jest pass; JS coverage floor bumped if coverage rose.

## Project-pattern checklist

- The helper lives in `shared/theme/` and is exported from its `index.ts`; no screen defines its own.
- A method with an argument takes one named object, never positional arguments (CLAUDE.md).
- Tests sit beside the file.
