# Task 003 — Typography module: size tokens, weight, and the font-family token

## Why here

Two reasons, and the second is the binding one.

**It is the same movement as Task 002** — another axis of the design system getting its values
centralized. Size disperses exactly the way colour did before centralization, so it gets the same
treatment.

**It must exist before Task 006 (`ThemeProvider`).** Typography is *not* part of the theme object —
Decision 4e makes the theme colour-only and puts type in its own module. But Task 006 is what
rewrites the 44 `*.styles.ts` files and fixes the consumption pattern for the whole app: palette
through `useTheme()`, type tokens by direct import. Those files should be rewritten **once**,
against every axis, not once per axis.

## The finding this task starts from

**Font sizes — 13 distinct values across 144 uses:**

| fontSize | uses |
|---|---|
| 13 | 45 |
| 14 | 21 |
| 12 | 21 |
| 11 | 21 |
| 16 | 10 |
| 15 | 10 |
| 17 | 5 |
| 20 | 3 |
| 10 | 3 |
| 9 | 2 |
| 30 | 1 |
| 22 | 1 |
| 18 | 1 |

This is the same shape the colours had before commit `639d808`: 13/14/12/11 account for **108 of
the 144 uses**, while 30, 22 and 18 appear **once each**. The type scale almost certainly has
**~5-6 real steps, not 13** — the rest is drift, exactly as the 48 colour values were.

**Weights — 4 values:** `'600'` (51 uses), `'700'` (17), `'500'` (3), `'400'` (2).

**Font family — three findings that change the shape of this task:**

1. `fontFamily` appears **nowhere** in `frontend/src` — zero occurrences. The whole app renders in
   the system font.
2. **No font is bundled**: neither `android/app/src/main/assets/fonts/` nor `frontend/assets/fonts/`
   exists.
