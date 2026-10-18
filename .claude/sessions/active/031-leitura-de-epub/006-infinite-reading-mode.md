# Task 006 — Infinite reading mode

**Status:** pending

## Why

Novels in Kavita are often one short chapter per file (series 607: 193 chapters of ~1200 words).
Stopping at the end of each chapter to tap "next" breaks the reading flow. The user wants to keep
scrolling and have the next chapter appear.

## What to do

- **Infinite is the default reading mode for books**; paged stays an option. The choice is made in
  the Task 005 sheet and stored in `BookPrefs` as `'infinite' | 'paged'`, global (not per book).
- **One WebView document that grows.** Chapters are appended below as the reader nears the end.
  - The document script posts `{ type: 'needNext' }` when ~1.5 screens from the end.
  - RN fetches the next chapter's page(s) through `BookService` and injects them with
    `injectJavaScript` as `<section data-chapter-id="...">`.
  - Multi-page chapters append their pages in order.
- **Chapter in view.** The script reports which chapter is in view. RN uses it to:
  - update progress;
  - save per-chapter scroll progress (`ReadingProgressManager`);
  - mark each chapter read once its end has passed (existing `ChapterTool.mark.read`);
  - make the title/number shown by the bars follow the chapter in view.
- **Previous chapter stays a button** (footer); only "next" is automatic.
- **No trimming of old sections in v1.**
- `BookDocumentTool` / `parseMessage` are extended with the new message types (`needNext`, the
  chapter-in-view report). Same CSP/nonce lockdown: injected content goes through the nonce'd
  script, no new origins, no inline handlers.
- Paged mode keeps today's behaviour (Task 004).
- All UI text is translatable; every design value comes from a token.

## Depends on

Task 005 (the reading-mode control and the `BookPrefs` field live in the appearance sheet).

## Contract-change gate

Approved by the user on 2026-10-18: the `needNext` and chapter-in-view WebView messages, the
`BookPrefs` reading-mode field, and the `BookDocumentTool`/`parseMessage` extension. Any other
contract change needs a new approval in text before any code.

## Tests (beside the code)

- `parseMessage`: accepts the new message types, rejects malformed ones.
- Hook (infinite): `needNext` fetches and injects the next chapter; multi-page chapters append in
  order; no double fetch while one is in flight; stops at the last chapter of the series.
- Chapter-in-view report updates progress, the bars' title/number, and saves per-chapter scroll.
- A chapter is marked read only after its end has passed, and only once.
- Paged mode is unchanged.
- `make coverage` must pass; bump the floor if it rose.

## Done when

- On the device, the user reads several consecutive chapters of series 607 without leaving the
  screen, with correct progress, read marks and bar titles.
- Switching to paged in the sheet restores the Task 004 behaviour.
- Coverage passes.
