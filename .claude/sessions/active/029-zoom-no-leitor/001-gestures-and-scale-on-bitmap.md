# Task 001 — Gestures and scale on the existing bitmap

**Status:** done

## Why

This is the whole user-visible feature. It uses the bitmap the reader already decodes, so it needs
no change to loading or caching, and it lets the user judge the blur risk (README) on a real
device before any decoding work is done.

## What to do

### Kotlin (Compose)

In `android/features/src/main/kotlin/com/mymangareader/features/kavita/reader/ui/ReaderPageList.kt`:

- Double-tap on a page toggles 1x <-> 2x.
- Pinch zooms between 1x and 4x (the maximum is a named, tunable constant).
- Zoom state is bound to **one page** — the one touched.
- While zoomed:
  - a drag pans on both axes, clamped to that page's bounds;
  - the `LazyColumn` scroll is locked;
  - a single tap still reports `onTap` so RN can toggle the overlay.
- Leaving zoom (double-tap or pinch back to 1x) resets scale and translation and unlocks the list.
- Scale/translation are applied to the existing bitmap (no re-decode).
- Reads `zoomEnabled`; when false, none of the above is active and the list behaves as today.
- Emits `onZoomChanged({ zoomed })` only when the zoomed/not-zoomed state actually flips, driven by
  the user's gesture.

### Native bridge

In `android/app/src/main/kotlin/com/mymangareader/`:

- `ReaderPageListViewManager.kt`: new prop `zoomEnabled: boolean`; register the
  `onZoomChanged` direct event.
- `ReaderPageListView.kt`: pass the prop into the Composable and forward the callback as an event.

### RN

- `frontend/src/screens/reader/components/reader-page-list-view/reader-page-list-view.component.tsx`:
  wrapper accepts `zoomEnabled` and `onZoomChanged`, forwarding the event payload.
- `frontend/src/screens/reader/reader.screen.tsx` (and its hook, as the data-flow rule requires):
  hide the overlay and the progress bar while zoomed; show them again on leaving zoom.
- RN decides whether zoom is enabled and passes `zoomEnabled`; Kotlin makes no business decision.

## Contract-change gate

Both contracts (`zoomEnabled` prop, `onZoomChanged` event) were described and approved by the user
on 2026-10-17. No other contract may change; in particular `ReaderWindow`, `moveFocus`, the reducer
and navigation stay untouched. Anything beyond the two approved contracts needs a new approval.

## Tests (beside the code)

- Kotlin: `android/features/src/test/kotlin/com/mymangareader/features/kavita/reader/ui/ReaderPageListTest.kt`
  (or a new test beside any extracted pure zoom/clamp logic) — scale limits, pan clamping to page
  bounds, 1x <-> 2x toggle, `onZoomChanged` emitted only on state flips, nothing active when
  `zoomEnabled` is false.
- Jest: `frontend/src/screens/reader/components/reader-page-list-view/reader-page-list-view.tests.tsx`
  and the reader screen/hook tests — prop forwarding, event forwarding, overlay and progress bar
  hidden while zoomed.
- `make coverage` must pass; bump the floor if it rose.

## Done when

- Zoom works on the device in webtoon mode with the gestures above.
- The user has tried it and given a verdict on blur (this decides Task 002).
- Coverage passes.

## Result

Implemented as planned, with these concrete choices:

- **Model**: `PageZoom.kt` holds the pure math (scale 1x-4x, zoom around the fingers, pan clamped to
  the page, a page shorter than the viewport stays centered, where the list resumes on exit) and
  `PageZoomGestureTracker` (the frame-by-frame rules: two fingers or, while zoomed, one finger past
  touch slop). `PageZoomGestures.kt` is the thin Compose shell (Initial-pass detector) plus
  `ZoomedPageLayer`, which draws the zoomed page alone over the list through a graphics-layer
  transform. `ReaderPageList.kt` locks `userScrollEnabled` while zoomed and, on exit, scrolls the
  list to where the pan ended.
- **Bridge**: `zoomEnabled` prop and `onZoomChanged` event in `ReaderPageListViewManager.kt` /
  `ReaderPageListView.kt`.
- **RN**: wrapper forwards both; reducer gets `zoomed` + `SET_ZOOMED` (entering zoom tucks the overlay
  away, a remounted native list resets it); the thin progress bar is hidden while zoomed.
- **Deviation**: `zoomEnabled` is NOT tied to `readingMode === 'webtoon'`. The first device build did
  that and zoom never turned on (the native side received `zoomEnabled=false`); `readingMode` is a
  stored preference for modes that are still stubs, and this native list is the only renderer. The
  screen now passes `zoomEnabled` unconditionally.
- **Kept on purpose**: a few unconditional `PageZoom` logcat lines (per gesture, never per frame).
- **Versions**: APK `1.7.0` -> `1.8.0-rc3`, bundle `1.8.0` -> `1.9.0-rc3` (rc bump is local build
  state, not committed).
- **Tests**: `PageZoomTest` (math, helpers, tracker) and `PageZoomGesturesTest` (Robolectric, real
  list: double-tap in/out, pinch out/in, one-finger pan, zoom off, header ignored); Jest for the
  wrapper and reducer. `make coverage` passes, Kotlin 85.2% (floor raised from 84 to 85).
- **Not done**: the blur verdict that decides Task 002 is still open — the user confirmed the zoom
  works on the device but did not comment on sharpness.

