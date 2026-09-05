# Plan 008 — Notifications & Deep Links

## Context

The app currently has no way to tell the user a followed series got a new chapter unless they
open it and check manually. This plan promotes backlog item 008 (originally scoped as just
"notification centre + provider config screen") into a full implementation plan, following the
architecture that came out of Plan 017: a Layer 1+2 generalizer module for the external
connection, a Layer 3/4 RN stack that consumes it, and a new screen under `config/`.

Three things make this domain different from every other plan so far:

1. **The event source is external and asynchronous.** Nothing in this repository detects a new
   chapter — that detection happens in infrastructure the user runs elsewhere (their own script or
   service that watches the Kavita server) and simply publishes a message when it notices a
   change. This app is a **consumer only**: it listens, resolves, filters, and displays. The
   "Publisher contract" section below is the full interface between that outside world and this
   app; a ready-to-use prompt for implementing the publisher side is included at the end of this
   document for the user to hand to a separate coding session.
2. **Delivery must survive the app being closed.** A normal Kotlin↔RN bridge call only works while
   the RN JS engine is alive. Reliable delivery with the app fully closed requires an Android
   **foreground service** holding a persistent WebSocket connection to the ntfy topic — which
   means, unlike every other domain in this app, part of the notification pipeline (connection
   lifecycle, payload resolution, native notification construction) runs **entirely in Kotlin**,
   with no RN involvement in the hot path. RN only configures the connection and reads the
   resulting history.
3. **It needs its own local history with retention**, which is a genuinely new shape (a persisted,
   paginated, read/unread list with a user-configurable purge policy) — nothing existing in the
   app does this today.

A fourth thing folds into this same plan once the above was underway: the notification's tap
behavior (point 2 above) needs somewhere real to land, and **no deep link mechanism exists in this
project at all today** — confirmed by inspection: `AndroidManifest.xml` carries only the default
launcher intent-filter, `App.tsx`'s `NavigationContainer` has no `linking` prop, and
`RootNavigator.tsx` only carries a placeholder comment referencing schemes that were never built.
Rather than bolt a one-off URI parser onto the notification code path, this plan builds a proper,
reusable deep link mechanism first (Task 004) and has the notification's tap intent simply consume
it — see "Deep links" below.

Nothing in this plan reuses code from any other project. Any UX resemblance to notification
systems the user has seen elsewhere is background inspiration only; every decision below was
independently justified against this project's own architecture and constraints.

---

## Decisions

### 1. Delivery mechanism: foreground service + persistent WebSocket

A polling approach (waking up periodically to check for new messages) cannot guarantee delivery
promptly enough and burns battery doing it. Instead, when the feature is enabled, an Android
**foreground service** opens and holds a WebSocket connection to the configured ntfy topic for as
long as at least one notification group is configured and the feature toggle is on. The trade-off
accepted: a persistent, low-priority "connected" notification is shown the whole time the service
is active — required by Android for any long-running foreground service, and it doubles as visible
proof the feature is working. The service reconnects with backoff on drop and stops itself
cleanly when the user disables the feature or removes the last connection URL.

### 2. Event origin: external broadcast, app-side filtering only

The publisher (external to this repo) posts to a plain ntfy topic — it is a simple broadcast, not
scoped per user or per device on the publisher's side. This app is one of potentially several
subscribers to the same topic; all app-side filtering (which series matter, whether the feature is
even on) happens here, never assumed on the publisher.

### 3. Kotlin module: `:notifications` (generalizer) + `plugins/ntfy/`

Follows the exact generalizer shape already used by `:server` (Kavita) and
`:external-metadata-server` (m3): a Layer 2 module (`:notifications`) owns the provider-agnostic
contract, with the real protocol implementation nested underneath as a Layer 1 plugin
(`notifications/plugins/ntfy/`). The Layer 2 interface is named in contract vocabulary, not
provider vocabulary — mirroring `ServerPlugin`/`KavitaServerPlugin`:

