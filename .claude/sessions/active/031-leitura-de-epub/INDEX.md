# Plan 031 — EPUB Reading (novels) — Tasks

See `README.md` for the goal, the findings against the real server, the approved design and the
approved contract changes.

| # | Task | Depends on | Status |
|---|------|------------|--------|
| [001](001-loose-chapter-title-and-order.md) | Kavita plugin: title and order for "loose" chapters (sentinel `-100000`) from `titleName` and the volume number | — | implemented, awaiting device check |
| [002](002-book-capability.md) | `book` capability on `ServerPlugin` (info, page, toc), Kavita implementation, `:server` facade, `ServerBridge.getBookInfo/getBookPage`, RN service | — | implemented, awaiting device check |
| [003](003-webview-dependency-and-route.md) | `react-native-webview` dependency (new APK) and the `book-reader` route | — | implemented, awaiting device check |
| [004](004-book-reader-screen.md) | `screens/book-reader/`: WebView reader, scroll progress, prev/next, mark read, routing from the series screen | 001, 002, 003 | implemented, awaiting device check |

## Suggested execution order

001 -> 002 -> 003 -> 004. Tasks 001 and 002 are independent Kotlin work and each is shippable on
its own; 003 needs a new APK before 004 can be tested on the device. Resource URLs (images/fonts)
stay unverified until an EPUB with images is available.
