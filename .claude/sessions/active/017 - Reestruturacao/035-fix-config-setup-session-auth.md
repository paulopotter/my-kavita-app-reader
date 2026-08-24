# Task 035 — Correction: Config/Setup session & auth (401 on Library/Following) (Phase 5 — Corrections)

**Status:** todo (blocked by Task 017 — needs the real `Server` module's session/reauthentication
mechanism to exist; related to Task 021's RN Services but not blocked by it, since this task's
scope is the Config/Setup screen and session lifecycle, not the Page/Chapter/Series Services
built there)

## Objective

Fix a real production bug reported by the user during Task 021: the Library/Following screen
gets a **401 from Kavita**. Root cause confirmed via an Explore agent — the app still
authenticates through the old pre-`:server` path, which has no JWT refresh mechanism at all, even
though the new `:server` module already built one that nothing calls yet.

## Root cause (confirmed, real paths/lines)

- The app authenticates against Kavita via `KavitaAuthFeature.kt`
  (`android/features/src/main/kotlin/com/mymangareader/features/kavita/KavitaAuthFeature.kt`),
  which trades the API key for a JWT and saves it in `AuthConfigDao`. This JWT is short-lived —
  Kavita itself expires it, not the API key.
- `KavitaSeriesFeature.kt`
  (`android/features/src/main/kotlin/com/mymangareader/features/kavita/series/KavitaSeriesFeature.kt`,
  used by `LibraryModule.kt`) sends this saved JWT directly in every request header, without
  checking validity and without handling 401 — it only propagates the error upward.
- `isAuthenticated()` (`KavitaAuthFeature.kt:48`) only checks whether a JWT string exists in
  storage, never whether it's still valid.
- Today the only way to renew the JWT is the user manually re-entering the API key on the
  Config/Setup screen (`SetupModule.kt` → `KavitaAuthFeature.authenticate()`), which fires a new
  `POST /api/Plugin/authenticate`.
- The new `:server` module (Task 017,
  `android/server/src/main/kotlin/com/mymangareader/server/Server.kt`) already handles
  authentication properly internally: `setActiveGroup`/`reauthenticateActiveGroup` (lines
  ~423-441) call `plugin.auth.authenticate()` and hold the session; and `KavitaAuth.kt`
  (`android/server/src/main/kotlin/com/mymangareader/server/plugins/kavita/auth/KavitaAuth.kt`)
  already has `checkApiKeyExpiry()` and `reauthenticate()` (lines 57-76) ready to renew the token
  via a refresh token — but **nothing in the app uses this yet**. `KavitaAuth.kt`'s own comment
  (lines 78-82) already notes that "whoever holds the real session hasn't been built yet."
- Confirmed by the completion doc `.claude/completions/2026-08-22_016-relocate-kavita-plugin.md`:
  the Config/Setup screen today still uses 100% the old path
  (`KavitaAuthFeature`/`SetupModule.kt`/`ConfigRepository`/`SetupBridge` in
  `frontend/src/shared/bridge/config.ts`), not the new `:server`/`ServerBridge`/`ServerService`
  (RN) path.

## Decision (confirmed with the user)

The real fix for the 401 is migrating the Config/Setup screen (server management + auth) onto the
`:server`/`ServerBridge`/`ServerService` path instead of the old
`SetupModule.kt`/`SetupBridge`/`KavitaAuthFeature`/`ConfigRepository` path. The `ServerService`
(RN) built in Task 021
(`frontend/src/shared/services/servers/servers.services.ts`) already exposes
`group.active.set/get`, `auth.reauthenticate`, etc. — the pieces needed already exist, they're
just not wired to the screen that owns the user-facing session.

## Scope

- Migrate the Config screen (`frontend/src/screens/config/ConfigScreen.tsx`, `ConfigService.ts`,
  `useConfig.ts`) to consume `ServerService`/`ServersService` (RN, already exists) instead of
  `SetupBridge`/`ConfigRepository`/`SeriesBridge` for everything that is server management
  (groups, urls, active group) and authentication.
- Actually connect the JWT refresh mechanism that already exists in `:server`
  (`KavitaAuth.reauthenticate`/`checkApiKeyExpiry`) to a real call site — e.g. on detecting a 401,
  or proactively before expiry. Today it exists but is orphaned; nothing invokes it.
- Once done, the 401 bug should disappear, because the session becomes owned by `Server` (which
  already has the session/reauthentication logic) instead of the old path with no refresh at all.

## Out of scope for this task

Deciding now the exact design of *when* to call `reauthenticate` (reactive on 401 vs. proactive
by expiry) is **not** decided here — that's a mini-iteration with the user when this task is
actually started. This task only registers the finding and the objective.

## Completion criteria

- Config/Setup screen (server management + authentication) consumes `ServerService`/
  `ServersService` (RN), not `SetupBridge`/`ConfigRepository`/`SeriesBridge`.
- `:server`'s existing `KavitaAuth.reauthenticate()`/`checkApiKeyExpiry()` is actually called from
  a real trigger point (reactive or proactive — decided at implementation time).
- The 401 on Library/Following no longer reproduces after a JWT expires (manual verification on
  device, including waiting out/forcing an expired session).
- Tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.
