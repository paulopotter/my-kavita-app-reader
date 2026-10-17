# Plan 029 — Reader Zoom

## Context

The reader (`screens/reader/`) renders pages in a native Compose `LazyColumn`
(`ReaderPageList.kt`). Today there is no way to magnify a page: small text and detailed art
cannot be inspected. This plan adds zoom to the reader.

It takes over the zoom half of backlog item 026 ("Reading modes and zoom"). Backlog 026 keeps only
the paginated and horizontal modes and points here for zoom. Its `Depends on` stays 007.

## Decisions (approved by the user on 2026-10-17)

1. **Only webtoon exists as a real mode, so zoom applies to it.** The `horizontal` and `paginated`
   modes are still stubs (backlog 026). When they are built they will need their own zoom
   decision; that is out of scope here.
2. **Gesture.**
   - Double-tap on a page toggles 1x <-> 2x.
   - Pinch zooms between 1x and 4x. The maximum is a tunable constant, not a contract.
3. **Zoom is bound to ONE page** — the page the user touched.
   - While zoomed, a drag pans on both axes, clamped to that page's bounds.
   - The list's own scroll is locked while zoomed.
   - A single tap still toggles the overlay.
   - To reach another page the user must leave zoom first (double-tap, or pinch back to 1x).
4. **No change to** `ReaderWindow`, `moveFocus`, the reducer or navigation. Zoom is a rendering
   concern of one page; it never moves focus.

## Contract changes (approved)

Both are public contracts of the native reader view, approved in text before any code.

1. **New prop on RN `ReaderPageListView` -> native: `zoomEnabled: boolean`.** A switch so RN can
   turn zoom off. Kotlin makes no business decision (architecture.md, "Reader Screen — the one
   native-rendering exception": RN decides, Kotlin draws).
2. **New Kotlin -> RN event `onZoomChanged({ zoomed: boolean })`.** It originates from the user's
   gesture, so it has a native origin and belongs to mechanism 2 of "The 3 communication
   mechanisms" (architecture.md): Kotlin observing something on its own, never a response to an RN
   request. RN uses it to hide the overlay and the progress bar while zoomed.

## Risk

Very tall pages are decoded downsampled by `SafeBitmapDecoder`
(`android/features/src/main/kotlin/com/mymangareader/features/kavita/reader/ui/SafeBitmapDecoder.kt`)
to stay under the GPU texture limit. Magnifying the already-reduced bitmap may look blurry. Task 001
deliberately accepts that, so the user can judge it on a real device; Task 002 exists only if that
judgment says it is too blurry.

## Slices

- **Task 001 (slice 1)** — gestures plus scale/translation applied to the existing bitmap.
- **Task 002 (slice 2, conditional)** — re-decode the visible region at full resolution while
  zoomed. Built **only if** the user judges slice 1 too blurry on the device; otherwise it is
  cancelled and the plan closes after Task 001.

## Non-goals

- Zoom in the `horizontal` / `paginated` modes (backlog 026).
- A mode selector in the reader UI (backlog 026).
- Persisting a zoom level across pages, chapters or sessions.
- Any change to `ReaderWindow`, `moveFocus`, the reducer or navigation.
