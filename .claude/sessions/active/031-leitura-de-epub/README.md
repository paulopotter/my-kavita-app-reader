# Plan 031 — EPUB Reading (novels)

## Context

The app reads image chapters only. Kavita also serves novels (EPUB). The real case that drives
this plan: series 607 "Leveling with gods", in the Kavita "Novels" library (library type 4).
Its format is EPUB (Kavita `MangaFormat` 3); it has 193 volumes, and each volume is 1 chapter =
1 EPUB file with 1 page (~1200 words).

Today the series list and the series page already work (the 193 chapters build fine), but
opening a chapter fails: the reader requests image pages, and an EPUB is only served as HTML.

## Findings against the real server (read-only)

- The Book API works with the same Bearer token as the rest of the app:
  - `GET /api/Book/{chapterId}/book-info` — `bookTitle`, `pages`, ...
  - `GET /api/Book/{chapterId}/chapters` — table of contents.
  - `GET /api/Book/{chapterId}/book-page?page=N` — returns an HTML **fragment** (`text/plain`,
    ~9 KB, CSS scoped to `.book-content`; this particular book has no images).
- **UNVERIFIED:** how images and fonts are served (`book-resources?file=...` with `apiKey`),
  because this book has none. Anything about resource URLs needs an EPUB with images before it is
  considered done.
- The Kavita plugin flattens volumes into chapters and drops the volume number, so all 193
  chapters arrive with number `-100000` and title `-100000` (the Kavita sentinel for a "loose"
  chapter). Kavita has `titleName` on the chapter ("Capítulo 1") and the volume `name`
  ("1", "1.2", "4"...) that can be used for ordering.

## Decisions (approved by the user on 2026-10-18)

1. **Task 001 — title/order for loose chapters.** When the chapter number is the sentinel
   `-100000`, the Kavita plugin (`KavitaServerPlugin.toPluginChapter` and the chapter DTO) uses
   `titleName` for the title and the volume number for ordering / `decimalNumber`. Changes field
   **values** only, not the digest shape.
2. **Task 002 — `book` capability.** Optional capability on `ServerPlugin` (like `categories`):
   `info(chapterId)`, `page(chapterId, page)` -> HTML string, `toc(chapterId)`. The Kavita plugin
   implements it through `/api/Book/*`; a provider without it answers empty. The `:server` facade
   exposes it; `ServerBridge` (RN -> Kotlin) gets `getBookInfo` and `getBookPage`; an RN service
   in `shared/services`. Provider names live only inside `plugins/kavita`. Rewriting resource
   URLs (images/fonts) so they carry auth belongs to the plugin and is unverified.
3. **Task 003 — dependency and route.** `react-native-webview` is a native dependency, so it
   needs a **new APK**. Add `implementation(project(":react-native-webview"))` to
   `android/app/build.gradle.kts` next to `react-native-screens`, and
   `rm -rf android/build/generated/autolinking` (see `.claude/docs/mistakes.md` #6). Add the new
   route `book-reader`.
4. **Task 004 — `screens/book-reader/`.** Own hooks/components; anything shared is promoted to
   `shared/`. A WebView renders the HTML fragment wrapped in a document styled with theme tokens
   (colours, adjustable font size/family, line height). It saves the scroll position
   (`ReadingProgressManager`), has prev/next chapter buttons using the series' canonical order,
   and marks the chapter read at the end through the existing `ChapterService.status.set`.
   Opening a chapter whose `pages.fileFormat` is `"epub"` navigates to `book-reader` instead of
   the image reader (series screen). Multi-page EPUBs (`book-info` pages > 1): one page at a time
   with prev/next.
5. **Task 005 — reader appearance (approved 2026-10-18, after the rc9 device test).** An "Aa"
   button in the book reader's footer opens a sheet (A↓ A↑ stay in the footer) with theme, font
   family, text size, line height, margins, justification and reading mode. Everything is
   persisted in `BookPrefs`. Reader themes are their own fixed palette in
   `shared/theme/reading-themes.ts`, independent of the app's 12 identities, with a Jest test
   enforcing body text and links >= 7:1 (presets: app, Paper, Sepia, Gray, Green, Dark, Night,
   Black/OLED, High contrast). Fonts: system serif, sans-serif, monospace. `BookDocumentTool`
   gets the new inputs.
6. **Task 006 — infinite reading mode (approved 2026-10-18).** Default for books; paged stays an
   option chosen in the Task 005 sheet and stored in `BookPrefs` as `'infinite' | 'paged'`
   (global). One WebView document that grows: the script posts `needNext` ~1.5 screens from the
   end, RN fetches the next chapter through `BookService` and injects it as
   `<section data-chapter-id>`; the script reports the chapter in view so RN updates progress,
   saves per-chapter scroll and marks each chapter read once its end has passed. Previous
   chapter stays a button; no trimming of old sections in v1; same CSP/nonce lockdown.

## Follow-ups already done in Tasks 001-004 (after the user's device feedback)

Bars closed on open; top bar without the chapter title (the page already opens with it); taller
footer with previous chapter left / next chapter right / text size centre and the bottom inset;
thin progress bar promoted to `shared/components/thin-progress-bar`; selected-chapter row no
longer dimmed; selection bar respects the bottom inset (`useBottomInset`). Commits `97c0ab8`,
`4ddc8d3`, `e84d5a3`, `2791a33`.

## Contract changes (approved)

- `ServerPlugin.book` capability and `ServerBridge.getBookInfo` / `getBookPage`.
- New route `book-reader` (in practice, `ReaderEntry` on the existing reader route; see Task 003).
- Task 005: the new `BookPrefs` fields, the `reading-themes.ts` tokens and the `BookDocumentTool`
  inputs.
- Task 006: the `needNext` and chapter-in-view WebView messages, the `BookPrefs` reading-mode
  field and the `BookDocumentTool`/`parseMessage` extension.
- Title/order **values** for loose chapters (no change to the digest shape).

Anything else is a contract change that needs a **new approval in text before any code**.

## Out of v1

- Table-of-contents UI.
- Bundled reading fonts (e.g. Literata) and trimming of old sections in infinite mode.
- Annotations / highlights.
- Server-side progress (`bookScrollId`).
- PDF (later, via `extractPdf` into the image reader so it inherits zoom).

## Relations

- **Plan 029 (reader zoom)** — PDF, when it comes, is routed into the image reader to inherit zoom.
- **Plan 030 (series cache in segments)** — the 193-chapter novel is small; no dependency, but
  both touch what the series screen receives, so keep the digest shape stable.
- **Backlog 026 (reading modes and zoom)** — separate; the EPUB reader is not a reading mode of
  the image reader.

## Non-goals

- Library multi-library listing already works at the list level (`all-v2` returns every library).
  A **library filter / badge for novels is NOT part of this plan.**
- Changing the `SerialDigest` / `ChapterDigest` shape.
- Anything in the "Out of v1" list above.
