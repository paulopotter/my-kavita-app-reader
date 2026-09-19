# Theme

Every colour the app paints comes from the active theme. A screen never writes a colour literal.

## Layout

```
frontend/src/shared/theme/
  colors.types.ts          the contract: what every colour MEANS
  alpha.ts                 applies an opacity level to a token
  typography.ts            the type scale, weights and family
  sizes.ts                 spacing, the screen gutter, radius, border width, icon size
  themes/
    index.ts               the registry of identities
    default/
      colors.tokens.ts     the values for the "default" identity
      index.ts
  index.ts

frontend/src/shared/context/theme/
  theme.context.tsx        ThemeProvider + useTheme — which identity is active
```

Tokens and rules live in `shared/theme/`; *which identity is active* is state, so it sits with the
app's other contexts in `shared/context/`.

Two files, two jobs: `colors.types.ts` says what a token means and where it may be used;
`themes/<name>/colors.tokens.ts` says what colour that means in one identity. A meaning is
written once, on the contract — never repeated in a theme, so the two cannot drift apart.

## Using a colour

```ts
import { colors } from '../../shared/theme';

export const styles = StyleSheet.create({
  heading: { color: colors.text.title.primary },
  body:    { color: colors.text.primary },
});
```

Hover a token in your editor to read its rule — that is what `colors.types.ts` is for.

## Type

Sizes and weights come from `text`, a **constant** — switching identity changes no size, no weight
and no family.

```ts
import { text } from '../../shared/theme';

title: { fontSize: text.size.title['xx-large'], fontWeight: text.weight.bold },
body:  { fontSize: text.size[3] },
```

Each step is a ratio against a base of 16, resolved to whole pixels, so moving the base rescales
the hierarchy at once. Step 3 lands on 14 — Android's own default text size.

The general steps are **numbered, not named**: the same step serves a metadata line on one screen
and body copy on another, so a role in the name would be a lie. Headings are the exception —
they have a real hierarchy, so `size.title` runs `large` → `xxx-large`, mapped to h4…h1. Text that
merely looks big is not a title and belongs on a high general step.

There are **two weights**, `regular` and `bold`, because the app only ever meant two things. The
system font ships no semibold anyway — a 600 resolves to bold on Android.

The device's font-size setting is applied by React Native itself; nothing here multiplies by it
again. `MAX_FONT_SCALE` caps how far it may go.

### Line height

```ts
name: { fontSize: text.size[3], lineHeight: line.height[4] },
```

`line.height` is its **own** numbered scale, not a ratio applied to a size: the same size wants a
tighter line in a packed bar than it does in a paragraph, so which height goes with which size is a
call-site decision, and the two indexes need not match.

RN's `lineHeight` is absolute — a number there is dp, never a multiplier as in CSS — so the scale
holds resolved values rather than the ratios they came from.

## Spacing, radius and border

```ts
export const cardStyles = createStyles(({ spacing, radius, border }) => ({
  card: { padding: spacing[5], borderRadius: radius.large, borderWidth: border.small },
  avatar: { borderRadius: radius.full },
}));
```

Ratios against a base of 8. Spacing is **numbered** — the same step serves a padding here and a gap
there — while radius and border are **named**, because a corner and a line have a small vocabulary
that already reads well. `radius.full` is not a step but an instruction: round it away entirely.

`border.small` is `StyleSheet.hairlineWidth`, the thinnest line the screen can draw — a literal 0.5
misses that on some densities.

Unlike type, none of this answers to the device's font scale: doubling every padding would push
content off the screen, which is why Android keeps `sp` for text and `dp` for layout.

A **fixed width or height is not a token**. Those are a component's own measurement, not a step on
a scale, so they stay literal and the lint rule leaves them alone.

But a measurement is **even**, and it is the **sum of what it holds** — not a box the content is
squeezed into. When the children add up to 77, the box becomes 78; it does not become 74 with the
padding shaved to fit. `CardList`'s row is the worked example: 16 padding + 40 title + 6 progress
bar + 16 meta = 78, and the cover is sized to the row rather than the row to the cover.

## Icon size

```ts
<Search size={icon.size[4]} color={colors.icon.secondary} />
```

Numbered like spacing, 12 to 28 in steps of two. Unused rungs are kept on purpose: a size added
later lands on a step that already exists instead of being wedged between two of them.

`icon.size.dot` is the one named entry, and the exception that proves the rule — it is never a
glyph, it is a filled circle standing in for a status light, so it does not belong on a scale of
drawings.

### Why an icon needs a component to line up

A Lucide glyph is drawn inside a 24-unit box and **none of them fill it**. Measured from the paths
Lucide ships:

| glyph | stroke spans | empty each side |
|---|---|---|
| `ChevronLeft` | 9..15 | 9 |
| `X` | 6..18 | 6 |
| `ArrowLeft` | 5..19 | 5 |
| `Check`, `CornerDownRight` | 4..20 | 4 |
| `Circle` | 2..22 | 2 |

