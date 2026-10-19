# Screenshots

Anonymized screenshots of the app. Covers, titles, synopses, reader pages and novel text are replaced
with a default image and "Lorem ipsum"; IPs, tokens and domain names with placeholders.

Most of them are taken by `make screenshots` (see `scripts/screenshots/shots.json`), which fills in
that placeholder content itself. The ones listed under "Taken by hand" are older and not covered by it yet.

## Overview

| File | Description |
|------|-------------|
| [grid_preview.png](grid_preview.png) | All screens in a single grid (used in README) |

Regenerate the grid with `python3 scripts/build-screenshot-grid.py` after adding a screenshot —
the file list and its captions live in that script, not here.

## Home

| File | Description |
|------|-------------|
| [home.png](home.png) | Home — counters, continue reading, followed and recently updated series |

## Splash

| File | Description |
|------|-------------|
| [splash.png](splash.png) | Splash screen with app icon and loading animation |

## Library

| File | Description |
|------|-------------|
| [library-grid-recent.png](library-grid-recent.png) | Library in grid view, sorted by recently updated |
| [library-grid-alphabetical.png](library-grid-alphabetical.png) | Library in grid view, sorted alphabetically |
| [library-list-recent.png](library-list-recent.png) | Library in list view, sorted by recently updated |
| [library-list-alphabetical.png](library-list-alphabetical.png) | Library in list view, sorted alphabetically |
| [library-filter-modal.png](library-filter-modal.png) | Library — filter by reading status |

## Following

| File | Description |
|------|-------------|
| [following-grid-recent.png](following-grid-recent.png) | Following tab in grid view, sorted by recently updated |

## Series Detail

| File | Description |
|------|-------------|
| [series-detail-full.png](series-detail-full.png) | Series detail — cover, summary, tags, and start-reading button |
| [series-detail-scrolled.png](series-detail-scrolled.png) | Series detail — scrolled past the header, chapter list visible |
| [series-detail-options-menu.png](series-detail-options-menu.png) | Series detail — chapter list options menu |
| [series-detail-sort-modal.png](series-detail-sort-modal.png) | Series detail — per-series chapter sort override modal |
| [series-detail-range-modal.png](series-detail-range-modal.png) | Series detail — select a range of chapters |
| [series-novel-detail.png](series-novel-detail.png) | Series detail of a novel — author, other titles, continue-reading button |

## Reader

| File | Description |
|------|-------------|
| [reader-manga.png](reader-manga.png) | Manga reader — the page, no controls |
| [reader-manga-overlay.png](reader-manga-overlay.png) | Manga reader — controls shown: back to series, page counter, page rail, chapter and reading settings |
| [reader-manga-chapters.png](reader-manga-chapters.png) | Manga reader — chapter picker |
| [reader-manga-settings.png](reader-manga-settings.png) | Manga reader — reading settings modal |
| [reader-novel.png](reader-novel.png) | Novel reader — the text, no controls |
| [reader-novel-overlay.png](reader-novel-overlay.png) | Novel reader — controls shown: top bar and text size, appearance, chapter navigation |
| [reader-novel-appearance.png](reader-novel-appearance.png) | Novel reader — appearance modal: mode, theme, text size, font, line height |

## Search

| File | Description |
|------|-------------|
| [search-history.png](search-history.png) | Search with an empty query — recently opened series |
| [search-results.png](search-results.png) | Search results while typing, with the match count |

## Notifications

| File | Description |
|------|-------------|
| [notifications-list.png](notifications-list.png) | Notification list with the unread header |
| [notifications-selection-mode.png](notifications-selection-mode.png) | Multi-select mode active |
| [notifications-detail-modal.png](notifications-detail-modal.png) | Single notification detail modal |

## Settings

| File | Description |
|------|-------------|
| [config-main.png](config-main.png) | Settings root menu |
| [config-main-2.png](config-main-2.png) | Server configuration screen (older shot, kept by hand) |
| [config-reading-prefs.png](config-reading-prefs.png) | Reading preferences screen |
| [config-manga-page.png](config-manga-page.png) | Manga page settings — chapter sort and data source |
| [config-notifications.png](config-notifications.png) | Notification settings — toggles, history retention, notification servers |
| [config-server.png](config-server.png) | Kavita + BFF server configuration |

## Welcome / Setup

| File | Description |
|------|-------------|
| [config-welcome-empty.png](config-welcome-empty.png) | Welcome screen — no servers configured yet |
| [config-welcome-setup.png](config-welcome-setup.png) | Welcome screen — server setup in progress |
| [config-welcome.png](config-welcome.png) | Welcome screen — servers configured |

## Taken by hand

Not produced by `make screenshots` yet; they predate it and may be the old 1080x2501 size.
`series-detail-selection-mode.jpeg`, `settings-chapter-sort-fixed.jpeg`, `settings-chapter-sort-progress.jpeg`,
`notifications-selection-mode.png`, `notifications-detail-modal.png`, `config-main-2.png` and the three
`config-welcome*.png` (a fresh install is needed for those; the script does not wipe app data).