```
notifications/
  Notifications.kt               # L2 facade — the module's own public API
  NotificationsModule.kt         # Hilt — registers every NotificationPlugin implementation
  NotificationResolver.kt        # seriesId/name resolution + Following + scope filter (Task 003)
  plugins/
    NotificationPlugin.kt        # L2 interface — connect/disconnect/onEvent, provider-agnostic
                                  # (lives inside plugins/, mirroring ServerPlugin's own location)
    ntfy/
      NtfyPlugin.kt              # L1→L2 adapter — real ntfy WebSocket protocol
      NtfyPayload.kt             # L1 — raw wire DTOs, nothing above plugins/ntfy/ ever sees these
```

This keeps the door open for a future provider (e.g. Firebase Cloud Messaging) without touching
anything above Layer 2 — exactly the reasoning already recorded in `architecture.md` for why every
external connection gets the full generalizer shape regardless of how many providers exist today.

`:notifications` depends only on the modules already promoted by Plan 017 (`:core`, `:cache`,
`:preferences`, `:server`, `:content-digest`) — never on `:features` (legacy).

### 4. Connection config: notification groups, same shape as `:server`

Reuses the exact pattern `:server` already established for Kavita connections: a **group** holds
an ordered list of candidate URLs (e.g. a high-priority LAN address and a WAN fallback), with
`ActiveUrlSelector` resolving which one is reachable. Here, a "notification group" is a
ntfy host + topic pair per URL. Configuration happens in a new sub-screen under
`frontend/src/screens/config/notifications/`, matching the existing pattern of
`config/server/`. A `BuildConfig`/`.env` value may seed an initial host+topic for a
user building their own APK — this seed is **entirely optional**: if absent, the screen opens
empty, and no real value is ever committed to this repository. Presence/absence of this seed is
never gated by an `if` in application logic; the screen simply reads whatever `Preferences`
already holds (which the seed, if any, only pre-populates once on first run).

The feature as a whole is gated by **missing config**, not a settings toggle read through an `if`:
no notification group with at least one URL configured → the foreground service never starts,
regardless of any other switch's state. The user-facing "enable notifications" toggle exists on
top of that as a second, independent gate — both must be satisfied for the service to run.

### 5. Series resolution: `seriesId` first, exact-name fallback, Kotlin-side

Because the foreground service and its WebSocket are pure Kotlin with no RN involvement in the hot
path, series resolution must happen in Kotlin, before a native notification is ever built. The
payload should carry the Kavita `seriesId` directly — it's already a stable identifier, so no
matching/slug table is needed. If `seriesId` is absent, the fallback resolves by **exact** name
match (`seriesName`) against the series listing already synced locally (`:content-digest`'s
Series listing, reached the same way `SerialsService.list` reaches it on the RN side — here via
the equivalent Kotlin-side call through `:server`/`:content-digest`, never re-implemented). If the
name search doesn't return exactly one match, the event is discarded and logged — it never
crashes the service and never guesses.

### 6. Recipient filter: enabled + scope (all series vs. Following only)

Three independent preference flags, all under the `notifications` domain in `:preferences`:

- **`enabled`** — master switch. `false` blocks every other flag from having any effect; the
  service and every notification path stay off regardless of the other two.
- **`scopeAll`** — "notify for all series", not just followed ones.
- **`scopeFollowedOnly`** — "notify for followed series only".

`scopeAll` and `scopeFollowedOnly` are mutually exclusive **in the app's own UI**: turning one on
visually disables (locks) the other, and turning it back off unlocks it. This exclusivity is a UI
affordance only, enforced in the config screen's own state — there is no Android-level mechanism
(e.g. separate notification channels) backing it, precisely so the two can never disagree at the
OS level. At the point `NotificationResolver` decides whether to fire, the actual rule is a
straightforward union: notify if `enabled` is true, **and** either `scopeAll` is true or (the
series is in Following **and** `scopeFollowedOnly` is true). If the UI's mutual exclusion is ever
bypassed (e.g. both flags true through some future path), the effective behavior is simply "notify
for all series" — never a double notification, never undefined behavior.

Following membership itself still reuses the existing follow mechanism (`FollowedSeriesDao`, the
same store `FollowedSeriesBridgeModule` already exposes to RN) — no duplicated storage. All of
this resolution happens in Kotlin, at the point the event is about to become a native notification
— never duplicated or re-decided anywhere else.

