# Plan 028 — Theme & Design Tokens

## Context

This plan does **not** start from zero. Two phases of the work described in backlog item 018 are
already delivered, and this README exists to record where they left off so no task re-does them.

### Phase already delivered — centralization (commit `639d808`)

`refactor(theme): centraliza todas as cores do RN em tokens` moved **every** colour literal on the
RN side into `frontend/src/shared/theme/colors.ts`. 47 files migrated, 206 literals reviewed one by
one. There is now **zero colour literal outside `shared/theme/`**, with a single deliberate
exception:

- `'#123456'` in `frontend/src/shared/components/follow-star/follow-star.tests.tsx` — an arbitrary
  assertion value proving the `activeColor` prop is respected, not a UI colour. **It stays.** Any
  lint rule written by this plan must not flag it into extinction.

### Phase already delivered — value convergence (in the working tree, not yet committed)

Token **names were all preserved**; only **values** converged, from 48 distinct values down to
**38 distinct values across 51 tokens**. The user tested it on the real device and approved:
*"a princípio tudo ok, não senti diferença."*

What was unified:

| Merged | Onto |
|---|---|
| `textBright`, `textBanner` | `textSubtle`'s value (`#CBD5E0`) |
| `sectionLabel` | `mutedAlt` (`#718096`) |
| `danger` | `dangerAlt` (`#C53030`) |
| `starActive` | `progressAmber` (`#FFC107`) |
| `white80` / `white72` | one alpha step |
| `white60` / `white55` | one alpha step |
| `white45` / `white40` / `white35` | one alpha step |
| scrims `0.5` / `0.55` / `0.6` | one light scrim |
| scrims `0.72` / `0.75` | one heavy scrim |

Kept apart **on purpose**, and this is a finding the taxonomy task inherits rather than re-derives:

- `positive` (`#38A169`, a status dot) vs `msgOk` (`#68D391`, success text) — they appear **side by
  side in the same component** (`config/components/group-card`, `config/debug/components/section`);
  collapsing them would erase a visual hierarchy that is actually being used.
- `dangerDeep` (`#7F1D1D`) — a **row background**, not a text/button red like the other two.

Versions currently sit at `1.3.0-rc1` (APK, `android/app/build.gradle.kts`) and `1.2.0-rc1`
(bundle, `frontend/package.json`).

### What is left, and therefore what this plan is

Names are still *"the role this value plays today"*, nothing is dynamic, opacity is still baked into
colour tokens, **typography is not in the theme at all** (13 font sizes across 144 uses, no font
family anywhere), the Kotlin side still paints colours and Brazilian-Portuguese strings of its own,
and there is exactly one theme. This plan closes all of that and ends by shipping three additional
themes.

---

## Decisions (already made by the user)

### 1. Themes are colour identities, not a light/dark binary

There are **N named themes**, each one a colour identity ("Floresta", "Âmbar", …) filling the same
token table the current theme fills. There is no `light`/`dark` axis and no theme is privileged.

Direct consequence on naming: **a token name may never mention luminosity.** `textOnDark` is
disqualified by its own name — under an amber theme, "dark" is a lie. Names describe *role and
surface relationship*, never brightness.

### 2. The deliverable is names **and** the rule for where each name is used

Renaming alone would leave the next developer picking `surfaceRaised` vs `surfaceInset` by feel.
Each token therefore ships with an **explicit application rule** — e.g. *"`surfaceRaised` = card,
list row, context menu"* — so a token is chosen by matching a documented situation, not by guessing.
That written rule is an **entrega do plano**, checked in beside the tokens, not an implementation
detail left in someone's head.

### 3. Opacity is an axis separate from colour

Any colour must be able to take opacity, and **the level is a property of the context/component,
not of the colour**. Consequently the 8 `whiteNN` tokens and the 5 `overlay*` tokens **stop being
colours**: they become (base colour + an alpha level applied at the call site). This plan defines
the mechanic (an `alpha(token, level)` helper, or a named opacity scale — Task 002 decides) and the
set of levels.

