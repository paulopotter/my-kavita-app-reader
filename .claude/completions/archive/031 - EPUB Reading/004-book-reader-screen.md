# Task 004 — `screens/book-reader/`

**Status:** pending

## Why

This is the actual reading experience for novels.

## What to do

- New screen `frontend/src/screens/book-reader/` with its own hooks and components. Anything a
  second screen needs is promoted to `shared/`; a screen never imports from another screen.
- A WebView renders the HTML fragment (Task 002) wrapped in a document styled with theme tokens:
  colours, adjustable font size and family, line height.
- Saves the scroll position through `ReadingProgressManager` and restores it on open.
- Previous/next chapter buttons using the series' canonical order.
- Marks the chapter read at the end through the existing `ChapterService.status.set`.
- Multi-page EPUBs (`book-info` pages > 1): one page at a time with prev/next.
- **Series screen**: opening a chapter whose `pages.fileFormat` is `"epub"` navigates to
  `book-reader` instead of the image reader.
- All UI text is translatable; every design value comes from a token.

## Out of scope (v1)

TOC UI, annotations/highlights, server-side progress (`bookScrollId`), PDF.

## Contract-change gate

Approved: the `book-reader` route. Any other contract change (hook signature, event shape,
digest) needs a new approval in text before any code.

## Tests (beside the code)

- Hook: loads info and page, restores and saves scroll, marks read at the end, prev/next.
- Series screen routes `epub` chapters to `book-reader` and others to the image reader.
- Multi-page navigation.
- `make coverage` must pass; bump the floor if it rose.

## Done when

- The user reads a chapter of series 607 on the device end to end, including progress and mark
  as read.
- Coverage passes.

## Implemented (awaiting the device check)

Commits `dd2b915` (order tool promoted to `shared/tools/chapters`), `59832cd` (`BookDocumentTool`,
`BookPrefs`) and `6a7317e` (the screen, the hook, the entry, the series hint, the strings).

`screens/book-reader/`: `useBookReader` (loads info + saved position + page, resumes where the reader
left, prev/next chapter by the series order, page turns for multi-page books, saves scroll progress
and the server page, marks the chapter read once at the end of the last page unless already read, text
size steps persisted) and a dumb screen with a locked-down WebView (`originWhitelist about:*`, no DOM
storage or file access, CSP allowing only the document's own nonce script, link clicks swallowed).
Top bar and footer are the screen's own components. 1746 JS tests pass.

Still open / unverified on the device: how it feels (margins, line height, font steps), whether the
saved scroll position restores correctly, and images/fonts of an EPUB that has them (the only novel
available has none; `book-resources` URLs are not rewritten yet).
