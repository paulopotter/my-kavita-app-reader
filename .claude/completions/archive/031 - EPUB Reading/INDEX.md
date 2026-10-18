# Plan 031 — EPUB Reading (novels) — Tasks

See `README.md` for the goal, the findings against the real server, the approved design and the
approved contract changes.

| # | Task | Depends on | Status |
|---|------|------------|--------|
| [001](001-loose-chapter-title-and-order.md) | Kavita plugin: title and order for "loose" chapters (sentinel `-100000`) from `titleName` and the volume number | — | implemented, awaiting device check |
| [002](002-book-capability.md) | `book` capability on `ServerPlugin` (info, page, toc), Kavita implementation, `:server` facade, `ServerBridge.getBookInfo/getBookPage`, RN service | — | implemented, awaiting device check |
| [003](003-webview-dependency-and-route.md) | `react-native-webview` dependency (new APK) and the `book-reader` route | — | implemented, awaiting device check |
| [004](004-book-reader-screen.md) | `screens/book-reader/`: WebView reader, scroll progress, prev/next, mark read, routing from the series screen | 001, 002, 003 | implemented, awaiting device check |
| [005](005-reader-appearance.md) | Reader appearance: "Aa" sheet in the footer (theme, font, size, line height, margins, justification, reading mode), reader-only palettes in `shared/theme/reading-themes.ts` with a 7:1 test, all persisted in `BookPrefs` | 004 | implemented, awaiting device check |
| [006](006-infinite-reading-mode.md) | Infinite reading mode (default for books): one growing WebView document, next chapters injected near the end, per-chapter progress and mark read | 004, 005 | implemented, awaiting device check |

## Suggested execution order

001 -> 002 -> 003 -> 004 -> 005 -> 006. Tasks 001 and 002 are independent Kotlin work and each is shippable on
its own; 003 needs a new APK before 004 can be tested on the device. Resource URLs (images/fonts)
stay unverified until an EPUB with images is available.
Task 005 comes before 006: the reading-mode control lives in the 005 sheet and 006 reads the
`BookPrefs` field it adds. Both are pure OTA bundle work (no new native dependency).
