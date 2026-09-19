# Task 004 — Spacing & radius tokens

## Why here, and why it is its own task

Same movement as colour and typography: a family of numbers that repeats in a scale, currently
written out literally at every call site. It sits with the other foundation tasks and **before Task
006 (`ThemeProvider`)** for the same reason Task 003 does — not because it goes *into* the theme
object (Decision 4e keeps it out), but because Task 006 rewrites the 44 `*.styles.ts` files, and
those files should be rewritten **once**, against every axis, rather than once per axis.

It is **separate from Task 003** deliberately. Typography already carries two hard problems of its
own — a relative scale and the double-scaling risk across RN and `sp` — and spacing has a completely
different failure mode (a near-complete scale punctured by odd values). Merging them would produce
one task whose review mixes two unrelated risks, and whose device check could not attribute a
regression to either.

## The finding this task starts from

**Spacing (`padding` / `margin` / `gap`), by frequency:**

8 (49×), 12 (49×), 16 (43×), 4 (41×), 10 (35×), 6 (29×), 24 (20×), 14 (14×), 20 (10×), 2 (10×),
18 (9×), 9 (8×), 11 (6×), 28 (4×), 3 (3×).

The finding that matters: **a step-of-4 scale is already almost there.** 4/8/12/16/24 alone account
for **~202 uses** — and it is punctured by about ten odd values (9, 11, 3, 14, 18, 10, 6, 2).

**Radius (`borderRadius`):** 8 (34×), 4 (11×), 12 (8×), 10 (7×), 2 (6×), 16 (5×), 6 (2×), 14 (2×),
22 (1×), 20 (1×), 11 (1×), 1 (1×). Twelve values for 79 uses — more dispersed than spacing.
Probably **3-4 real steps** (small / medium / large / pill) plus the `999`-or-half-the-height case
for circular elements, if any exist.

**`borderWidth`:** 1 (18×), 0.5 (6×), 2 (2×). Only three values — small enough that it becomes 2-3
tokens or stays out entirely. This task decides which, with reasoning.

**Icon sizes (`size=` in `.tsx`):** 20 (14×), 18 (14×), 12 (4×), 22 (3×), 14 (3×), 28 (2×), 16 (2×),
30 (1×). Worth deciding whether icon size is its own small scale or **follows the type scale** —
an icon usually aligns to the line height of the text beside it, which would tie it to Task 003's
steps rather than to this task's.

## What to do

### 1. Propose the scale, then have it confirmed on the device

Use the method the user has already approved once. The colour convergence (48 → 38 values) was
proposed, tested on the real device, and only then made final — his verdict was *"a princípio tudo
ok, não senti diferença."* Do the same here: **propose the reduction, he tests it on the device,
and only then is it definitive.** Do not land a silent re-spacing of the whole app.

### 2. Handle the punctures explicitly

Each odd value (9, 11, 3, 14, 18, 10, 6, 2) is one of two things, and it gets classified one by one:

- **drift** → snaps to the neighbouring step, or
- **a real exception** → justified in writing and kept.

No blanket rounding. The list of every value that visibly moves goes to the user with the proposal,
because "I didn't notice a difference" is only meaningful if he knew what to look for.

### 3. Name the steps by role or by position — decide, and be consistent

Spacing is unlike colour here: a spacing step genuinely is a position in a scale, so a positional
name may be more honest than a semantic one. Pick one convention, apply it to both spacing and
radius, and write the rule into `tokens.rules.md` to the same standard Task 001 set — each step with
a documented "used for".

### 4. Where these live — already decided

**Decision 4e settles it**: `spacing.ts` is a **sibling module** under `shared/theme/`, beside
`colors`, **outside the theme object**. It is a global constant — the scale does **not** change when
the user switches theme, because a theme is colour and only colour. Screens import it directly; only
the palette comes through `useTheme()`.

One thing to respect while building it: README open question 6 leaves open whether density/spacing
later becomes a theme of its own. **Do not close that door**, and equally **do not build that
generalization now** — today this module is a constant.

### 5. Migrate the call sites

Across the `*.styles.ts` files, once the scale is approved.

## Non-goal — fixed dimensions do not become tokens

`width` / `height` numbers have a long tail of one-off values: 100 (series cover), 340 (modal
width), 800, 200, 80, 44, 40, 36, … These are **one component's own measurement**, not steps of a
repeated scale. Tokenizing them would mean inventing a name for a number used once, which makes the
code *less* readable, not more.

The criterion, stated so it can be applied later without re-litigating: **something becomes a token
when it repeats and forms a scale; it stays a literal when it is a specific component's own
measurement.**

Two defensible exceptions, which this task may adopt **only with a justification**: **touch targets**
(44/48 — these exist for accessibility reasons, not aesthetics) and **icon dimensions** (see the
type-scale question above).

## Relationship to Task 005 (the ESLint rule)

Task 005 bans colour literals. Whether it should also ban magic spacing/radius numbers is **its**
call, and this task hands it the input: unlike colours, legitimate numeric literals will still exist
after this task (every fixed dimension above), so a naive numeric rule would be noisy enough to get
disabled. Task 005 decides whether a narrowly-scoped version (only `padding`/`margin`/`gap`/
`borderRadius` properties) is worth it.

