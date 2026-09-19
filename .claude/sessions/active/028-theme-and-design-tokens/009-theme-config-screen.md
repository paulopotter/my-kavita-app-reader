# Task 009 — `config/theme/` — the theme picker

## Why here

It is the first point at which the user can actually exercise any of this. It runs after persistence
(005) because it needs somewhere to write the choice, and before the last two tasks because the
three themes of Task 011 need a screen to be picked from — shipping them with no picker would make
them unreachable.

## What to do

A new config sub-screen at `frontend/src/screens/config/theme/`, built to the shape of
`config/notifications/`, which is the working reference for a config sub-screen in this codebase and
should not be diverged from without reason.

### Screen content

1. **One row per registered theme**, showing its display name and a **preview of its own palette** —
   a few swatches painted in that theme's tokens, not in the active one. Choosing a colour identity
   from a list of names alone is choosing blind.
2. **The current choice is visibly marked**, and selecting a row applies the theme **immediately**,
   with no restart. That is the whole point of a runtime theme; an "applies on next start" note here
   would mean Task 006 did not finish.
3. **Nothing else.** No custom-colour picker, no per-screen override — both are non-goals.

### Wiring

`config.screen.tsx` gains one menu row and one `case 'theme':` in its existing switch, the same
two-line pattern the `'notifications'` row already follows. No new route in `RootNavigator`; config
sub-screens are rendered by the config screen itself.

### Rules this screen is held to

- Every string goes through the existing i18n system in both `ptBR` and `en`. Note that **theme
  display names are UI text too** — decide deliberately whether an identity's name is translated or
  is a proper noun that stays put, and apply that consistently across all themes.
- Dumb components under `components/` take primitives and callbacks only; none imports a service or
  the bridge.
- The screen imports only from `shared/` and its own folder.

## Contract-change gate

A new config sub-screen route is a navigation-behaviour contract. It is the same `case` pattern an
existing row already uses, so the description can be brief — but it still gets described and approved
before the code is edited.

## Blocked on

Task 007. No open README question blocks this one.

## Files to create

- `frontend/src/screens/config/theme/theme.{screen.tsx,hooks.ts,styles.ts,types.ts}`
  (+ `theme.hooks.tests.ts`, `theme.tests.tsx`, `index.ts`)
- `frontend/src/screens/config/theme/components/...` (+ styles/tests/index beside each)

## Files to modify

- `frontend/src/screens/config/config.screen.tsx` — menu row + switch case.
- `frontend/src/shared/i18n/strings.ts` — new keys, both languages.

## Acceptance criteria

- Every registered theme is listed, and the list is derived from the registry — adding a theme in
  Task 011 requires no edit to this screen.
- Each row's preview is painted in **its own** theme's tokens, not the active one.
- Selecting a theme repaints the app immediately, and the selection persists across a full restart
  (Task 007's path, exercised end to end).
- The current theme is unambiguously marked.
- Every new string exists in both `ptBR` and `en`.
- No dumb component under this screen imports a service or the bridge.
- `tsc --noEmit`, ESLint and Jest pass; JS coverage floor bumped if coverage rose.

## Project-pattern checklist

- Screen layout and hook naming follow `config/notifications/`, the nearest existing equivalent.
- A screen never imports from another screen — only from `shared/`.
- Nothing about the choice is transmitted anywhere.
