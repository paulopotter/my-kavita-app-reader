# Plan 030 — Series Cache in Segments — Tasks

See `README.md` for the problem, the approved decisions and the contract-change gate.

| # | Task | Depends on | Status |
|---|------|------------|--------|
| [001](001-segment-chapters-in-cache.md) | Split `SerialDigest.chapters.list` into cached segments; reads reassemble an identical digest (internal, no contract change) | — | done |
| [002](002-paginate-chapters-on-series-screen.md) | Conditional, CONTRACT CHANGE: paginate chapters on the series screen (window offset/limit, light id list for the Reader) | 001 | pending (only if the page is still too heavy after Task 001 on device; needs new user approval before any code) |

## Suggested execution order

001 -> 002. Task 001 is shippable on its own. After it lands, the user tests on the device with the
3000-chapter manga and decides whether Task 002 is needed; if not, Task 002 is marked cancelled and
the plan is closed.
