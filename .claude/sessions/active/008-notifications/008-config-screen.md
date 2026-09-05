# Task 008 — RN: `config/notifications/` — groups CRUD, toggles, retention setting

## Why after 007

Needs the bridge to exist before any RN code can call it.

## What to do

1. `shared/services/notifications/notifications.services.ts` — `NotificationsService`, thin
   wrapper over `NotificationsBridge` (Task 007), following the project's Service conventions:
   file `name.type.ext`, plural folder/file, one named-object argument per method with ≥1 arg
   (e.g. `groups.upsert({ id, urls })`, never positional), `bound(fixed)` if a natural fixed id
   emerges (likely not needed here since groups are the top-level unit, no nested id to bind).
2. `screens/config/notifications/notifications.screen.tsx` (+ `.hooks.ts`, `.types.ts`,
   `.styles.ts`), following the current screen file convention (kebab-case, role-in-filename,
   `hooks/` subfolder), matching the shape of the existing `config/server/` sub-screen:
   - List of notification groups, each with its ordered list of candidate URLs (add/edit/remove
     URL, add/remove group) — same interaction pattern as the server-group config screen.
   - "Enable notifications" toggle (`enabled`) — off disables the other two scope toggles below
     (visually, e.g. greyed out/non-interactive) without clearing their stored value.
   - "Notify for all series" toggle (`scopeAll`) and "Notify for followed series only" toggle
     (`scopeFollowedOnly`) — mutually exclusive in this screen's own state: turning one on turns
     the other off and locks it (disabled, non-interactive) until the active one is turned back
     off. This exclusivity is UI-only (see README Decision 6) — the hook is responsible for it,
     not the bridge/Kotlin side.
   - "Group notifications across series" toggle.
   - "Retention" numeric/stepper input for `retentionDays`.
3. Dumb components under `components/<comp>/` (own subfolder, `.component.tsx` + `.styles.ts` +
   `.tests.tsx` + `index.ts`) for whatever the group/URL list and toggles need — no
   service/bridge import inside any of them, all data flows in via props from the hook.
4. All UI strings added to the existing i18n system (pt-BR + en), no hardcoded text.
5. Register the route (reachable from the existing Config screen, same navigation pattern already
   used for other config sub-screens).

## Files to create

- `frontend/src/shared/services/notifications/notifications.services.ts` (+ `.tests.ts`)
- `frontend/src/screens/config/notifications/notifications.screen.tsx` (+ `.hooks.ts`,
  `.types.ts`, `.styles.ts`, tests)
- `frontend/src/screens/config/notifications/components/...` (per actual UI needs)
- i18n string entries (both languages)

## Files to modify

- Navigation route registration (wherever the Config screen's sub-routes are declared)
- `frontend/src/shared/i18n/strings.ts` (or the equivalent per-language files)

## Acceptance criteria

- Adding/removing a URL from a group persists across a screen remount (backed by the real bridge
  in an integration-style test, or a faked bridge for the hook's own unit tests).
- Toggling "enable notifications" reflects immediately in `NotificationsService.isEnabled()`.
- Turning "all series" on locks "followed only" off (and vice versa); turning the active one back
  off unlocks the other. Covered by a hook-level unit test with a faked bridge.
- No dumb component under this screen imports `NotificationsService` or the bridge directly (grep
  check, same as the Reader plan's precedent).
- Jest coverage threshold passes; bumped if coverage rose.

## Project-pattern checklist

- Method-with-argument convention (one named object, never positional) applied throughout the new
  Service.
- Screen never imports from another screen — only from `shared/`.
- Feature gated by missing config: the screen itself never needs to special-case "notifications
  not configured" as a UI branch beyond showing an empty group list — the actual gating (service
  won't start) lives in Kotlin (Task 006), not duplicated here as a UI `if`.