So putting the **box** on the gutter leaves the visible **stroke** short of it — by 11px for a
chevron drawn at 28. That is what made the three back arrows look pushed in, each patched a
different way before this was understood.

`IconButton` owns the correction, so no call site does the arithmetic:

```tsx
<IconButton icon={ChevronLeft} glyph="chevron" size={icon.size[9]} color={…} alignStroke />
```

With `alignStroke` it pulls itself out by its own glyph's empty margin. Use it for an icon in a
corner with content below it; leave it off anywhere the icon is not meant to line up with
something. The amount is **per glyph**, measured in `icon-button.glyphs.ts` — a new glyph used
with `alignStroke` needs its own entry, measured rather than guessed.

## The screen gutter

Every screen opens with the same inset, so nothing is ever drawn flush against the edge:

```ts
export const screenStyles = createStyles(({ gutter }) => ({
  root: { paddingHorizontal: gutter },
}));
```

`gutter` is one chosen spacing step (`spacing[6]`), not a scale of its own — it is a single value
because the whole point is that every screen starts at the same place. Once a container carries it,
nothing inside repeats it: a child that needs more space adds a spacing step **on top**, and one
that needs none inherits it.

Vertically it applies the same way, and lands correctly on its own — the app's root View already
pads by the status-bar inset (`App.tsx`), so a screen's gutter starts below the notification bar
rather than under it.

Three cases opt out, each deliberately:

- **The Reader** draws edge to edge, so it takes no gutter at all — the same exception it already
  makes for the status-bar inset.
- **A full-bleed row** (a list item with a selection background or a bottom border) keeps its own
  `paddingHorizontal: gutter` instead, so the background reaches the edge while the text still
  lines up with every other screen.
- **A list of cards that carry their own margin** pads by the remainder (`gutter - spacing[3]`), so
  the outer edge still lands on the gutter and the gap between two cards stays one step.

## Opacity

A token is always an opaque `rgb(r, g, b)`. **Opacity is a separate axis**: how transparent
something should be depends on what is being drawn — a secondary button's outline, a scrim over a
modal — not on which colour it happens to be. So the call site applies it:

```ts
scrim:  { backgroundColor: alpha(colors.surface.dim, 0.5) },
outline:{ borderColor: alpha(colors.border.secondary, 0.2) },
```

This is enforced, not merely agreed: the `RgbColor` type rejects `rgba(...)` and hex alike, so a
token carrying an alpha is a compile error. Levels are plain numbers — a named scale would just be
a second word for the same thing — but they are shared: before inventing one, look at what the app
already uses (0.5 and 0.72 for scrims, 0.2 for a secondary outline, 0.4 for a placeholder).

An ESLint rule (`no-restricted-syntax` in `frontend/.eslintrc.js`) fails the build on any colour
literal outside `shared/theme/`. Test files are exempt: a colour in a test is an assertion value,
not a UI colour.

## How a token is named

```
<what it is>.<type of content>.<variation>
```

- **First level** — what is being painted: `text` (and, as later slices land, icons and surfaces).
- **Second level** — the kind of content or the component: `title`, `button`, `input`, `link`.
- **Third level** — the variation, and only when more than one exists. A type with a single
  variation stays flat: `text.label`, not `text.label.primary`.

Two rules that decide most questions:

**`primary` is the canonical case of its parent, not the strongest one.** `title.primary` is the
screen's main heading; `text.primary` is ordinary body copy; `button.primary` is the label on the
theme-coloured button. Reach for `emphasis` or `bold` when you mean "louder".

**A name never mentions brightness.** `textOnDark`, `white80` and similar are disqualified: under a
future identity they would describe something that is no longer true. Names describe role, never
lightness and never a position on a scale.

One consequence worth knowing: `text.button.*` is named after **the background the text sits on**,
not after what the button does. `text.button.destructive` is the light text that goes *on top of* a
red button. Red text with no fill behind it is `text.link.destructive`.

## Adding a theme

1. `mkdir frontend/src/shared/theme/themes/<name>/`
2. Write `colors.tokens.ts`, typed `ThemeColors`. TypeScript rejects a missing or extra field, so
   the compiler tells you when a token is unfilled — you cannot ship a half-filled identity.
3. Add `index.ts` with `export * from './colors.tokens';`
4. Register it in `themes/index.ts`: import it, add it to `themes`, and point `activeTheme` at it
   to try it out.

Nothing else changes. Screens read `colors`, never a theme by name.

## Adding a token

Prefer an existing token. A new one means a role the app genuinely did not have before — if two
plausible tokens fit your case, the answer is usually that one of them is right, not that a third
is missing.

When it is genuinely new: add the field to `colors.types.ts` with its rule as a doc comment, then
fill it in **every** theme. The compiler enforces the second half.

## One notation

Tokens are written `rgb(r, g, b)` and nothing else — not hex, not `hsl()`, not named colours. One
shape means `alpha()` has one thing to parse and a theme cannot drift into a second style. The
`RgbColor` type enforces it.
