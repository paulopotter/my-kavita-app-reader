import { ChapterTool } from '../../../shared/tools/chapters';
import type { Strings } from '../../../shared/i18n/strings';
import { buildFirstNode, buildLastNode } from '../reader-sdu';
import type { LoadedChapterEntry, OrderedChapter, ReaderChapter, ReaderWindow } from '../reader.types';
import type { ReaderChapterBlock } from '../components/reader-page-list-view';
import { withOrderNumber } from './reader.transform';

// ReaderWindow -> native webtoon ChapterBlock[]. A standalone transform (not reached through the
// modes/ barrel) so the screen never pulls the whole adapter module graph — a module-init
// ordering issue there crashed the app on device (rc30). The webtoon adapter delegates to this.

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
