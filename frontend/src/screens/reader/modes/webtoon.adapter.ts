import { ChapterTool } from '../../../shared/tools/chapters';
import type { Strings } from '../../../shared/i18n';
import { buildFirstNode, buildLastNode } from '../reader-sdu';
import { withOrderNumber } from '../reader.model';
import type {
  FocusMoveTrigger,
  LoadedChapterEntry,
  OrderedChapter,
  ReaderChapter,
  ReaderWindow,
} from '../reader.types';
import type { ReaderChapterBlock } from '../components/reader-page-list-view';
import type { ReaderModeAdapter } from './reading-mode.types';

// The webtoon reading-mode adapter: everything that translates the mode-agnostic ReaderWindow
// into what the native webtoon LazyColumn consumes, plus the native-scroll report → trigger
// parsing. The plain functions (webtoonReportToTrigger / windowToWebtoonBlocks) are exported
// directly AND wired into the adapter object: the hook and screen import the functions straight
// from this file, never through the modes/ barrel — a module-init ordering issue in the barrel
// graph crashed the app on device (rc30). Keeping the adapter's methods as thin delegations to
// the same functions avoids a second copy of the logic.

// ── native scroll report → FocusMoveTrigger (webtoon) ───────────────────
// A standalone function (imported directly by reader.hooks.ts) so the hook's onNativePosition —
// the very first thing a native scroll event hits — never depends on the adapter object graph.

export interface WebtoonPositionReport {
  chapterId: string;
  pageIndex: number;
  pageFraction: number;
  chapterFraction: number;
}

export function isWebtoonPositionReport(raw: unknown): raw is WebtoonPositionReport {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    typeof (raw as WebtoonPositionReport).chapterId === 'string' &&
    typeof (raw as WebtoonPositionReport).pageIndex === 'number'
  );
}

export function webtoonReportToTrigger(raw: unknown): FocusMoveTrigger | null {
  if (!isWebtoonPositionReport(raw)) {return null;}
  return {
    source: 'native-scroll',
    reportedChapterId: raw.chapterId,
    page: raw.pageIndex,
    pageFraction: raw.pageFraction,
    chapterFraction: raw.chapterFraction,
  };
}

// ── ReaderWindow → native webtoon ChapterBlock[] ────────────────────────

// The chapter's own number as a bare string, for the end-of-chapter footer.
function chapterNumberLabel(chapter: ReaderChapter): string {
  const num = chapter.number ?? chapter.decimalNumber;
  return num != null ? String(num) : '';
}

function toBlock(
  entry: LoadedChapterEntry,
  nextEntry: LoadedChapterEntry | null,
  hasGapAbove: boolean,
  order: OrderedChapter[],
  t: Strings,
): ReaderChapterBlock {
  const chapter = withOrderNumber(entry.chapter, order);
  const nextChapter = nextEntry ? withOrderNumber(nextEntry.chapter, order) : null;
  return {
    chapterId: chapter.id,
    pageUrls: chapter.pageUrls,
    pageAspectRatios: chapter.pageAspectRatios.map(ratio => ratio ?? 0),
    firstNode: buildFirstNode(ChapterTool.format.title(chapter, t), hasGapAbove),
    lastNode: buildLastNode(
      t.readerEndOfChapterPrefix,
      chapterNumberLabel(chapter),
      t.readerNextChapterLabel,
      nextChapter ? ChapterTool.format.title(nextChapter, t) : null,
    ),
  };
}

export function windowToWebtoonBlocks(
  window: ReaderWindow,
  order: OrderedChapter[],
  t: Strings,
): ReaderChapterBlock[] {
  return window.entries.map((entry, i) =>
    toBlock(entry, window.entries[i + 1] ?? null, i > 0, order, t),
  );
}

// ── the adapter object (registry entry / mode contract) ─────────────────
// Both members delegate to the standalone functions above — the screen and hook use those
// directly, never reach through this object.
export const webtoonAdapter: ReaderModeAdapter<ReaderChapterBlock[]> = {
  mode: 'webtoon',
  toRenderModel: windowToWebtoonBlocks,
  interpretPositionReport: webtoonReportToTrigger,
};
