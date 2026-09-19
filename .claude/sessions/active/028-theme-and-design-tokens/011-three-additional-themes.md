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