The evidence backing this directive was already collected, and it confirms alpha tracks the
**component's role**, never the colour:

- `white20` is **always** a secondary-button border (detail-modal, chapter-sort, serie, splash/alert,
  confirm-dialog).
- `white80` is **always** a secondary-button label (same files).
- `white45` / `white40` / `white35` are **always** a placeholder or an inactive item (MainNavigator
  `INACTIVE`, search-input placeholder, chapter-sort placeholder).
- `white60` is **always** supporting text / a secondary note.

### 4. The Kotlin side changes too

Not only the RN side. The specific Kotlin findings and their per-case treatment are in
"Investigation findings" below; they are decisions, not open questions.

### 4b. Typography is part of the theme — size as tokens, family prepared but not exercised

Explicitly requested by the user: *"tamanho da fonte e família de fonte"* belong to the theme, not
only colour. In his words:

> "Acho que vale trabalhar com tokens de tamanho, e deixar preparado pra troca de fonte, mas não
> iremos introduzir nenhuma nova fonte."

That splits into two halves with **different treatments**:

**Size becomes tokens**, exactly the way colour did. Named steps by role, and the 13 distinct values
across 144 uses — dispersed precisely the way the 48 colour values were, and almost certainly ~5-6
real steps — map onto them. Task 003 does this work.

**Family is an axis that is prepared but not exercised.** The typography module **must have the
family token**, and the mechanic must work end to end, so that changing that one value genuinely
repaints the app. Its value is the **system font**. (Per Decision 4e the slot lives in the
typography module, not in the theme object — the theme is colour only.)

The reason for the split: `fontFamily` appears nowhere in `frontend/src` and no font is bundled
anywhere, so a custom family is not a migration but a new capability with real costs. This plan pays
for the *socket*, not the *font* — see the non-goal below, which lists exactly what was excluded and
what is left in place for whoever adds a real font later.

### 4c. Font sizes are multipliers over the system font scale, not absolute pixels

The user's words:

> "sobre o tamanho podemos trabalhar como se fosse rem/em, onde baseado no tamanho da fonte do
> sistema a gente aumenta/diminui a fonte. Assim fica respeitando o tamanho do sistema e só
> aplicamos o tamanho em cima disso."

So a type step is a **ratio**, not a number: `body` is 1× the base, `caption` something like 0.85×,
and the rendered size is `base × multiplier`, resolved **at runtime**. The base comes from the
device's own text-size setting (`PixelRatio.getFontScale()`), which is what makes the entire
hierarchy grow proportionally when the user enlarges text on their phone — an accessibility
requirement, not a cosmetic preference.

Two consequences this plan has to handle rather than discover:

- **Double-scaling is the classic failure of this approach.** React Native's `<Text>` already applies
  the system scale on its own (`allowFontScaling` defaults to true), so multiplying by
  `getFontScale()` on top of that scales twice. Task 003 must verify which layer applies it and
  ensure exactly one does.
- **Size stops being a constant**: it is derived at runtime from a device setting the user can
  change while the app is installed. The typography module therefore has to be settled before Task
  006 builds the provider, so the pattern for how a screen consumes both axes is fixed once.

### 4d. Spacing and radius become tokens too

The user's words: *"Também podemos criar tokens pra tamanho e espaçamento."*

"Tamanho" is ambiguous, so this plan fixes the reading explicitly: it means **spacing**
(padding/margin/gap) and **radius** (`borderRadius`) — the layout quantities that repeat in a scale.
It does **not** mean font size (Decision 4c already covers that) and it does **not** mean fixed
dimensions (see the non-goal below). Task 004 owns it.

