# Task 002 — `book` capability

**Status:** pending

## Why

An EPUB is served by Kavita as HTML through the Book API, not as image pages. The app needs a
provider-neutral way to ask for book info, one page of HTML and the table of contents.

## What to do

- **`ServerPlugin`**: optional `book` capability (same pattern as `categories`) with
  `info(chapterId)`, `page(chapterId, page)` returning an HTML string, and `toc(chapterId)`.
  A provider without it answers empty.
- **Kavita plugin** (`android/server/.../plugins/kavita/`): implement it through
  `GET /api/Book/{chapterId}/book-info`, `/api/Book/{chapterId}/chapters` and
  `/api/Book/{chapterId}/book-page?page=N`. Provider names stay inside `plugins/kavita`.
- **Resource URLs** (images/fonts via `book-resources?file=...` + `apiKey`): rewriting them to
  carry auth belongs to the plugin. **UNVERIFIED** — needs an EPUB with images; do not claim it
  works before testing one.
- **`:server` facade** exposes the capability.
- **`ServerBridge`** (RN -> Kotlin): `getBookInfo` and `getBookPage`.
- **RN service** in `frontend/src/shared/services/` calling only `ServerBridge`.

## Contract-change gate

Approved: `ServerPlugin.book` and `ServerBridge.getBookInfo` / `getBookPage`. Anything else
(for example exposing the TOC to RN) needs a new approval.

## Tests (beside the code)

- Plugin: info, page and toc parsed from real-shaped responses; HTML returned untouched.
- A provider without the capability answers empty.
- Facade and bridge pass the arguments as one named object.
- RN service calls the bridge methods.
- `make coverage` must pass; bump the floors if they rose.

## Done when

- RN can fetch book info and an HTML page of a chapter of series 607.
- Coverage passes.

## Implemented (awaiting the device check)

Commits `e86d17d` (Kotlin) and `6f0cc1a` (RN). `ServerPlugin.Book` (`info`, `page`, `toc`) with
`PluginBookInfo` / `PluginBookTocItem`; `Server.book` (a provider without it fails with "does not
support reading books"); `KavitaBook` (`plugins/kavita/book`) over `/api/Book/{id}/book-info`,
`book-page?page=` and `chapters`, refusing a non-numeric chapter id; `ServerBridgeModule.getBookInfo /
getBookPage / getBookToc`; `BookService` (`shared/services/books`). Verified against the real server
by hand earlier (series 607). UNVERIFIED: how images/fonts of an EPUB are served (book-resources,
apiKey) — this book has none, so resource URL rewriting is not implemented yet.