This scope choice is app-internal only — it is not exposed as a separate Android notification
channel. Android's system Settings for this app show a single notification channel (on/off, per
Decision 10's bidirectional sync); which series qualify is a filtering decision this app makes
before ever calling Android's notification API, not something the OS has a concept of.

### 7. Native notification format

- **One notification per series, never per chapter.** A batch of N new chapters for the same
  series collapses into a single notification.
- **Title** = series name. **Body**: exactly 1 chapter with a known number →
  "Chapter X available"; exactly 1 chapter with no known number → "New chapter available"; N
  chapters → "N new chapters available" (never lists individual chapter numbers).
- **Small icon**: a new monochrome icon, added as part of this plan's implementation.
  **Large icon**: the series cover, resolved through the cover-loading mechanism the app already
  has for series art, loaded synchronously/blocking at the moment the notification is built — a
  failure to load it never blocks the notification, it's simply omitted.
- **Accent color** = the app's brand color.
- **Priority**: default (no heads-up / high-priority behavior).
- **Tap behavior**: exactly 1 chapter with a known `chapterId` → deep link straight into the
  reader for that chapter; otherwise → deep link to the series detail screen. `autoCancel = true`;
  opening it marks that history item as read.
- **Cross-series grouping**: a user-configurable toggle, default off. Off = each series'
  notification stays visible independently. On = all active notifications collapse into one
  expandable summary (Android `setGroup`/`groupSummary`).
- **`setWhen`** = the detection timestamp carried in the payload (`detectedAtMs`), never the local
  receipt time.
- **Deduplication**: the notification id is a deterministic hash of the `seriesId`. A new batch
  for the same series **replaces** the previous notification rather than stacking — the same id is
  reused as the history item's primary key, so the in-app history and the system tray never
  disagree about "is there a pending notification for this series".

### 8. Payload contract (see full table below)

The ntfy message body is a JSON array of events, one per series, published in a single batch —
batching multiple series in one message is supported from day one, not added later.

### 9. In-app notification history, with configurable retention

A full local history (Room, inside the new `:notifications` module): read/unread per item, "mark
all as read", delete item, unread-count badge. Retention is a user-adjustable preference
(`retentionDays`, stored via `:preferences` under its own domain, e.g. `notifications`) exposed on
the same config screen. A purge of anything older than `retentionDays` runs in the background every
time the app opens — fire-and-forget, in the startup/splash flow, same spirit as the existing
`BackgroundExecute` helper in `:tools` — and never blocks boot.

### 10. Android notification channel stays in sync both ways

If the user disables the app's notification channel directly from Android's system settings, the
in-app toggle reflects that (and vice versa) — the two are kept in sync rather than the app
silently continuing to "think" it's enabled while the OS is actually dropping every notification.

### 11. Publisher side is out of scope for this repository

Detecting a new chapter and publishing it to ntfy is explicitly **not** part of this plan or this
codebase — it's infrastructure the user runs separately. This plan only defines the contract that
side must speak. A ready-to-use prompt for implementing that publisher elsewhere is included at
the end of this document.

### 12. Deep links: React Navigation's own `linking` mechanism, not a hand-rolled parser

No deep link mechanism exists in this project today (Task 004 confirms this by inspection before
building anything). Since navigation here is React Navigation, not native Compose/Kotlin routing,
URL-to-screen resolution is React Navigation's own job: the `linking` prop
(`prefixes` + `config.screens`) on `NavigationContainer`, reusing the routes already registered in
`frontend/src/navigation/routes.ts` (`Routes.SERIES_DETAIL`, `Routes.READER`). No path parser is
reimplemented in Kotlin for that part.

Two concerns are kept deliberately separate: which entry points Android accepts (Kotlin/Manifest's
job) versus what React Navigation resolves (RN's job, knowing nothing about hosts or how many
entry points exist).

1. **Custom scheme, `mymangareader://`** — always on, registered statically in
   `AndroidManifest.xml`. Works unconditionally, with no external configuration — this is the
   public scheme the notification's own tap intent (Task 005) is built against.
