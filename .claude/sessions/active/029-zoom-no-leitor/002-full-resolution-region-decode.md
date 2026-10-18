# Task 002 — Full-resolution region decode while zoomed

**Status:** on_hold (2026-10-18) — conditional; the user parked it, not to be touched until they ask

## Condition

Built **only if** the user judges Task 001 too blurry on the device. If the user is satisfied with
Task 001, this task is marked cancelled and the plan closes without it.

## Why

`SafeBitmapDecoder` decodes very tall pages downsampled to stay under the GPU texture limit.
Magnifying that reduced bitmap (Task 001) can look blurry.

## What to do

- While a page is zoomed, re-decode the **visible region** of that page at full resolution with
  `BitmapRegionDecoder` and draw it over the downsampled bitmap, refreshing it as the user pans.
- Touches `android/features/src/main/kotlin/com/mymangareader/features/kavita/reader/ui/SafeBitmapDecoder.kt`
  (and whatever Compose code draws the region in `ReaderPageList.kt`).
- Release the region bitmap when leaving zoom; keep memory bounded.
- Zoom state and the `zoomEnabled` / `onZoomChanged` contracts from Task 001 do not change. If the
  work turns out to need any other public contract change, stop and ask for approval first.

## Tests (beside the code)

Kotlin tests for region computation (visible rect -> source rect), memory release on leaving zoom,
and fallback to the Task 001 behaviour when region decoding fails. `make coverage` must pass.
