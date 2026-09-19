# Task 006 — `ThemeProvider` + `useTheme()` + `makeStyles(theme)`

## Why here

This is the task that makes the table *dynamic*. It runs after 001/002 because the provider
distributes whatever those two produced — converting 44 `*.styles.ts` files against a token table
still in flux is exactly the expensive mistake the plan's order exists to avoid.

It ships before persistence (005) deliberately: a provider with a hardcoded active theme is fully
testable on its own, and separating "distribute a theme" from "remember which theme" keeps each
change attributable when something repaints wrong.

## What to do

### 1. The theme registry

`frontend/src/shared/theme/themes/` — one file per identity, each an object filling the **same**
token table. Today's identity moves in unchanged (same values, now under the semantic names from
Task 001). `themes/index.ts` exposes the registry: a stable id, a display name, and the table.

Per README Decision 1, an identity is a **named colour identity** — there is no `light`/`dark` flag
on it and no theme is the "default" in any sense other than being the one that ships as the initial
choice.

### 2. `ThemeProvider`

Joins the existing chain in `frontend/src/App.tsx` (`SafeAreaProvider` > `ImmersiveProvider` >
`AppContent`), the same way `LanguageContext` already sits there. In this task the active theme is
fixed to the current identity; Task 007 makes it come from storage.

### 3. `useTheme()` — the public hook contract

The one thing every screen will call. Per Decision 4e it returns the **palette and nothing else** —
plus whatever identifies the active theme and drives switching. **Typography, spacing and radius are
not in it**; they are constants in their own modules.

Define the exact return shape before writing it. Keeping this contract small is the point: it is the
only part of the design system that varies at runtime.

**The consumption pattern this task fixes for the whole app** — every screen follows it from here
on:

- the **palette** comes from `useTheme()`, because it changes at runtime;
- **typography / spacing / radius** come from a **direct import** of their module, because they do
  not.

### 4. Convert the styles

The 44 `*.styles.ts` files use static `StyleSheet.create` today. They become
`useMemo(() => makeStyles(theme), [theme])` or an equivalent helper — decide which and apply it
uniformly; two conventions for the same thing across 44 files is its own bug.

`makeStyles` takes the **palette**; it reads the constant tokens by import rather than receiving
them as arguments. This is also why Tasks 003 and 004 come first — these 44 files get rewritten
**once**, against all the axes, not once per axis.

The ~15 `.tsx` files that read `colors` inline switch to `useTheme()`.

## Contract-change gate

**Contract change** — `useTheme()` is a public hook signature, and the style-file shape changes
across the whole frontend. Describe the hook's return type and the chosen `makeStyles` convention in
text, get approval, then edit code.

## Blocked on

Tasks 001 and 002 being approved and landed. No open README question blocks this one.

## Files to create

- `frontend/src/shared/theme/theme.context.tsx`, `theme.hooks.ts`, `themes/index.ts`,
  `themes/<current>.theme.ts` (+ tests beside each).

## Files to modify

- `frontend/src/App.tsx` — one more provider in the existing chain.
- `frontend/src/shared/theme/index.ts`.
- All 44 `*.styles.ts` and the ~15 `.tsx` consumers.

## Acceptance criteria

- With one theme registered, the app is pixel-identical to the pre-task build.
- `useTheme()` returns the palette only — a test asserts it exposes no typography, spacing or radius.
- Switching theme changes colours and nothing else: type sizes, weights, family, spacing and radius
  are unchanged, verified by a test.
- Swapping the registry's active theme in a test repaints every converted component — proven by a
  test that renders with two different tables and asserts the styles differ.
- No component reads the token table outside `useTheme()` (no residual direct import of the raw
  table in screen code).
- No `StyleSheet.create` in a screen still closes over a static token table.
- A component rendered outside the provider fails loudly, or falls back explicitly — never silently
  renders untinted.
- `tsc --noEmit`, ESLint and Jest pass; JS coverage floor bumped if coverage rose.

## Project-pattern checklist

- Screens import from `shared/` only, never from another screen.
- Dumb components keep taking primitives/callbacks; the hook is called by the screen or by a
  component that owns its own styles, not smuggled into presentational leaves that took colours as
  props before.
- Tests sit beside each file; naming follows `name.type.ext`.
