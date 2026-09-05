# Task 005 — `NotificationDisplay` — native notification build/post/dedup, foreground vs. in-app, tap deep link

## Why after 001, 003, 004

Needs the history table (001) to write the persisted record and to compute the deterministic id,
needs a `ResolvedSeriesEvent` (003) as its input — this task only decides what to render and
how to dedup, it never re-resolves anything itself — and needs the `mymangareader://` scheme from
Task 004 to actually exist and resolve, since the tap `PendingIntent` built here is the first real
consumer of that deep link.

## What to do

**Foreground vs. in-app (closed with the user, extends the original scope)**: a visible
system-tray notification only makes sense while the app is not already the thing the user is
looking at. `post()` first checks `AppForegroundState.isForeground` (new — see below) before doing
anything else:
- **Foreground** → no system-tray notification. History is still written (so the in-app history
  screen, Task 009, reflects it) and `NotificationsBridgeModule.notifyNewNotificationReceived()`
  fires (a minimal RN bridge event — no `@ReactMethod`/CRUD yet, no banner UI yet; just the
  existence of the signal for a future in-app banner to react to).
- **Background/closed** → the system-tray notification described below.

1. `AppForegroundState.kt` (new, `android/app/`) — `StateFlow<Boolean>`, backed by
   `ProcessLifecycleOwner` (registered once in `MainApplication.onCreate()`). Deliberately separate
   from `MainActivity`'s own `last_stopped_at_ms` (the OTA stable-boot gate) — different question,
   different lifetime, not reused for a second meaning.
2. `NotificationsBridgeModule.kt` (new, `android/app/`) — minimal for this task: registered in
   `AppReactPackage` (same static-instance idiom as `OtaEventBridge`), only capable of emitting
   `newNotificationReceived`. Task 006/007 add its real `@ReactMethod`s (groups/toggle/history CRUD)
   to this same module — it is not recreated later.
3. `NotificationDisplay.kt`:
   - `notificationId(seriesId: String): Int` — deterministic stable hash (same series always
     produces the same id, so `NotificationManager.notify(id, ...)` naturally replaces the
     previous one). `notificationHistoryId(seriesId): String` — the same value, as the history
     row's String PK.
   - `buildBody(context, chapterIds, chapterNumbers): String` — implements the three cases from
     the README's copy table (1 numbered / 1 unnumbered / N chapters), sourced from string
     resources (`values/strings.xml` pt-BR, `values-en/strings.xml` en — both already shipped).
   - `post(resolved: ResolvedSeriesEvent)`:
     1. Always writes/replaces the `NotificationHistoryEntity` row first (same id as the
        notification id) — this happens whether or not a system-tray notification follows.
     2. If foreground, emits the bridge event and returns — no system-tray notification.
     3. Otherwise: loads the series cover synchronously for the large icon via `Server.serial(id)
        .getCoverImage()` + Coil (`context.imageLoader.execute`) — a failure here never blocks the
        rest of `post()`, it just omits the large icon.
     4. Builds the `Notification` — reuses the pre-existing `ic_notification` monochrome vector
        drawable (already in the repo, no new asset needed), title = series name, body from
        `buildBody`, accent color = brand color (`#1A1A2E`), default priority,
        `setWhen(resolved.detectedAtMs)`, `autoCancel = true`.
     5. Tap `PendingIntent` — single chapter with known id → builds a
        `mymangareader://reader/{seriesId}/{chapterId}` intent; otherwise → builds a
        `mymangareader://series/{seriesId}` intent. Both go through `MainActivity`, whose
        `getIntent()` override (Task 004) normalizes them to `deeplink://` before RN ever sees it —
        no parallel navigation mechanism.
     6. Cross-series grouping — if the toggle (`:preferences`, key `groupAcrossSeries`) is on, sets
        `setGroup`/posts a `groupSummary` notification; off, posts standalone.
   - `markReadOnOpen(seriesId: String)` — exists and is tested, but has no real caller yet (no RN
     UI exists to react to a tap landing); wiring it up is deferred to whichever of Task 008/009
     first has a concrete "user opened this from a notification" moment to hook into.

## Files to create

- `android/app/src/main/kotlin/com/mymangareader/AppForegroundState.kt` (+ test)
- `android/app/src/main/kotlin/com/mymangareader/NotificationsBridgeModule.kt` (minimal — see
  above; Task 006/007 grow it, never replace it)
- `android/app/src/main/kotlin/com/mymangareader/NotificationDisplay.kt` (+ test)
- No new drawable — `ic_notification.xml` already exists in the repo.
- `android/app/src/main/res/values/strings.xml` / `values-en/strings.xml` — the 3 body-copy strings.

## Files to modify

- `android/app/src/main/kotlin/com/mymangareader/MainApplication.kt` (`AppForegroundState.register()`
  call in `onCreate()`)
- `android/app/src/main/kotlin/com/mymangareader/AppReactPackage.kt` (registers
  `NotificationsBridgeModule`)
- `android/app/build.gradle.kts` (`androidx.lifecycle:lifecycle-process` dependency,
  `:notifications` project dependency, `testOptions.unitTests.isIncludeAndroidResources = true` —
  needed for Robolectric to resolve `Context.getString` against real string resources)
- `android/gradle/libs.versions.toml` (`lifecycleProcess` version + `androidx-lifecycle-process`
  library entry)

## Acceptance criteria

- `buildBody` never lists individual chapter numbers for the N>1 case.
- `notificationId`/`notificationHistoryId` are stable for the same `seriesId`, differ across ids.
- `AppForegroundState.isForeground` flips on `onStart`/`onStop`.
- `koverVerify` passes (note: `:app` is not part of the merged Kover report/floor — its own test
  suite passing is what matters here, not a floor bump).

## Project-pattern checklist

- All body text goes through the app's i18n string resources — nothing hardcoded in one language.
- Deep link reuses the `mymangareader://` scheme (normalized to `deeplink://` by `MainActivity`,
  Task 004) verbatim — no parallel navigation mechanism invented for notifications.
- `post()`'s own end-to-end behavior (Server/Notifications/Preferences wired together for a
  realistic event) is intentionally left to Task 006's own test — see that task's updated note.
