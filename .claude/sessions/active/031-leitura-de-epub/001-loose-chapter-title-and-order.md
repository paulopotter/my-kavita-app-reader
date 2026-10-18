# Task 001 — Title and order for loose chapters

**Status:** in progress

## Why

For a Kavita novel the plugin flattens volumes into chapters and drops the volume number, so all
193 chapters of series 607 arrive with number `-100000` and title `-100000` (Kavita's sentinel for
a "loose" chapter). The list is unreadable and cannot be ordered.

## What to do

In `android/server/src/main/kotlin/com/mymangareader/server/plugins/kavita/`
(`KavitaServerPlugin.toPluginChapter` and the chapter DTO in `chapter/KavitaChapter.kt`):

- Read `titleName` (for example "Capítulo 1") from the Kavita chapter and the volume number/`name`
  ("1", "1.2", "4"...) from its volume.
- When the chapter number is the sentinel `-100000`:
  - the **title** comes from `titleName`;
  - the **order** and `decimalNumber` come from the volume number.
- Any other chapter is unchanged.
- This changes field **values** only; the digest shape stays the same.

## Contract-change gate

Approved as "title/order values for loose chapters". If it turns out to need a new field or a
different digest shape, stop and ask the user before editing code.

## Tests (beside the code)

- A loose chapter with `titleName` gets that title and orders by volume number.
- Volume names with decimals ("1.2") order correctly between "1" and "2".
- A normal numbered chapter is untouched.
- A loose chapter without `titleName` or without a usable volume number has a defined fallback.
- `make coverage` must pass; bump the floor if it rose.

## Done when

- Series 607 shows 193 chapters titled "Capítulo N" in volume order.
- Coverage passes.

## Implemented (awaiting the device check)

Commit `556275e`. `KavitaVolumeDto` now carries `name` and `minNumber`; `KavitaChapterDto.toPluginChapter`
takes the volume. A chapter is "loose" when it is not special and its `sortOrder` is `-100000` (or its
number is `"-100000"`). When the holding volume has a real number (`minNumber > 0`) the chapter gets
`decimalNumber = minNumber`, `number = "1.2"/"4"` and `title = titleName` (empty when there is none);
otherwise it keeps its own values. Applied to both `chapters.list()` and `chapter(id).get()`. Five tests
in `KavitaServerPluginTest`. Still to confirm on the device: the series 607 page shows
"Capítulo N" in the right order (note: RN's `ChapterTool.format.title` prefixes the number, so the row
reads "1. Capítulo 1" — cosmetic, left alone).
