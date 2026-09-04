# Task 037 — Kill the `Transform` layer (start with `reader/transforms/`) (Phase 6 — Reader)

**Status:** done

> Design decision made by the user 2026-09-01, closing out the Reader work: **there is no
> `Transform` layer.** No `transforms/` folder, no `*Transform.ts` file inside a screen. The
> `CLAUDE.md` "Tool → Hook → Service → Transform → Screen → Component" flow is stale on that
> step. `serie/` already complies; `reader/` still has `transforms/` from its rewrite. This task
> dissolves it and records the rule so no screen grows one again.

## Objective

Move the 19 exports of `screens/reader/transforms/reader.transform.ts` +
`screens/reader/transforms/webtoon-blocks.transform.ts` to their correct homes (below), delete
the `transforms/` folder, and update `architecture.md` + `CLAUDE.md` so "Transform" stops being
a named stage. `reader/` is the only offender; nothing else in the codebase should have a
per-screen `Transform` after this.

## Where each export goes

`shared/transforms/<domain>.ts` (the SHARED layer) is untouched — that is genuinely
cross-screen pure code, not a per-screen `Transform`.

### 1 → `ChapterTool` (`shared/tools/chapters/chapters.tool.ts`)

Chapter normalization / formatting / read-state — sits next to `ChapterTool.format.title` and
`ChapterTool.mark.*`:

- `chapterFromDigest` → `ChapterTool.fromDigest`
- `withOrderNumber` → `ChapterTool.order.applyNumber` (or fold into `fromDigest` if the order is
  always in hand)
- `toOrderedChapters` → `ChapterTool.order.fromSeriesDigest`
- `placeholderChapterFromOrder` → `ChapterTool.order.placeholder`
- `neighborsOfIn` → `ChapterTool.order.neighbors`
- `adjacentChapterId` → `ChapterTool.order.adjacent`
- `isChapterEffectivelyRead` → `ChapterTool.readState.isEffectivelyRead`
- `shouldUnmarkOnReread` → `ChapterTool.readState.shouldUnmarkOnReread`
- `resolveInitialPage` → `ChapterTool.readState.resolveInitialPage`
- `READ_THRESHOLD_FRACTION` → `ChapterTool` (const on the tool, or `shared/transforms/chapter.ts`
  which already has its own copy — dedupe)
- `progressBarFraction` → trivial clamp; inline at the one call site (`reader.screen.tsx`) or
  `ChapterTool.readState.progressBarFraction`

### 2 → `screens/reader/reader.window.ts` (new — screen-local model, NOT a transform)

The `ReaderWindow` shape logic — only the reader has it, no other domain reuses it:

- `buildWindow`, `reconcileWindow`, `computeWindowAfterFocusMove`, `WINDOW_EDGE_LOOKAHEAD`,
  `FocusMoveOutcome`

### 3 → `screens/reader/modes/webtoon.adapter.ts`

Per-rendering-mode translation — the adapter already exists and already re-exports these:

- `WebtoonPositionReport`, `isWebtoonPositionReport`, `webtoonReportToTrigger`
- `windowToWebtoonBlocks` (from `webtoon-blocks.transform.ts`) + its private `toBlock`,
  `chapterNumberLabel`

**Watch out:** `reader.hooks.ts` imports `webtoonReportToTrigger` from `../transforms/reader.transform`
*directly*, not via the `modes/` barrel, on purpose — a module-init ordering crash took the app
down on device (rc30) when the hook pulled the adapter module graph. Keep importing the plain
function directly from `modes/webtoon.adapter.ts` (a named export), never the `READER_MODE_ADAPTERS`
object, and re-verify on device that the crash doesn't come back.

## Steps

1. Add the new `ChapterTool` members; move the functions; keep behavior identical (they're
   already pure). Port `reader.transform.tests.ts` cases into `chapters.tests.ts` /
   `reader.window` tests / `webtoon.adapter.tests.ts` as they split.
2. Create `screens/reader/reader.window.ts` + its test; move the window functions.
3. Fold the webtoon report/blocks functions into `modes/webtoon.adapter.ts`; delete
   `webtoon-blocks.transform.ts`.
4. Update every importer (`reader.hooks.ts`, `reader.reducer.ts`, `reader.screen.tsx`,
   `modes/webtoon.adapter.ts`, `modes/index.ts`) and delete `screens/reader/transforms/`.
