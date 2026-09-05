# Task 005 — `NotificationDisplay` — native notification build/post/dedup + tap deep link

## Why after 001, 003, 004

Needs the history table (001) to write the persisted record and to compute the deterministic id,
needs a `ResolvedSeriesEvent` (003) as its input — this task only decides what to render and
how to dedup, it never re-resolves anything itself — and needs the `mymangareader://` scheme from
Task 004 to actually exist and resolve, since the tap `PendingIntent` built here is the first real
consumer of that deep link.

## What to do

1. `NotificationDisplay.kt`:
   - `notificationId(seriesId: String): Int` — deterministic stable hash (same series always
     produces the same id, so `NotificationManager.notify(id, ...)` naturally replaces the
     previous one).
   - `buildBody(chapterIds: List<String>?, chapterNumbers: List<Int>?): String` — implements the
     three cases from the README's copy table (1 numbered / 1 unnumbered / N chapters), sourced
     from string resources (translatable, both pt-BR and en already shipped by the app).
   - `post(resolved: ResolvedSeriesEvent)`:
     1. Loads the series cover synchronously for the large icon (reusing the existing
        cover-resolution mechanism already used elsewhere for series art) — a failure here never
        blocks the rest of `post()`, it just omits the large icon.
     2. Builds the `Notification` — small icon (new monochrome asset, added in this task), title
        = series name, body from `buildBody`, accent color = brand color, default priority,
        `setWhen(resolved.detectedAtMs)`, `autoCancel = true`.
     3. Tap `PendingIntent` — single chapter with known id → builds a
        `mymangareader://reader/{seriesId}/{chapterId}` intent; otherwise → builds a
        `mymangareader://series/{seriesId}` intent. Both reuse the custom-scheme deep link
        registered in Task 004, no new navigation shape.
     4. Cross-series grouping — if the toggle (`:preferences`, `notifications` domain) is on, sets
        `setGroup`/adds a `groupSummary` notification; off, posts standalone.
     5. Writes/replaces the `NotificationHistoryEntity` row (same id as the notification id).
   - `markReadOnOpen(seriesId: String)` — called from the intent's receiving Activity/handler,
     marks the corresponding history row read.
2. Add the monochrome small-icon drawable asset.

## Files to create

- `android/app/src/main/kotlin/com/mymangareader/NotificationDisplay.kt`
- Small-icon drawable resource(s) (density variants as needed).
- Matching test file — `buildBody` covers all 3 cases plus edge cases (empty lists, mismatched
  lengths defensively handled); `notificationId` is stable across calls for the same `seriesId`
  and differs across different ids; dedup test confirms a 2nd `post()` for the same series
  replaces rather than duplicates the history row.

## Acceptance criteria

- `buildBody` never lists individual chapter numbers for the N>1 case.
- Cover-load failure does not throw out of `post()`.
- Grouping toggle off/on both produce a valid, non-crashing notification structure in test.
- `koverVerify` passes; floor bumped if coverage rose.

## Project-pattern checklist

- All body text goes through the app's i18n string resources — nothing hardcoded in one language.
- Deep link reuses the `mymangareader://` scheme and route graph from Task 004 verbatim — no
  parallel navigation mechanism invented for notifications.