The finding that justifies it: a **step-of-4 scale is already almost in place** — 4/8/12/16/24 alone
account for ~202 uses — **punctured by about ten odd values** (9, 11, 3, 14, 18, 10, 6, 2). Radius
is more dispersed (12 values across 79 uses) and probably has 3-4 real steps. The method is the one
already validated on colour: propose the reduction, the user tests it on the device, and only then
is it final.

Where the scale lives is **no longer an open choice** — Decision 4e settles it: a sibling module
under `shared/theme/`, outside the theme object.

### 4e. A theme is colour. Typography, spacing and radius are separate token modules

The structural decision that settles where each axis lives. The user's words:

> "Vamos ter o tema que é de cor. E os tokens de fonte, espaçamento e tamanho não vai ficar junto e
> a gente vê o que pode virar um tipo de tema ou mantém como token."

So:

1. **A theme is colour, and only colour.** What `useTheme()` returns is the palette. The three
   identities in the last task are colour identities. No font, no spacing, no radius inside the
   theme object.
2. **Typography, spacing and radius are tokens in their own modules**, siblings of `colors` inside
   `frontend/src/shared/theme/` — `typography.ts` and `spacing.ts`. They are constants: they do
   **not** change when the user switches theme.
3. **A screen consumes both, by two different routes**: the palette through the `useTheme()` hook
   (it varies at runtime), the other tokens by direct import (they do not). This is the pattern
   every screen follows, and Task 006 is where it is fixed.

The consequence for `useTheme()` is that its contract stays **small** — a palette, nothing else.

See also open question 6: whether any of these axes later becomes a theme of its own is deliberately
left for after this plan.

### 5. The last two tasks, in this order

**First** the task that defines **the app's colour** (for Android, and possibly for the splash),
**then** the task that creates the **three themes**. They are the final two tasks of the plan, in
that sequence — the identity colour has to exist before alternative identities are drawn against it.

### 6. The three palettes are chosen during the task, not now

Task 011 does **not** arrive with palettes already written. It **proposes them to the user and
implements only after approval**. Picking three colour identities in a planning document, months
before anyone sees them on a screen, would be deciding the most subjective thing in the plan at the
moment with the least information.

### 7. The reader page background is always black, in every theme

> "Fundo de leitura sempre preto."

`readerBackground` is `#000000` today, with the comment "manga is read on black". It stays that way
and **no identity may repaint it** — it is a reading surface, not a piece of visual identity, and the
artwork is the thing meant to be seen against it.

The consequence for the taxonomy (Task 001) is that this token is named as the identity-independent
constant it is, with a rule saying so, rather than as one more themed surface that every palette has
to fill in. Task 011's three identities therefore do not define it at all.

This settles what was open question 1; it says nothing about the reader's *chrome* — the top bar,
the progress bars and the error text still take their colours from the theme.

---

## Investigation findings (already established — do not re-investigate)

### Kotlin — 9 production occurrences, three categories, three different treatments

**a) Already fallbacks — nothing structural.**
`android/features/src/main/kotlin/com/mymangareader/features/kavita/reader/ui/SduNode.kt`
(lines 51, 69, 102) reads `parseColorOrNull(node.color) ?: Color.White` / `?: Color.Transparent`.
The real colour already arrives from RN over SDU. The only action is to confirm the emitting side
(`frontend/src/screens/reader/reader-sdu.ts`) uses a token.

**b) Not on the SDU path — must change.**
`android/features/src/main/kotlin/com/mymangareader/features/kavita/reader/ui/ReaderPageList.kt`
lines 888, 893, 925 (`Color.White`) and 929 (`Color.Black`). These are pure-Compose loading/error
UI: `CircularProgressIndicator`, the error text, and `RetryButton` (`Color.White` background,
`Color.Black` label). **Decision: the colour must come from RN** — a path has to be created (props
on the view, or SDU nodes for these placeholders) with Kotlin keeping only a fallback.