5. `architecture.md` § "No `Transform` layer" already states the rule (added 2026-09-01) — update
   its "Task 037 dissolves it" line to past tense. `CLAUDE.md` "Rules": change the data-flow line
   to drop the `Transform` step.
6. `tsc` / `eslint` / `jest` green; `make coverage` no drop; device smoke of the reader
   (chapter nav + webtoon scroll + no rc30-style module-init crash).

## Completion criteria

- No `transforms/` folder or `*Transform.ts` file under any `screens/*/`.
- `architecture.md` + `CLAUDE.md` no longer describe a per-screen `Transform` stage.
- All moved functions covered by tests in their new location; `make coverage` no drop.
- Reader device-smoked (esp. the rc30 module-init path).
- Explicit user approval before `finalizar-task`.

## Result

**Delivered.** `screens/reader/transforms/` deleted. Its 19 exports moved to:

- **`screens/reader/reader.model.ts`** (new) — chapter shape / read-state for the reader:
  `chapterFromDigest`, `withOrderNumber`, `toOrderedChapters`, `placeholderChapterFromOrder`,
  `neighborsOfIn`, `adjacentChapterId`, `isChapterEffectivelyRead`, `shouldUnmarkOnReread`,
  `resolveInitialPage`, `progressBarFraction`, `READ_THRESHOLD_FRACTION`. **Not** promoted to the
  shared `ChapterTool` — verified only the reader consumes them, so per architecture.md § "No
  `Transform` layer" they belong in a screen-local model file. (Deviation from the task text's
  "→ ChapterTool" plan, cleared with the user in-session: "se dependem do reader, só o reader usa
  → migra pro reader".)
- **`screens/reader/reader.window.ts`** (new) — the `ReaderWindow` math: `buildWindow`,
  `reconcileWindow`, `computeWindowAfterFocusMove`, `growEnds`/`placeholderEntry` (private),
  `WINDOW_EDGE_LOOKAHEAD`, `FocusMoveOutcome`.
- **`screens/reader/modes/webtoon.adapter.ts`** — absorbed `WebtoonPositionReport`,
  `isWebtoonPositionReport`, `webtoonReportToTrigger`, `windowToWebtoonBlocks` (+ private
  `toBlock`/`chapterNumberLabel`). `webtoon-blocks.transform.ts` deleted. The hook still imports
  `webtoonReportToTrigger` as a direct named export of this file (never the `modes/` barrel or
  `READER_MODE_ADAPTERS`) — the rc30 module-init guard.

Importers updated: `reader.hooks.ts`, `reader.reducer.ts`, `reader.screen.tsx`,
`modes/webtoon.adapter.ts`, `screens/reader/index.ts`. Tests ported 1:1 and split by destination
(`reader.model.tests.ts` renamed from `reader.transform.tests.ts`, new `reader.window.tests.ts`,
extra standalone-function coverage in `webtoon.adapter.tests.ts`).

Docs: architecture.md § "No `Transform` layer" — past tense + the 3 real destinations; new
"Screen file convention" bullet (a screen is its own micro-ecosystem). mistakes.md #21 — path fix
for `READ_THRESHOLD_FRACTION`. `CLAUDE.md` data-flow line already had no `Transform` stage.

**Versions:** APK `0.8.0-rc103` → `0.8.0-rc104`; bundle `0.9.0-rc103` → `0.9.0-rc104`.
Coverage floor (JS) `functions` 78 → 79 (rose 78.34% → 79.34%).

**Tests:** `tsc --noEmit` clean; `eslint src/screens/reader src/shared/tools/chapters` clean;
`yarn test:coverage` — 70 suites / 848 tests pass; global coverage 91.79/90.88/79.34/91.79 (up
from baseline 91.28/90.77/78.34/91.28). Device-smoked on the physical device at rc104 (`make
redeploy-log`): chapter navigation + webtoon scroll working, no rc30-style module-init crash.

**Out of scope, spun off:** user found the SeriesScreen shows stale read-status after returning
from the reader (must pull-to-refresh). Pre-existing — it's the mirror of the "KNOWN GAP" already
documented in `ChapterTool` (`serie.hooks.ts` doesn't listen to
`ChapterEvents.readStatusChanged`, and its focus-reload reads the still-cached Kotlin
`SeriesDigest`). To be fixed in a separate `fix` commit right after this task closes.