## Contract-change gate

**Contract change** — this module is imported by every style file. Describe the scale and the
puncture decisions in text, get approval, then edit code. (Where it lives is no longer part of the
discussion: Decision 4e fixed it outside the theme.)

## Blocked on

Nothing external. Decision 4e already fixed where the module lives, and the device confirmation of
the proposed scale gates only the final landing, not the work.

## Files to create

- `frontend/src/shared/theme/spacing.ts` (spacing + radius, and `borderWidth` if it is taken in)
  + tests beside it.

## Files to modify

- `frontend/src/shared/theme/tokens.rules.md` — a rule per step.
- `frontend/src/shared/theme/index.ts`.
- The `*.styles.ts` files carrying spacing/radius literals.

## Acceptance criteria

- Every spacing and radius value has a recorded destination — snapped to a step, or kept as a
  justified exception. Nothing is rounded silently.
- The list of values that visibly moved was shown to the user, and the result was confirmed on the
  real device before being made final.
- Every step has a documented "used for" in `tokens.rules.md`.
- The scale is identical under every theme — switching theme changes no spacing and no radius,
  verified by a test.
- No `width`/`height` one-off was converted into a token, per the non-goal — verified by inspecting
  the diff.
- `tsc --noEmit`, ESLint and Jest pass; JS coverage floor bumped if coverage rose.

## Project-pattern checklist

- Everything lives under `shared/theme/`; no screen defines a step.
- A method with an argument takes one named object, never positional arguments (CLAUDE.md).
- Tests sit beside the file; naming follows `name.type.ext`.

---

## Result — done

The task delivered its own scope and then grew well past it, because each slice verified on the
device exposed something the previous one had been hiding. That is recorded here as it happened,
not as if it had been planned.

### What the task set out to do

`sizes.ts` with three scales — `spacing` numbered (base 8, nine steps), `radius` and `border`
named, since a corner and a line have a vocabulary that already reads well. `radius.full` is an
instruction rather than a step; `border.small` is `StyleSheet.hairlineWidth`, which a literal 0.5
gets wrong on some densities. All three are injected by `createStyles`, so no style file imports
them. The ESLint `SIZE_LITERAL` rule was extended to cover them.

### What the user added during verification

- **`gutter`** (`spacing[6]` = 16) — every screen opens with the same inset and nothing inside
  repeats it. It landed correctly on the vertical without extra work: `App.tsx` already pads by the
  status-bar inset, so a screen's gutter starts below the notification bar. The Reader opts out by
  omission, the same exception it already made for that inset.
- **`line.height`** — its own numbered scale rather than a ratio applied to a size, because the
  same size wants a tighter line in a packed bar than in a paragraph. RN's `lineHeight` is absolute
  (a number is dp, never a multiplier as in CSS), so the scale holds resolved values.
- **A measurement is even, and it is the sum of what it holds** — not a box the content is squeezed
  into. `CardList`'s row is the worked example: it became 78, rather than 74 with the padding
  shaved to fit.
- **`icon.size`** — numbered 12..28 in steps of two, unused rungs kept so a size added later lands
  on a step that already exists. `dot` is the one named entry: a filled circle standing in for a
  status light is not a glyph.

### What verification found, that nobody had set out to fix

- **Settings had three insets living side by side** (20 in the menu, 16 in the sub-containers, 8 in
  the header), which is why a bordered card looked misaligned.
- **The search history never showed progress.** The catalogue was already loaded on that screen —
  the same call the Library makes — but the history rows were built only from what had been
  persisted. Fixed by crossing with the catalogue when it is there, keeping the fallback so a row
  still renders while it loads or fails.
- **Three back arrows were misaligned, each patched differently.** A Lucide glyph is drawn inside a
  24-unit box and none of them fill it (a chevron leaves 9 units each side, an arrow 5, a circle 2),
  so putting the *box* on the gutter leaves the *stroke* short of it. `IconButton` now owns that
  correction for all three, with the slack measured from each glyph's path.
- **Characters were doing an icon's job.** `✓`/`✗` lived inside the translated strings, so they
  could take no colour from the theme and every language carried the symbol again; `↳` was built by
  the caller in a template string. All three became real icons.

### Verification

`tsc --noEmit` clean, ESLint 0 errors (5 pre-existing warnings), 99 suites / 1281 tests passing.
Verified on the real device across rc15…rc25; the user approved the result.

Versions: `1.3.0-rc15` → `1.3.0-rc25` (APK), `1.2.0-rc15` → `1.2.0-rc25` (bundle).

### Left for later

- `Settings2` in the series top bar is labelled `glyph="arrow"` without that glyph having been
  measured. It carries no `alignStroke`, so nothing depends on it today, but the label is imprecise.
- `icon.slack.none` was written with no call site and removed; `GLYPH_INSET` in
  `icon-button.glyphs.ts` is the surviving home for per-glyph measurements.
