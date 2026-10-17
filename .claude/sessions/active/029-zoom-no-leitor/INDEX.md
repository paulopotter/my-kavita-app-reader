# Plan 029 — Reader Zoom — Tasks

See `README.md` for the approved design, the contract changes, and the blur risk.

| # | Task | Depends on | Status |
|---|------|------------|--------|
| [001](001-gestures-and-scale-on-bitmap.md) | Gestures + scale/translation on the existing bitmap, `zoomEnabled` prop, `onZoomChanged` event, overlay hidden while zoomed | — | done |
| [002](002-full-resolution-region-decode.md) | Conditional: re-decode the visible region at full resolution while zoomed (`BitmapRegionDecoder`) | 001 | pending (only if the user judges Task 001 too blurry on device) |

## Suggested execution order

001 -> 002. Task 001 is shippable on its own. After it lands, the user tests on the device and
decides whether Task 002 is needed; if not, Task 002 is marked cancelled and the plan is closed.
