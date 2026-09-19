# Task 007 — Persistence via `:preferences` + resolution at boot

## Why here

Task 006 distributes a theme; this task makes the app remember which one. It ships before the picker
screen (007) so the screen has somewhere to write to, and before the identity-colour task (008) so
the "what does the splash paint before a choice is known?" question is being asked against a real
resolution path rather than a hypothetical one.

## What to do

1. **Persist through the existing infrastructure — create nothing new.** `:preferences`
   (`android/preferences/.../Preferences.kt`) is a generic Room-backed key-value store with
   `get/put/delete/deleteDomain` over `key`/`variant`/`domain`, and
   `frontend/src/shared/managers/preferences/preferences.manager.ts` is a ready passthrough.
   **No migration and no new module are required** — that was established in the investigation.
   The theme gets its own domain and one key holding the active theme's id.
2. **`theme.preferences.ts`** in `shared/theme/` — the single place that reads and writes that key.
   `ThemeProvider` consumes it; nothing else touches the key directly.
3. **Resolution at boot.** The stored id is read during startup and applied before the app paints
   its first themed frame. Store an **id**, never a token table: a persisted table would go stale the
   moment a theme's palette is adjusted, and would break the day an id is removed.
4. **Unknown or absent id.** Never set → the initial identity. An id that no longer exists in the
   registry (a theme removed in a later release) → the initial identity, and the stale value is
   cleaned up rather than left to fail again on every boot.
5. **Splash handoff.** The native splash paints a compiled colour before any code runs — it cannot
   read Room (README hard constraint). The resolution has to happen early enough that the RN splash
   does not paint the initial identity and then visibly jump to the user's choice. Whether the final
   answer is "resolve before first paint" or "the splash has no theme at all" is settled in Task 010;
   this task must not hardcode an assumption that Task 010 then has to unpick.

## Blocked on

Task 006. No open README question blocks this one directly, though open question 3 (identity colour
inside or outside the themes) will constrain the splash handoff in Task 010.

## Files to create

- `frontend/src/shared/theme/theme.preferences.ts` (+ tests beside it).

## Files to modify

- `frontend/src/shared/theme/theme.context.tsx` — active theme now comes from storage.
- The boot/splash path, for the resolution point.

## Acceptance criteria

- Choosing a theme and fully killing the app brings it back on the same theme.
- No preference ever written → the initial identity, with no crash and no unthemed frame.
- A stored id absent from the registry → the initial identity, and the stale key is cleared.
- The stored value is an id, verified by a test — never a serialized token table.
- No second source of truth for the active theme exists anywhere.
- `tsc --noEmit`, ESLint and Jest pass; `make coverage` passes, floors bumped if coverage rose.

## Project-pattern checklist

- Preferences go through `:preferences` / `PreferencesManager`, the app's single generic preference
  layer — no new storage mechanism for one value.
- Nothing about the choice leaves the device (fixed project convention).
- The theme key lives in its own domain, beside how the other domains use `:preferences`.