2. **Optional http(s) App Link hosts** — up to 5, read from `local.properties` (already
   gitignored, never committed) at build time by a Gradle task (`generateDeepLinkHosts`) that
   writes the corresponding intent-filters into `AndroidManifest.xml` between two fixed, always-
   committed-empty markers. A companion `clearDeepLinkHosts` task resets that block after producing
   a local APK, so no developer's personal host ever lingers in a state that could be accidentally
   committed. This is Android build infrastructure, not a `:notifications` concern — it lives in
   `android/app/build.gradle.kts` / `android/app/src/main/AndroidManifest.xml` directly, reusable
   by any future feature that needs a real App Link.

Both layers cover the same two known path shapes — `/series/{id}` and
`/reader/{seriesId}/{chapterId}` — mapped to the same two existing routes. Android itself already
validates an incoming URI against a registered intent-filter before ever starting the app, so
`MainActivity` never needs to re-check which host it was — it only ever needs the path.

`MainActivity` normalizes **every** incoming URI, regardless of which of the two entry points
above produced it, into one single internal scheme — `deeplink://` — before React Navigation's own
`Linking` integration (`getInitialURL` for cold start, its internal listener for warm start) ever
reads the Intent. `linking.config.ts`'s `prefixes` is therefore always the constant
`['deeplink://']`, never a computed or duplicated list of hosts — RN never needs a way to learn
about hosts at all, and adding a future entry point (another host, another custom scheme) never
touches the RN side. This mechanism is built once, in Task 004, ahead of the notification display
task that first needs it to be end-to-end testable.

---

## Architecture

```
android/app/src/main/AndroidManifest.xml   # deep links: static mymangareader:// scheme +
                                            # GENERATED_DEEP_LINK_HOSTS markers (empty, committed)
android/app/build.gradle.kts               # generateDeepLinkHosts / clearDeepLinkHosts tasks
android/app/src/main/kotlin/com/mymangareader/
  DeepLinkNormalizer.kt                     # pure function: rewrites any incoming URI (custom
                                            # scheme or a configured http(s) host) into the single
                                            # internal deeplink:// scheme RN resolves — Android
                                            # already validated the host before this ever runs, so
                                            # this never re-checks it, only extracts the path
  MainActivity.kt                          # getIntent() override (+ onNewIntent → setIntent) —
                                            # the one place RN's own Linking module reads the URI,
                                            # so this is where normalization is guaranteed to apply

android/notifications/                     # :notifications (Layer 2)
  Notifications.kt                         # L2 facade: groups CRUD, history CRUD, retention purge
  NotificationsModule.kt                   # Hilt — registers every NotificationPlugin implementation
  NotificationResolver.kt                  # seriesId / exact-name fallback + Following + scope filter
                                            # (depends on :server for the series listing, :core for
                                            # FollowedSeriesDao, :preferences for the 3 scope flags —
                                            # lives here, not in android/app/, since none of that
                                            # requires the app module specifically)
  plugins/
    NotificationPlugin.kt                  # L2 interface: connect/disconnect/observe — lives
                                            # inside plugins/, mirroring ServerPlugin's own location
    ntfy/
      NtfyPlugin.kt                        # L1→L2 — real ntfy WebSocket client
      NtfyPayload.kt                       # L1 — raw JSON DTOs for the wire payload

android/core/src/main/kotlin/.../database/
  NotificationGroupEntity.kt / Dao.kt       # Room — group + priority-ordered URLs (mirrors
  NotificationUrlEntity.kt / Dao.kt         # ServerGroupEntity/ServerUrlEntity's own split)
  NotificationHistoryEntity.kt / Dao.kt     # Room — persisted history item
  migrations/Migration_14_15.kt             # forward (creates the 3 tables) + reverse pair,
                                            # same file, same convention as Migration_13_14.kt

android/app/src/main/kotlin/com/mymangareader/ (continued)
  NotificationConnectionService.kt         # Foreground service — owns the WebSocket lifecycle
  NotificationDisplay.kt                   # builds + posts the native Notification, PendingIntent
                                            # built against the public mymangareader:// scheme
  NotificationsBridgeModule.kt             # RN bridge — groups CRUD, toggle, history CRUD, badge
                                            # count (Tasks 006/007) — no deep-link concern in it
  NotificationChannelSync.kt               # bidirectional channel-enabled sync

frontend/src/
  App.tsx                                  # NavigationContainer's `linking` prop (deep links)
  navigation/
    linking.config.ts                      # prefixes is the constant ['deeplink://'] — never
                                            # references mymangareader:// or any host; no bridge
                                            # call, nothing dynamic
    RootNavigator.tsx                      # SERIES_DETAIL/READER routes consumed by `linking`
  shared/bridge/notifications.ts           # NotificationsBridge (typed)
  shared/services/notifications/
    notifications.services.ts              # NotificationsService — thin wrapper over the bridge
  screens/config/notifications/
    notifications.screen.tsx               # sub-screen: groups config + toggles + retention
    notifications.hooks.ts
    components/...
  screens/notifications/                    # in-app history screen
    notifications-history.screen.tsx
    notifications-history.hooks.ts
    components/...
```