3. Therefore changing the font family is **not** migrating existing values the way colour was — it
   is **introducing a capability the app does not have**: bundling font files, registering them on
   Android (`react-native.config.js` / assets), dealing with which weights a given family actually
   ships (a custom family may not have all four weights in use), and the risk that a custom family
   lacks glyphs for every language the app supports (this app is i18n'd, pt-BR plus others).

   This is precisely why the user drew the line where he did (README Decision 4b): **the slot is
   built, no font is bundled.** The costs above are therefore out of this plan's scope — they are
   listed here so it is clear what was avoided, not as work to do.

**Kotlin — the rail already exists.** The SDU already carries `fontSizeSp`
(`android/features/.../reader/ui/SduNode.kt:52` and `:103`, plus
`android/app/.../ReaderPageListViewManager.kt:111`). Font size already travels RN → Kotlin the same
way colour will.

## What to do

### 1. The size scale — named by role, expressed as a multiplier

Define named steps — `body`, `caption`, `title`, … — and map all 13 current values onto them.
Same argument as Task 002's opacity levels: a step called `body` survives someone changing 13 to 14;
a step called `size13` does not, and turns the next adjustment into a rename across 144 call sites.

**Each step is a ratio, not a pixel count** (README Decision 4c): `body` = 1× the base, `caption`
≈ 0.85×, and so on, `rem`-style. The rendered value is `base × multiplier`, resolved at runtime,
with the base derived from the device's text-size setting. So the mapping work is the same as it
would have been, but its output is expressed **as a ratio against the base**, not as a number.

The one-use outliers (30, 22, 18) are where to look first: each is either a real step that only one
screen needed yet, or drift that belongs on an existing step. Decide per value, do not blanket-merge.

Then migrate the call sites.

### 1b. The base, and the double-scaling trap

The base comes from the system font scale (`PixelRatio.getFontScale()`), which is what makes the
whole hierarchy grow proportionally when the user enlarges text in the device settings.

**The trap, and it is the classic one for this approach:** React Native's `<Text>` already applies
the system scale by itself — `allowFontScaling` defaults to `true`. Multiplying by
`getFontScale()` *and* leaving `allowFontScaling` on scales the text **twice**, which looks fine at
1.0 and grotesque at 1.3. Decide which single layer applies the scale, and verify it on a device
with the system text size actually turned up — not at the default, where the bug is invisible.

Also state **how the app reacts when the user changes that setting while the app is installed**:
does RN recompute on return to foreground, or does it take a restart? Whichever it is, it is a
documented behaviour, not an accident.

### 2. Weight — part of the step, or its own axis?

Two coherent answers, and this task picks one with reasoning:

- each named step **carries its own weight** (a `title` is always 600), or
- weight is a **separate axis**, composed at the call site.

Note the parallel the user already drew for opacity: opacity became a separate axis *because the
level depends on the context/component, not on the colour*. Weight may well have the same nature —
the same size at 400 and at 700 is a real and commonly-used distinction. Check the four weights
against the sizes they co-occur with before deciding.

### 3. Font family — a token in this module, not a slot on the theme

**Already decided by the user** (README Decision 4b), so there is no choice to present here:

> "Acho que vale trabalhar com tokens de tamanho, e deixar preparado pra troca de fonte, mas não
> iremos introduzir nenhuma nova fonte."

Concretely, and note that **Decision 4e moved where this lives**: the family is a token of *this
module*, not a field on the theme object.

- `typography.ts` **has a family token**, whose value is the **system font**.
- The mechanic works **end to end**: the value reaches the style layer, and changing that single
  value would genuinely repaint the app. Prove it with a test — the socket has to be real, not a
  field nobody reads.
- **No font file is bundled and no registration config is added.** Out of scope: assets,
  `react-native.config.js`, per-weight fallback for a family missing one of the four weights, and
  glyph-coverage checks across languages. Those costs are paid by whoever later wants an actual
  font.

The point of the slot is that adding a real font later is "bundle the file, register it, change one
value in one module" — never a rework of the mechanic.

### 4. Typography is a sibling module, not part of the theme

Per Decision 4e: `typography.ts` sits beside `colors`, is **constant**, and does **not** change when
the user switches theme. Screens import it directly; only the palette comes through `useTheme()`.

One thing to respect while building it: the user deliberately left open (README open question 6)
whether typography later becomes a theme of its own. **Do not close that door** — nothing here
should hardcode the assumption that the palette is the only thing that can ever vary at runtime.
Equally, **do not build that generalization now**: this module is a constant today.

### 5. `fontSizeSp` and the second double-scaling risk — Kotlin

The SDU already carries `fontSizeSp` (`SduNode.kt:52`/`:103`,
`ReaderPageListViewManager.kt:111`). **`sp` on Android is by definition a unit that already respects
the system font scale.** So a value that RN computed by multiplying by `getFontScale()`, sent over
as `sp`, gets scaled **a second time by Compose**.

This is a concrete visual bug, not a footnote. Resolve it explicitly, one of two ways:

- RN sends the **already-resolved** value and it travels in **`dp`**, so Compose does not scale it
  again; or
- RN sends the **base** value in `sp` and lets Android's own `sp` handling apply the scale.

Pick one, write down why, and **verify on a device with the system text size raised** — comparing a
reader chrome label against an RN label at the same step, which should end up the same size. At the
default scale of 1.0 both options look identical and prove nothing.

## Contract-change gate

**Contract change** — this module is imported by every style file, and it makes rendered size a
**runtime-derived** value rather than a constant. It may also change the reader's `fontSizeSp`
prop/SDU contract (step 5). Per CLAUDE.md, describe the scale, the weight decision, the module's
public shape and the chosen `sp`/`dp` resolution in text, get approval, then edit code.

## Blocked on

- **README open question 5** — whether the **reader** follows the system font scale like the rest of
  the app or is pinned. It is entangled with the `fontSizeSp` decision in step 5, so answer both
  together.

Two things are **not** open: the family (Decision 4b — prepare the slot, bundle nothing) and whether
sizes respect the system scale in general (Decision 4c — they do, as multipliers).

## Coordination with Task 008

Task 008 makes `ReaderPageList` take its **colours** from RN via props/SDU — the same prop/SDU path
`fontSizeSp` travels. **If both tasks touch that shape, do it once**: agree the combined shape when
Task 008's contract is described, rather than changing the same contract in two consecutive tasks.

## Files to create

- `frontend/src/shared/theme/typography.ts` (the scale + weights + family) + tests beside it.

## Files to modify

- `frontend/src/shared/theme/tokens.rules.md` — an application rule per type step, to the same
  standard Task 001 set for colour ("`caption` = list-row secondary line, timestamps").
- `frontend/src/shared/theme/index.ts`.
- Every `*.styles.ts` carrying a `fontSize` / `fontWeight`.

**Not modified, by decision:** `react-native.config.js`, the assets path, and anything else font
bundling would require (Decision 4b).

## Acceptance criteria

- No `fontSize` or `fontWeight` numeric literal remains in a screen style file.
- Every type step has a documented role in `tokens.rules.md`; none is named after its number.
- Each step is a multiplier; no step is stored as an absolute pixel value.
- Each of the 13 original values has a recorded destination — merged onto a step, or kept as its own
  step with a reason, expressed as a ratio to the base. No value silently disappears.
- **Verified on a device with the system text size raised** (not only at 1.0): text grows
  proportionally, and nothing is scaled twice — neither via `allowFontScaling` in RN nor via `sp` in
  the reader's Compose UI.
- Reader chrome and an RN label at the same step render at the same size under a raised system
  scale.
- The app's reaction to changing the system text size while installed is documented and matches what
  it actually does.
- The rendered result is reviewed on the real device; any intentional size change (a one-use outlier
  merged onto a step) is listed for the user rather than slipped in.
- The family token resolves to the system font.
- A test proves the socket is real: changing the family token reaches the style layer and changes
  what is rendered.
- Switching theme changes no type step, no weight and no family — verified by a test.
- No font file was added to the repo and no font-registration config was introduced — verified by
  inspecting the final diff.
- `tsc --noEmit`, ESLint and Jest pass; JS coverage floor bumped if coverage rose.

## Project-pattern checklist

- Everything lives under `shared/theme/`; no screen defines a type step.
- A method with an argument takes one named object, never positional arguments (CLAUDE.md).
- All UI text stays translatable — keeping the system font is what guarantees glyph coverage for
  every language while no font is bundled.
- Tests sit beside the file; naming follows `name.type.ext`.
