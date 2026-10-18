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
