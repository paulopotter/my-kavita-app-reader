# Task 011 — Three additional themes (last)

## Why last

Fixed by README Decision 5. It is also the only task that proves the other eight worked: three real
identities filling the same table is the test that the taxonomy has no luminosity baked into it, that
opacity really is a separate axis, that the provider repaints everything, and that the Kotlin reader
placeholders follow along.

## Colour only — by definition

Per README Decision 4e, **a theme is colour and only colour**. Typography, spacing and radius live in
their own modules outside the theme object and are constants, so these three identities **cannot**
and **must not** touch them.

Concretely: **do not propose fonts, type scales, spacing or radii.** A palette proposal that includes
a typeface or a density is proposing something the theme object has no room for.

## The palettes are decided *during* this task, not now

README Decision 6, and it is the defining rule of this task: **this task does not arrive with
palettes already written.** It **proposes three colour identities to the user and implements only
after approval.**

Choosing three palettes in a planning document — months before anyone sees them on a screen, and
before Tasks 001-008 have taught anything about how the tokens actually behave — would be settling
the most subjective decision in the plan at the moment of least information. So the proposal step is
part of the work, not a formality preceding it.

## What to do

### 1. Propose

Present three named colour identities to the user — name plus the full token table each one fills,
rendered as something visual enough to judge, not a list of hex codes. Include how each one handles
the tokens that are hardest to restate in a new identity:

- the accent, and what "on accent" becomes;
- the surface ladder (`surface` / raised / inset), which has to stay distinguishable in every
  identity, not just the current one;
- the status colours, including the `positive`/`msgOk` pair that appears **side by side in the same
  component** (README context) — if an identity collapses them, it loses a hierarchy that is in use;
- the reader page background is **not** one of them: Decision 7 fixes it as always black, so no
  identity defines it.

### 2. Get approval, then implement

One file per identity under `frontend/src/shared/theme/themes/`, filling the same table, registered
in `themes/index.ts`. No new token is introduced for one theme's benefit — if an identity needs a
role the table does not have, that role was missing from the taxonomy and gets added for **all**
themes, with its rule written into `tokens.rules.md` like any other.

### 3. Verify on the device

Every theme, every screen, including the reader (Task 008's native placeholders), modals, the tab
bar and the splash handoff (Task 010's answer).

## Blocked on

- **User approval of the three palettes** — a hard gate, per Decision 6.
- **README open question 3**, inherited from Task 010 — whether the identity colour is inside the
  themes, which determines whether these three touch it.

## Files to create

- `frontend/src/shared/theme/themes/<three>.theme.ts` (+ tests beside each).

## Files to modify

- `frontend/src/shared/theme/themes/index.ts` — registry entries.
- `frontend/src/shared/i18n/strings.ts` — display names, if Task 009 decided they are translated.

## Acceptance criteria

- The user approved the three palettes **before** they were implemented.
- Each theme fills the token table completely — no theme falls back to another theme's value for a
  missing token, verified by a test that asserts identical key sets across all registered themes.
- All three are palettes only — none declares typography, spacing or radius, verified by the
  identical-key-set test.
- No token was added for a single theme's benefit; anything added exists for all and is documented.
- Task 009's picker lists all four with no code change to the screen (the registry-derived list).
- On the real device, every theme was checked across every screen, including the reader's native
  loading/error UI and the splash handoff, with no unthemed patch.
- `positive` and `msgOk` (or their taxonomy successors) remain distinguishable side by side in every
  theme.
- `make coverage` passes; floors bumped if coverage rose.

## Project-pattern checklist

- Themes live only in `shared/theme/themes/`; no screen defines one.
- Theme display names are UI text and follow the translation decision made in Task 009.
- Before asking the user to test on the device, bump `-rcN` on both the APK and the bundle, per the
  project's build convention.

---

## Result — done

The task asked for three additional themes. It shipped **six identities and four OLED variants**,
because the scope grew with each decision the user made while looking at them.

### How they were chosen

Palettes were proposed as a page the user could look at — the app's own library row painted in
each candidate, with the measured contrast under it — rather than as hex in a message. That is
what made the choice possible: the user picked **Ônix** (OLED) and **Âmbar** first, then asked for
four more candidates and kept **Sépia**, **Aço**, **Vinho** and **Floresta**.

Contrast was measured in code at every step, never judged by eye. Two rounds of tuning came out of
it: every secondary text in the first proposal read 5.7–6.4 and had to be lightened to clear 7:1,
and amethyst's accent (which was dropped) read 5.7 as text.

### OLED as a variant, not a theme

The user's idea, and better than the separate themes originally proposed: a variant lives **in its
parent's file** as a spread overriding the three surfaces.

It turned out to change 3 of 64 fields — so a separate file would have been 61 fields of
duplication, each one a chance to drift. Repainting an identity now repaints both.

The one thing that needed care is that the **whole surface ladder drops together**. Blackening
only the background widens the screen-to-card gap (1.16 → 1.39 on teal), which reads as the card
floating rather than sitting on the screen.

### The tooling, rewritten twice on the user's feedback

`scripts/generate-theme.js` began with the palettes hardcoded inside it — a record of what had
been generated, not a generator. The user said so, and it became a CLI: two colours are enough,
everything else is derived, any derivation overridable by flag.

Verified by regenerating `forest` from its own colours: **the 64 tokens came out identical** to
what was committed. That check also caught the OLED derivation being too wide (1.227 vs the
parent's 1.165) and it was tuned to 1.116.

The user then asked why the script could not register the theme itself. It can, once the ordering
rule is mechanical: **alphabetical by key, each variant pinned under its parent**. By key and not
by label, because the label is a translation and sorting on it would reshuffle the list per
language. `themes.tests.ts` holds the rule, so the script and the registry cannot disagree.

`scripts/build-theme-cards.py` draws one card per identity, parsing the colours out of the token
files so the images cannot drift from the app. `generate-theme.js` runs it on finishing.

### A false claim found and corrected

`teal/colors.tokens.ts` stated "every foreground clears 7:1". It does not: secondary text reads
6.30 against the card and the cyan link 6.69. That comment was written when the theme was created
to prove runtime switching, without measuring. The user chose to keep the colours (they had been
approved on the device) and both teal and crimson are now recorded in the test as inherited
exceptions — named, with their numbers, rather than quietly excused.

The legibility test itself was also written wrong on the first attempt: it demanded AAA against
`surface.tertiary`, the chip and switch-track surface that carries a label at most. That failed
all twelve identities, including the two already shipped. It now asks AAA on the screen and the
card, AA on the raised surface.

### Verification

`tsc --noEmit` clean, ESLint 0 errors, 100 suites / 1370 JS tests — 85 of them on themes alone.
Verified on the real device across rc30 and rc31.

Versions: `1.3.0-rc29` → `1.3.0-rc31` (APK), `1.2.0-rc29` → `1.2.0-rc31` (bundle).

### Worth knowing

The picker's order changed from curated to alphabetical, so **teal is no longer first despite
being the default**. That is the price of an order a script can maintain; putting the default back
on top would mean sorting at display time and giving that up.
