# Backlog 002 — Splash Screen

## What
Second screen in the migration order. Shown on app launch while the OTA
bundle check runs and the active URL is selected.

## Why
Entry point of the app — gives the user visual feedback while background
initialisation happens instead of a blank screen.

## Scope (when planned)
- Kotlin: no new tools needed (reuses `ActiveUrlSelector` from plan 001)
- RN: `SplashScreen.tsx` — logo + loading indicator
- OTA check triggered here (or delegated to `app/` shell)
- Navigates to Config if no server is configured; otherwise to Home

## Dependencies
- Plan 001 (Config Screen) must be done first
- OTA infrastructure (backlog 010) can be stubbed initially
