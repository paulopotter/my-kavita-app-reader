# Task 001 — Segment the chapters list in the cache

**Status:** in progress

## Why

A series with 3000+ chapters is cached as one row above the ~2 MB `CursorWindow`, so it is not
cacheable at all (the `c03ed8e` stopgap drops it) and is rebuilt from the network on every open.
Splitting the chapters out of the series row keeps every row small and makes such a series
cacheable again, without changing what RN receives.

## What to do

In `android/content-digest/.../serial/SerialDigest.kt` (`buildSerialDigest` cache read/write):

- **Write**: split `SerialDigest.chapters.list` into segments of ~300-500 chapters (a named,
  tunable constant). Store each segment as its own row:
  - key like `serial:<id>:chapters:<k>` (`k` = segment index), with its own variant;
  - the **main row** keeps the series fields, the chapters aggregates (`status`, `readCount`,
    `total`, `resumePoint`) and the **segment count**, but no chapter list.
  - All segments and the main row are written in **one `patchAll` / transaction with the same
    timestamp**.
- **Read**: load the main row, then the segments with the existing batched read (`queryFiltered`
  by keys, chunked at `CACHE_FILTER_MAX_KEYS = 900`), and reassemble the full `SerialDigest`. The
  digest returned to RN is **identical to today**.
- **Failure**: a missing or unreadable segment is a cache miss for the **whole series** (rebuild
  from the network); never return a partial chapter list.
- Keep the Library list rows working: `SerialsDigest.kt` (`patchAll`) must keep reading and
  writing series rows correctly with the new main-row shape.
- Check the key scheme against backlog 017 (README, "Relations").

## Contract-change gate

No public contract changes: no hook signature, event shape, route or domain digest. If this turns
out to need one, stop and ask the user before editing code.

## Tests (beside the code)

- Round trip: a series with several segments is written and read back as an identical digest.
- A series with fewer chapters than one segment (single segment) and with zero chapters.
- Segment boundaries (exactly N, N+1 chapters) and chunking above `CACHE_FILTER_MAX_KEYS`.
- A missing segment and an unreadable segment each produce a whole-series miss.
- Segments and main row share one timestamp and one write.
- Library list rows (`SerialsDigest.kt`) still read and write correctly.
- `make coverage` must pass; bump the floor (currently 85) if it rose.

## Done when

- A series with 3000+ chapters is cached and read back from the cache, with no `CursorWindow` error.
- The digest reaching RN is identical to before.
- The user has tested it on the device with the 3000-chapter manga and given a verdict on whether
  the page is still too heavy (this decides Task 002).
- Coverage passes.

## As built (differs from "What to do" above)

Implemented in `android/content-digest/.../serial/SerialChaptersSegments.kt`; `SerialDigest.kt` only
calls it (`readSerialRow`, `persistSerialDigest`, `patchSerialRowChapter`). The digest RN receives is
unchanged. Where it differs from the plan text:

- **Segments are sized by bytes, not by a chapter count.** Chapters are grouped greedily until a
  segment reaches `SERIAL_SEGMENT_TARGET_CHARS` (450k chars), so long chapters (or ones carrying
  page lists) get fewer per segment. A series whose whole JSON fits in `SERIAL_INLINE_MAX_CHARS`
  (400k chars) stays in one row exactly as before.
- **Rows**: `<key>` (main, `chapters.list = []`, `total`/`readCount`/`resumePoint` kept),
  `<key>:seg:index` (`{resolvedAtEpochMs, counts}`) and `<key>:seg:<k>`. Segments and index live in
  the same `serial` domain but in their own variant (`chapters`), so the Library's wide read of the
  main variant never touches them and retention (keyed by the series-id prefix) still reaches them.
  A main row with an empty list but `total > 0` is the split form; every other row reads as before.
- **Writes are one `put` per part, main row last** (the commit marker), not a single `patchAll`.
  `patchAll` would merge each segment against the previous one for nothing.
- **Generation check** is between the index and each segment (`resolvedAtEpochMs` plus the per-
  segment count), plus `sum(counts) == main.total`. It is deliberately NOT checked against the main
  row's own `resolvedAtEpochMs`: the Library list refresh merges into that same row and overwrites it.
- **`patchSerialChapterReadStatus`** rewrites only the segment holding the chapter plus the main
  row (readCount adjusted by delta), instead of the whole chapter list.
- **Known consequence**: the Library list refresh nulls `chapters` in the default-variant main row
  (existing behaviour of the shallow merge), which leaves its segments orphaned until the next
  write of that key or the retention sweep. The series screen reads another variant, so it is not
  affected. Covered by a test.
- Unreadable main JSON is now a miss instead of an exception.

Tests: 8 new in `SerialDigestTest.kt` (round trip, small series stays inline, missing segment,
segment from another write, unreadable main row, patching one chapter, unknown chapter, list refresh
over a segmented row). Still to do before closing: `make coverage`, device test with the
3000-chapter manga.
