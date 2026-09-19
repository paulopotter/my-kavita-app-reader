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
