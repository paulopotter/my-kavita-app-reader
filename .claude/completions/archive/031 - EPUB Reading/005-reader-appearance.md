# Task 005 — Reader appearance

**Status:** done

## Why

After testing the book reader (rc9) on the device, the user wants to control how the text looks.
Today the reader only has text size steps (A↓ A↑) and always uses the app theme's colours. Long
reading sessions need their own palettes, fonts, spacing and margins, independent of the app theme.

## What to do

- **"Aa" button in the footer** of the book reader opens a sheet. A↓ and A↑ stay in the footer.
  The sheet has, in this order:
  - theme (reader theme preset);
  - font family;
  - text size (the existing steps);
  - line height;
  - margins;
  - justification;
  - reading mode (`infinite` | `paged`, behaviour defined in Task 006; the control lives here).
- **Persist everything in `BookPrefs`** (`:preferences`, key `bookReader`, domain
  `bookReaderPrefs`). Prefix keys by domain (see the PreferencesManager note: identity is only
  the key).
- **Reader themes are their OWN fixed palette**, independent of the app's 12 identities (like
  `colors.surface.reading`). New token file `shared/theme/reading-themes.ts`. A Jest test beside
  it enforces the project's legibility bar: body text >= 7:1 (WCAG AAA) and links >= 7:1 against
  the theme's background.
- **Presets:**

  | Preset | Background | Text | Notes |
  |--------|------------|------|-------|
  | `app` | app theme's own colours | app theme's own colours | today's behaviour |
  | Paper | `#FAF8F2` | `#1C1C1C` | |
  | Sepia | `#F3EAD3` | `#2E2417` | |
  | Gray | `#E4E4E4` | `#161616` | link darkened to reach 7:1 |
  | Green | `#D5E8D4` | `#14261A` | link darkened to reach 7:1 |
  | Dark | `#1A1A1A` | `#E6E6E6` | |
  | Night | `#14171C` | `#DADFE6` | |
  | Black / OLED | `#000000` | `#D6D6D6` | |
  | High contrast | `#000000` | `#FFFFFF` | links `#FFE600` |

- **Fonts:** system serif, sans-serif, monospace. Bundled fonts (e.g. Literata) are deferred.
- **Line height steps:** 1.4 / 1.6 / 1.8 / 2.0 (default 1.6).
- **Margins:** narrow / medium / wide.
- **Justification:** off by default (justified text makes uneven word gaps).
- `BookDocumentTool` receives the new inputs (theme colours, font family, line height, margins,
  justification) and keeps the same CSP/nonce lockdown.
- New strings in pt-BR and en. Every design value comes from a token; the sheet itself uses the
  app theme, only the reading document uses the reader theme.

## Research basis

Blogs and app documentation, not primary research: reader apps ship Light / Sepia / Green / Dark /
Black / high-contrast presets separate from the app theme; avoid pure white on pure black
(halation) — hence the off-white text on Dark/Night/OLED, with High contrast as the explicit
exception; ~1.6 line height is the usual default.

## Contract-change gate

Approved by the user on 2026-10-18: the `BookPrefs` fields, the new `reading-themes.ts` tokens and
the `BookDocumentTool` inputs. Any other contract change (hook signature, event shape, digest)
needs a new approval in text before any code.

## Tests (beside the code)

- `reading-themes.test.ts`: every preset has body text >= 7:1 and links >= 7:1 against its
  background.
- `BookPrefs`: defaults and persistence of each new field.
- `BookDocumentTool`: each input reaches the generated CSS; CSP/nonce unchanged.
- Hook/sheet: changing a setting updates the document and persists; `app` preset follows the app
  theme.
- `make coverage` must pass; bump the floor if it rose.

## Done when

- The user changes theme, font, size, line height, margins and justification on the device and the
  choice survives reopening the reader.
- Every preset passes the legibility test.
- Coverage passes.

## Implemented (awaiting the device check)

Commits `156b5e7` (selection bar label colour), `c7fe857` (data: `reading-themes.ts`, `BookPrefs.appearance`
and `.mode`, `BookThemeTool`, the document's new inputs, strings) and `d0e46e3` (the sheet, the footer
button, the hook and screen wiring).

- Reading palettes are a fixed token file independent of the 12 app identities; a jest test holds text
  and links at 7:1 (links of Gray, Green and Sepia were darkened to get there).
- The Kavita fragment ships its own CSS (font, justified text, margins, colours); the document forces
  the reader's choices over it with `!important` and drops the book's own `.book-content` margin.
- The property is `lineSpacing`, not `lineHeight`: the project's lint rule bans `lineHeight` literals
  and this is a CSS multiplier inside an HTML string, not a design token.
- The reading-mode control is NOT in the sheet yet: it arrives with Task 006, when the mode exists.
- Found on the way: `text.button.primary` over `colors.button.secondary` (the image reader's error
  retry button) is 1.1-1.5:1 in six identities; not touched here.

## Result

Done, 2026-10-18. On the device the first text colour was unreadable; the palettes were reworked and the 7:1
jest test now guards them. The same choices (reading mode, theme, text size, font, line spacing, margins,
justified text) are also offered in Settings > Reading preferences ("Leitura de novel" block) through the shared
`BookAppearanceFields`, so the sheet and Settings can never disagree. The `text.button.primary` over
`colors.button.secondary` finding (the image reader's retry button) is still open.