**Bonus in the same file, which the user decided to resolve here:** the strings are hardcoded in
pt-BR — `"Falha ao carregar página"` and `"Falha ao carregar página (n)"` (`pageErrorMessage`,
~line 913) and `"Tentar novamente"` (in `RetryButton`, ~line 931). This violates the CLAUDE.md i18n
rule ("all UI text is translatable — never hardcode a string in one language"). Fixed in Task 008.

**c) Fixed forever, by decision.**
`android/app/src/main/kotlin/com/mymangareader/NotificationDisplay.kt:28` (`0xFF1A1A2E`) is the
native Android notification colour, drawn by the system with the app potentially dead — there is
never a live RN to consult. **Decision: it stays a fixed colour.** This is closed, not an open
question; it is recorded so nobody reopens it.

**d) A view-prop default.** `ReaderPageListViewManager.kt:110` (`"#FFFFFF"`) — evaluated together
with (b), since it is the default of the very prop (b) will start feeding.

### Android resources — 5 occurrences, and a hard constraint

- `android/app/src/main/res/values/colors.xml`: `ic_launcher_background` `#1A1A2E`,
  `splash_background` `#1A1A2E`, `splash_progress` `#E94560`.
- `android/app/src/main/res/values/styles.xml`: `@color/splash_background` used for
  `android:windowBackground` (line 4) and `windowSplashScreenBackground` (line 13).
- `android/app/src/main/res/drawable/ic_notification.xml` line 13: `#FFFFFF` (icon tint).

**Hard constraint:** these values are compiled into the APK and painted by Android **before any code
runs** — they cannot read Room. With N themes they therefore **cannot follow the user's choice**.
The RN splash must open in the native colour and cross-fade to the active theme. The user raised the
hypothesis that the splash simply has no theme and always uses the app colour — decided in Task 010.

### Existing infrastructure this plan reuses (nothing new is created)

- `frontend/src/shared/theme/colors.ts` + `index.ts` — 51 tokens, 38 values.
- `:preferences` (`android/preferences/src/main/kotlin/com/mymangareader/preferences/Preferences.kt`)
  — generic Room-backed key-value store, `get/put/delete/deleteDomain` with `key`/`variant`/`domain`.
  **No migration and no new module needed.**
- `frontend/src/shared/managers/preferences/preferences.manager.ts` — `PreferencesManager`, a
  passthrough that is already in place.
- `frontend/src/App.tsx` — already has a provider chain (`SafeAreaProvider` > `ImmersiveProvider` >
  `AppContent`) plus `LanguageContext`. `ThemeProvider` joins that chain.
- ESLint 8 with `frontend/.eslintrc.js`, `lint` = `eslint src --ext .ts,.tsx`. The anti-literal rule
  is expressible with **`no-restricted-syntax`** — **no custom plugin required**.
- 44 `*.styles.ts` files plus ~15 `.tsx` consume `colors`. They use static `StyleSheet.create` today;
  with a runtime theme they become `useMemo(() => makeStyles(theme), [theme])` or an equivalent
  helper.
- RN i18n: `frontend/src/shared/i18n` (`getStrings`, `LanguageContext`).

---

## Architecture