**Data flow** (Kotlin hot path, no RN): WebSocket message → `NtfyPlugin` decodes →
`NotificationResolver` resolves `seriesId`/filters by Following+scope → `NotificationDisplay`
posts the native notification + writes a `NotificationHistoryEntity` row.

**Data flow** (RN, config + history reads): `NotificationsBridgeModule` → `NotificationsService` →
`notifications.hooks.ts` → the two screens above.

**Deep link on tap**: the pending intent is built against the public `mymangareader://` scheme
registered in Task 004 (`mymangareader://series/{seriesId}` or
`mymangareader://reader/{seriesId}/{chapterId}`). `MainActivity`'s `getIntent()` override
(`DeepLinkNormalizer.kt`) rewrites that into `deeplink://series/{seriesId}` (or
`deeplink://reader/{seriesId}/{chapterId}`) before React Navigation's own `Linking` integration
ever reads it — no new navigation mechanism, it reuses the existing route graph via React
Navigation's own `linking` resolution, which only ever sees the internal scheme.

**Deep link hosts require no RN-side awareness at all**: the optional http(s) App Link hosts
(Task 004) are read from `local.properties` at Gradle build time and only ever written into the
generated Manifest block. Android itself validates an incoming URI against that block before
`MainActivity` is ever started, and `MainActivity` then normalizes the URI the same way regardless
of which entry point produced it — so `linking.config.ts`'s `prefixes` is a plain constant,
`['deeplink://']`, with no bridge call, no dynamic list, and no second place where hosts need to be
known or kept in sync.

No new EventBus token is required for the RN side beyond an unread-count refresh signal, emitted
by the bridge whenever the badge count changes (native origin → `NativeEventEmitter`, mechanism 2
of the 3 already documented in `architecture.md`).

---

## Payload contract (publisher → this app)

A single ntfy message body is a JSON array. Each element:

| Field | Type | Required | Notes |
|---|---|---|---|
| `seriesId` | string | no | Kavita series id. Preferred — skips name resolution entirely. |
| `seriesName` | string | **yes** | Exact series name, used as fallback when `seriesId` is absent. Must match exactly one locally-synced series or the event is discarded. |
| `chapterIds` | string[] \| null | no | One entry per new chapter, same order as `chapterNumbers` if both present. |
| `chapterNumbers` | number[] \| null | no | Same length as `chapterIds` when both are present, or independently null. |
| `detectedAtMs` | number | **yes** | Epoch ms when the publisher detected the change — used as `setWhen`, never the receipt time. |

Example (batch of 2 series in one message):

```json
[
  { "seriesId": "42", "seriesName": "Example Series A", "chapterIds": ["101", "102"], "chapterNumbers": [12, 13], "detectedAtMs": 1735880000000 },
  { "seriesName": "Example Series B", "chapterIds": null, "chapterNumbers": null, "detectedAtMs": 1735880005000 }
]
```

---

## Notification body copy (reference)

| Case | Body text |
|---|---|
| 1 chapter, number known | "Chapter {n} available" |
| 1 chapter, number unknown | "New chapter available" |
| N chapters (N > 1) | "{n} new chapters available" |

Both languages the app already ships (pt-BR/en) get every string via the existing i18n system —
none of this text is ever hardcoded in a single language.

---

## Contract-change note

