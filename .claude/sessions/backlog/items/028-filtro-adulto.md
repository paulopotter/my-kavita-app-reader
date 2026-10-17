# Backlog 028 — Adult-content filter (hide / blur / adult-only)

## Status
Implemented (v1, categories only). Open: Kavita age rating and the external-metadata adult flag as
extra criteria feeding the same id set; OS notification text and the unread badge are unfiltered.

## What
A user-configurable filter over series considered "adult", applied **only at render time**.
Modes: `hidden` (default), `blur`, `normal`, `adultOnly` (inverts: shows only the adult set).
When the filter is active there is a second setting to remove the blur. The user picks which
**categories** (genres/tags) count as adult. Scope v1: Library, Following, Search, Dashboard rails
and stats, Notifications history.

## Decisions (validated against the real server, 2026-10)
- The series list (`POST /api/Series/all-v2`, no filter) stays the single source of the screens and
  carries NO genres/tags/age rating. No bulk endpoint exists for them.
- A **second** `all-v2` call, filtered by the selected categories, returns the adult series. Only
  its ids are used. Measured: 187 series / 204 KB unfiltered vs 10 series / 11 KB filtered, both
  tens of ms on LAN.
- The filter's `value` takes numeric ids, a comma list is a union (`Contains`, `field 18` Genres,
  `field 6` Tags). A category name there returns HTTP 500. So name→id happens in the plugin.
- Nothing Kavita-specific goes above the plugin: the RN side and `:server`'s contract only know
  category **names** and series ids.
- No digest: single source, nothing to compose. Caching/freshness of the last adult set lives in RN
  (`PreferencesManager`), Kotlin stays dumb.
- Out of v1 (same set of ids, extra criteria later): Kavita age rating (`field 4`, enum 12/13/14 =
  R18+/AdultsOnly/X18+), external-metadata server adult flag, categories shown per series (OPDS
  `/libraries/{id}` or 64 inverted queries — only if a use appears).

## Contract (needs approval before code — CLAUDE.md "Process")
1. `ServerPlugin.Categories` (new group): `list(): List<String>` and
   `serialIds(names: List<String>): List<String>`. Absent in a plugin ⇒ feature absent.
2. `Server` normalizes both into neutral shapes; `ServerBridge` exposes them.
3. RN `CategoriesService` (calls only `ServerBridge`).
4. `AdultFilterPrefs` (shared tool): selected category names, mode, `unblur`, last adult-id set.
5. `AdultFilterTool.apply({ items, adultIds, mode })` pure; hooks call it in `useMemo`.
6. Settings entries: category picker, mode, "remove blur" (visible only when mode ≠ normal/hidden).

## Phases
1. **Kotlin**: `Categories` group in `ServerPlugin` + Kavita implementation (genres/tags list,
   name→id cached in the plugin instance, filtered `all-v2`), `Server` normalization,
   `ServerBridgeModule`. Tests: plugin (MockWebServer: id resolution, 500 on names avoided, union),
   `Server`. Bump Kotlin coverage floor if it rises.
2. **RN data**: `CategoriesService`, `AdultFilterPrefs`, startup hydration of the persisted adult
   set (first paint already filtered), refresh in background + on selection change. Tests.
3. **Filter + blur**: `AdultFilterTool`; apply in Library/Following, Search, Dashboard (before
   `DashboardTool.build`), Notifications; blur on cover and title in the dumb components via a
   prop. Unknown (not yet classified, first install) series stay hidden in `hidden` mode; splash
   waits the adult-set call on first install only.
4. **Settings UI**: category picker (loaded from `categories.list()`), mode, remove-blur toggle,
   i18n (pt-BR + en).
5. `make coverage`, docs (`architecture.md`, `data-freshness.md`), CHANGELOG.

## Verify
Real server: pick Hentai+Ecchi, mode `hidden` → those series gone from every screen; `blur` →
blurred cover/title; `adultOnly` → only them; change selection → updates with 1 call, no list
refetch; kill the second call → last persisted set still applied, no flash.