```
frontend/src/shared/theme/
  # ── THE THEME: colour only (Decision 4e). Varies at runtime, reached via useTheme() ──
  tokens.ts                      # the semantic colour table — one entry per role, no luminosity in
                                 # any name (Decision 1)
  tokens.rules.md                # THE APPLICATION RULES (Decision 2): for every token, where it is
                                 # allowed to be used. Covers the sibling modules' steps too
  opacity.ts                     # the named opacity scale + alpha(token, level) (Decision 3)

  # ── SIBLING TOKEN MODULES: constant, do NOT change with the theme. Imported directly ──
  typography.ts                  # type steps as multipliers (Decision 4c) + weights + the font
                                 # family token, whose value is the system font. The slot is wired
                                 # end to end; no font is bundled by this plan (Decision 4b)
  spacing.ts                     # spacing + radius steps (Decision 4d)

  themes/
    index.ts                     # the theme registry — id, display name, token table
    <current>.theme.ts           # today's identity, values unchanged
    <three more>.theme.ts        # Task 011, palettes approved during the task
  theme.context.tsx              # ThemeProvider (joins App.tsx's existing chain)
  theme.hooks.ts                 # useTheme() — the public contract. Returns the PALETTE only
  theme.preferences.ts           # persistence of the chosen theme via PreferencesManager/:preferences
  index.ts

frontend/.eslintrc.js            # no-restricted-syntax: no colour literal outside shared/theme/
frontend/src/screens/config/theme/   # the theme-picker sub-screen (same shape as config/notifications/)
frontend/src/screens/reader/reader-sdu.ts  # emits tokens, never literals

android/features/.../reader/ui/ReaderPageList.kt   # colours in via prop/SDU, strings via i18n
android/app/.../ReaderPageListViewManager.kt       # the props that feed the above
android/app/src/main/res/values/colors.xml         # the app identity colour (Task 010) — compiled,
                                                   # cannot follow the theme
```

**Data flow (theme resolution):** `:preferences` → `PreferencesManager` → `theme.preferences.ts` →
`ThemeProvider` → `useTheme()` → `makeStyles(theme)` → components.

**Data flow (Kotlin reader placeholders):** `useTheme()` → the reader screen → view props / SDU →
`ReaderPageList` (Kotlin holds only a fallback).

---

## Contract-change note

This plan changes contracts, so CLAUDE.md's process rule applies at several points: the token
taxonomy itself (every `*.styles.ts` consumes it), the `useTheme()` hook signature, the reader
view's prop shape, and the new config sub-screen route. Tasks 001, 002, 004 and 006 each state
explicitly that their contract must be **described in text and approved before any code is edited**.
A rename that looks mechanical is still a contract change here, because the whole frontend imports
it.

---

## Non-goals

- **Fixed dimensions do not become tokens.** `width`/`height` numbers have a long tail of one-off
  values — 100 (series cover), 340 (modal width), 800, 200, 80, 44, 40, 36 — which are *one
  component's own measurement*, not steps of a repeated scale. Naming a number used once makes the
  code less readable, not more. The criterion, so it does not get re-litigated per file:
  **something becomes a token when it repeats and forms a scale; it stays a literal when it is a
  specific component's own measurement.** Task 004 may make two justified exceptions: touch targets
  (44/48, an accessibility concern) and icon dimensions.

- **No new font is bundled.** Decision 4b prepares the family axis; it does not exercise it. Out of
  scope, explicitly: font files in assets, registration via `react-native.config.js` / the Android
  assets path, per-weight fallback when a family lacks one of the four weights in use
  (600/700/500/400), and glyph-coverage verification across the app's languages. The reason is that
  those costs buy nothing until someone actually wants a specific font — so the plan pays for the
  socket now and leaves the bill for the font to whoever orders it.

  **What is left prepared**, so that person knows where it plugs in: the family token exists in
  `typography.ts` (set to the system font), the value reaches the style layer like any other token
  in that module, and changing it repaints the app. Adding a real font is then bundling the file,
  registering it, and changing one value in one module — no rework of the mechanic.
- **No theme coming from the server.** The choice is local, persisted in `:preferences`. Nothing is
  fetched, nothing is transmitted.
- **No per-screen theme override.** One active theme for the whole app.
- **No change to `NotificationDisplay.kt`'s colour** — fixed by Decision (c) above.
- **No rewrite of the native splash.** It stays at the OS minimum, as the project convention
  requires; only its *colour value* is in scope, in Task 010.
- **No telemetry.** The chosen theme is never reported anywhere.

---

## Open questions (must be answered before the dependent task is implemented)

1. **How many levels does the opacity scale have?** The collected evidence supports at least four
   distinct roles (border ~0.2, secondary label ~0.8, placeholder/inactive ~0.45, supporting text
   ~0.6) plus two scrims. Whether that becomes a 4-step, 6-step or 8-step named scale — and whether
   scrims live on the same scale or a separate one — is not decided. *Blocks Task 002.*

