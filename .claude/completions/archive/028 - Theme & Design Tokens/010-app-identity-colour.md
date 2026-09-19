# Task 010 — The app's identity colour (penultimate)

## Why penultimate

Fixed by README Decision 5: **the app-colour task comes first, then the three themes.** The reason
is causal, not administrative — the identity colour is the one colour that *cannot* follow the user's
choice, so it has to be settled before three more identities are drawn against it. Task 011 inherits
whatever this task decides.

## The constraint this task exists to resolve

These values are **compiled into the APK and painted by Android before any code runs.** They cannot
read Room, cannot consult RN, and therefore **cannot follow the active theme**:

- `android/app/src/main/res/values/colors.xml` — `ic_launcher_background` `#1A1A2E`,
  `splash_background` `#1A1A2E`, `splash_progress` `#E94560`.
- `android/app/src/main/res/values/styles.xml` — `@color/splash_background` on
  `android:windowBackground` (line 4) and `windowSplashScreenBackground` (line 13).
- `android/app/src/main/res/drawable/ic_notification.xml` line 13 — `#FFFFFF`, the icon tint.

So with N themes there is one fixed colour the app wears before it knows who the user is. This task
names it, decides where it lives, and decides what the RN splash does about it.

## What to do

### 1. Define the identity colour

The colour that represents the app regardless of theme: the launcher background, the native splash,
the native splash progress. Decide whether it is a **token of the current theme** (and so changes if
that theme's palette ever changes) or a **value that lives outside every theme**, owned by the brand
rather than by any identity — README open question 3.

### 2. Decide the splash's relationship to themes

The native splash paints the compiled colour; the RN splash then has to get to the active theme.
Either:

- **cross-fade** — the RN splash opens on the native colour and transitions to the theme, which
  requires the resolution from Task 007 to land before first paint; or
- **the splash has no theme at all** — it always uses the app colour, and the theme only appears once
  the app proper renders. This is the user's own hypothesis and is the simpler, jump-free answer.

Decide it here, explicitly, with the reasoning written down. Task 007 deliberately avoided hardcoding
an assumption that this task would have to unpick.

### 3. Decide how `colors.xml` and the RN token stay in sync

README open question 4. Candidates: a generation script that writes `colors.xml` from the token
table, an anchor comment in both files pointing at each other, or a **test that fails when the two
diverge**. The last is the cheapest to keep honest and the hardest to forget. Whatever is chosen, it
must survive a future identity change made by someone who has not read this plan — that is the whole
point, since today's `#1A1A2E` already appears in three separate places with nothing tying them
together.

### 4. Apply it

Update the Android resources if the identity colour changes, and make sure the sync mechanism from
step 3 is actually wired, not merely documented.

## Blocked on

- **README open question 3** — identity colour inside or outside the themes.
- **README open question 4** — the sync process.

Both are decided *in* this task, with the user, before code is edited.

## Files to modify

- `android/app/src/main/res/values/colors.xml`
- `android/app/src/main/res/values/styles.xml` (only if the reference changes; the native splash
  itself stays at the OS minimum)
- `android/app/src/main/res/drawable/ic_notification.xml`
- `frontend/src/shared/theme/` — wherever the identity colour ends up living.
- `frontend/src/screens/splash/` — if the cross-fade route is chosen.
- Whatever the sync mechanism requires (a script, or a test).

## Acceptance criteria

- The identity colour is declared in exactly one place, and every other occurrence derives from or is
  verified against it.
- The sync mechanism **fails** when the two sides are deliberately made to disagree — verified by
  doing it, not by assuming.
- On the real device, launching the app shows no visible colour jump between the native splash and
  the RN splash, **on every theme**.
- The native splash remains at the OS minimum (colour + icon) — the project convention that it is
  frozen still holds; only its colour value was in scope.
- `make coverage` passes; floors bumped if coverage rose.

## Project-pattern checklist

- "Splash" means the RN splash (`frontend/src/screens/splash/`); the native one is the OS minimum and
  is not redesigned here.
- No personal data, no telemetry.
- The reasoning for the chosen splash-vs-theme answer is written down, not just implemented — it is
  the kind of decision that looks arbitrary six months later.

---

## Result — done

### The default moved first

Before the identity could be chosen, the user promoted **teal** from the second theme (built to
prove runtime switching) to the default one, and the old palette was named for what it is:
**crimson**, deep navy with a crimson accent. Its folder was renamed `themes/default/` →
`themes/crimson/`.

No theme is called "default" any more. Which identity holds that role is `defaultThemeName`, and
the picker marks it with a **translated suffix** (`Petróleo - padrão` / `Teal - default`) rather
than the name carrying it — so moving the role later does not leave a name lying.

### The identity

Taken from the teal palette, as the user asked:

| resource | was | is |
|---|---|---|
| `splash_background` | `#1A1A2E` | `#0F1A21` (`surface.primary`) |
| `ic_launcher_background` | `#1A1A2E` | `#0F1A21` |
| `splash_progress` | `#E94560` | `#38BDC7` (`button.primary`) |
| `NotificationDisplay.BRAND_COLOR` | `0xFF1A1A2E` | `0xFF0F1A21` |

`NotificationDisplay` was included although Task 008 had listed it as a fixed colour: the reason
recorded there was that no live RN can be asked, not that it never changes. It is the brand colour
and follows the identity.

The RN splash needed nothing — it already reads `themes[defaultThemeName]`.

**A test now holds the two ends together.** The launcher icon and the native splash are painted
before any code runs, so they cannot read a token and hold a copy instead; the test states the hex
`colors.xml` must carry, and fails naming it if the default role moves without that file being
edited.

### Also delivered: the theme swatch

Not in the task's original scope, asked for while it was open. Each option in the theme picker now
carries a square split corner to corner — accent above the diagonal, surface below — so an identity
can be read without wearing it. Two `<Polygon>` from `react-native-svg` (already a dependency,
until now only pulled in by lucide).

It is the **one place in the app where a colour legitimately bypasses the token rule**: the sample
shows an identity that is deliberately *not* active, so it comes from the registry rather than
`useTheme()` and cannot pass through `createStyles`. Commented on both sides so it is not "fixed"
later.

The `Select` stays dumb — it receives a ready-made sample and never learns these are themes. Both
identities are dark and the sample sits on a dark sheet, so it carries a border; without one the
surface half would vanish and the accent would read as a loose triangle.

### Verification

`tsc --noEmit` clean, ESLint 0 errors, 100 suites / 1297 JS tests, `make coverage-kotlin` passes.
Verified on the real device (rc28, rc29). The user approved the identity — *"a splash do RN
respeita o tema, então ta de boas"* — and the swatch: *"lindo, pode commitar"*.

Versions: `1.3.0-rc27` → `1.3.0-rc29` (APK), `1.2.0-rc27` → `1.2.0-rc29` (bundle).

### Worth knowing

The launcher icon's backdrop is now considerably darker than before. On an OLED launcher it sits
close to the system's own black; the user looked and accepted it.