This plan introduces several contract-level surfaces: a new Kotlin module (`:notifications`), a
new bridge (`NotificationsBridgeModule`), an in-app history screen, a foreground-service lifecycle
with no RN counterpart in its hot path, and a new deep link mechanism (`NavigationContainer`'s
`linking` prop, a new manifest intent-filter surface, and a new Gradle task pair). Per this
project's process rule, none of this gets implemented until the plan itself — this README plus the
tasks below — is reviewed and approved. Task-level contract details (bridge method shapes, DAO
signatures, the exact `linking.config` shape) are still subject to the same rule at implementation
time if they diverge from what's written here.

---

## End-to-end verification checklist

- [ ] With the app fully closed, opening `mymangareader://series/123` opens the app directly on
      the series detail screen with `seriesId=123`.
- [ ] With the app fully closed, opening `mymangareader://reader/123/456` opens the app directly
      on the Reader with `seriesId=123`/`chapterId=456`.
- [ ] With no notification group configured, the foreground service never starts (feature gated
      by missing config, confirmed via a fresh install with an empty seed).
- [ ] Adding one URL to a group and enabling the toggle starts the service; the persistent
      "connected" notification appears.
- [ ] A single-series, single-chapter-with-number payload produces "Chapter X available".
- [ ] A single-series, no-number payload produces "New chapter available".
- [ ] A single-series, N-chapter payload produces "N new chapters available" (never lists numbers).
- [ ] A batch payload with 2 series in one message produces 2 separate notifications (grouping
      toggle off) or 1 summary (grouping toggle on).
- [ ] With scope set to "followed only", a series not in Following never produces a visible
      notification even if the payload arrives; with scope set to "all series", it does.
- [ ] In the config screen, turning "all series" on visually locks "followed only" off, and vice
      versa; turning either back off unlocks the other.
- [ ] A `seriesName`-only payload matching exactly one local series resolves correctly; a payload
      matching zero or more than one series is discarded and logged, never crashes.
- [ ] A 2nd batch for the same series replaces the 1st notification (same id), never stacks.
- [ ] Tapping a single-chapter notification opens the reader directly; tapping a multi-chapter one
      opens the series detail screen; both mark the corresponding history item as read.
- [ ] Disabling the Android notification channel from system settings reflects in the in-app
      toggle; re-enabling it there also reflects back.
- [ ] Lowering `retentionDays` and reopening the app purges history older than the new value,
      without blocking the splash screen.
- [ ] `make coverage` passes with the floor bumped for both Kotlin and JS if coverage rose.

---

## Publisher-side prompt (for a separate implementation session)

The following is ready to hand to a coding agent working in a **different** repository/environment
— the one that actually watches the Kavita server for new chapters:

> I need to implement a small service that watches a Kavita server for newly added chapters and
> publishes a notification to an ntfy topic whenever it detects one or more new chapters for a
> series.
>
> Requirements:
> - Poll (or otherwise watch) the Kavita server for newly added chapters, grouped by series.
> - When one or more new chapters are detected for a series (in a single detection cycle), build
>   one JSON object with these exact fields:
>   - `seriesId` (string, optional but strongly preferred) — the Kavita series id.
>   - `seriesName` (string, required) — the exact series name as it appears in Kavita. This is
>     used as a fallback match on the receiving side, so it must be character-for-character exact.
>   - `chapterIds` (array of string, optional) — one entry per new chapter.
>   - `chapterNumbers` (array of number, optional) — same order/length as `chapterIds` if both are
>     present; otherwise independently omittable.
>   - `detectedAtMs` (number, required) — epoch milliseconds of the detection moment.
> - If multiple series have new chapters in the same detection cycle, publish **one ntfy message**
>   whose body is a **JSON array** containing one object per series (not one message per series).
> - Publish that JSON array as the body of a message to a configured ntfy topic (host + topic
>   configurable, e.g. via environment variables or a config file — no hardcoded values).
> - Keep track of what has already been published (e.g. by chapter id or by a "last seen"
>   timestamp per series) so the same chapter is never announced twice across runs.
> - No authentication/user/device targeting is required on this side — this is a simple broadcast
>   to the topic; filtering by which app instance cares about which series happens entirely on the
>   receiving end.
>
> Please implement this as a standalone script/service (language and scheduling mechanism up to
> you), with clear configuration for the Kavita server URL/API key and the ntfy host/topic.