2. **Do `positive`/`msgOk` and `dangerDeep` survive as distinct tokens in the final taxonomy?** They
   were kept apart during convergence for good reasons (recorded above), but a semantic taxonomy may
   express the same distinction differently — e.g. a status-dot role vs a message role, and a
   "destructive surface" vs a "destructive foreground". *Blocks Task 001.*

3. **Is the app identity colour a token of the current theme, or a value that lives outside every
   theme?** Tied to the hard constraint on compiled resources and to the "splash has no theme"
   hypothesis. *Blocks Task 010, and Task 011 inherits the answer.*

4. **How do `colors.xml` and the RN token stay in sync?** A generation script, an anchor comment, or
   a test that fails when they diverge. *Blocks Task 010.*

5. **Is the reader a special case for the system font scale?** The general question is **decided** —
   Decision 4c: sizes are multipliers over the device's text-size setting, everywhere. What remains
   open is only the reader: it is image reading, and its text is chrome and error messages rather
   than content. Does that chrome follow the system scale like the rest of the app, or is it pinned?
   *Blocks Task 003 (and is entangled with the `fontSizeSp` question it must resolve).*

6. **Does any non-colour axis later become a theme of its own?** A typography theme, a
   density/spacing theme. Decision 4e keeps them as fixed tokens **for now**, and the user
   explicitly wants to decide this **with the system running**, not on paper. *Blocks nothing and
   has no task — it is work after this plan.* What the tasks owe it is only this: **do not close the
   door.** Nothing in the API should assume the palette is the only thing that can ever vary at
   runtime — but equally, do not build the generalization now.

---

## End-to-end verification checklist

- [ ] No colour literal exists outside `frontend/src/shared/theme/`, verified by the lint rule, with
      `follow-star.tests.tsx`'s `'#123456'` still present and still passing.
- [ ] No token name mentions luminosity (`onDark`, `light`, `dark`, `white`, `black`) — verified by
      reading the final table.
- [ ] Every token in the table has a written application rule in `tokens.rules.md`; no token is
      documented as "misc" or "various" — type steps included.
- [ ] No `fontSize` or `fontWeight` numeric literal remains in a screen style file, and no type step
      is named after its number.
- [ ] Spacing and radius come from the scale, with every puncture either snapped or justified in
      writing; the user confirmed the result on the device before it was made final. They are
      identical under every theme.
- [ ] No one-off `width`/`height` was turned into a token (the Decision 4d non-goal).
- [ ] The font-family token exists in the typography module, resolves to the system font, and a test
      proves that changing that single value reaches the style layer — the socket works even though
      no font ships.
- [ ] `useTheme()` returns the palette and nothing else; typography/spacing/radius are reached by
      direct import, and switching theme does not change any of them.
- [ ] No font file was added to the repo, and no font-registration config was introduced.
- [ ] Switching themes on the config screen repaints the whole app without a restart, including the
      reader, modals, the tab bar and the Kotlin-rendered reader placeholders.
- [ ] The chosen theme survives a full app kill and restart.
- [ ] With no theme preference ever set, the app opens on the current identity — never a blank or
      half-applied theme.
- [ ] The splash opens in the native colour and transitions without a visible colour jump, on every
      theme.
- [ ] No pt-BR string remains hardcoded in `ReaderPageList.kt`; both `ptBR` and `en` render.
- [ ] The three new themes have been seen on the real device and approved by the user before the
      plan closes.
- [ ] The theme picker's own strings exist in both `ptBR` and `en`.
- [ ] No screen imports another screen's theme code; everything comes from `shared/theme/`.
- [ ] Nothing about the chosen theme is transmitted anywhere (fixed project convention).
- [ ] `make coverage` passes, with the Kotlin and/or JS floor bumped if coverage rose.
