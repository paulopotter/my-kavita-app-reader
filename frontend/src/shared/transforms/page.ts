import { Chapter } from '../bridge/series';

export function computeGapHeight(prevFooterHeight: number, nextHeaderHeight: number): number {
  return Math.max(0, prevFooterHeight) + Math.max(0, nextHeaderHeight);
}

export type ReaderItemKind = 'HEADER' | 'PAGE' | 'FOOTER' | 'GAP';

export interface ReaderListItem {
  key: string;
  kind: ReaderItemKind;
  chapterId: string;
  pageIndex?: number;
}

export interface ChapterWithPages {
  chapter: Chapter;
  pages: string[];
  // Aspect ratio (height / width, from the original image dimensions) per page, aligned by
  // index with `pages` — null entries mean the dimension wasn't available (Kavita unreachable,
  // page not covered) and the native side falls back to measuring that page once it's actually
  // decoded on-device. Undefined (the whole array missing) means dimensions were never fetched
  // for this chapter at all — same fallback behavior.
  pageAspectRatios?: (number | null)[];
}

export interface ViewerChapters {
  prev: ChapterWithPages | null;
  curr: ChapterWithPages;
  next: ChapterWithPages | null;
}

export function currChapterOf(viewer: ViewerChapters): ChapterWithPages {
  return viewer.curr;
}

function buildChapterBlock(entry: ChapterWithPages): ReaderListItem[] {
  const chapterId = entry.chapter.id;
  const items: ReaderListItem[] = [{ key: `${chapterId}:HEADER:`, kind: 'HEADER', chapterId }];
  entry.pages.forEach((_, pageIndex) => {
    items.push({ key: `${chapterId}:PAGE:${pageIndex}`, kind: 'PAGE', chapterId, pageIndex });
  });
  items.push({ key: `${chapterId}:FOOTER:`, kind: 'FOOTER', chapterId });
  return items;
}

export function buildReaderList(viewer: ViewerChapters, _measuredHeights: Map<string, number>): ReaderListItem[] {
  const blocks: ChapterWithPages[] = [viewer.prev, viewer.curr, viewer.next].filter(
    (entry): entry is ChapterWithPages => entry != null,
  );

  const items: ReaderListItem[] = [];
  blocks.forEach((entry, index) => {
    if (index > 0) {
      const prevEntry = blocks[index - 1];
      items.push({
        key: `gap:${prevEntry.chapter.id}:${entry.chapter.id}`,
        kind: 'GAP',
        chapterId: entry.chapter.id,
      });
    }
    items.push(...buildChapterBlock(entry));
  });

  return items;
}

export function pagePreloadOrder(currentIndex: number, windowRadius: number, totalPages: number): number[] {
  if (totalPages <= 0) {
    return [];
  }
  const candidates = new Map<number, number>();
  for (let offset = -windowRadius; offset <= windowRadius; offset++) {
    const index = currentIndex + offset;
    if (index < 0 || index >= totalPages) {
      continue;
    }
    candidates.set(index, Math.abs(offset));
  }
  return Array.from(candidates.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([index]) => index);
}

export function isNearChapterEdge(currentPage: number, totalPages: number, edgeThreshold: number): boolean {
  if (totalPages <= 0) {
    return false;
  }
  return currentPage >= totalPages - 1 - edgeThreshold;
}

export function reindexAfterPrevInsert(oldIndex: number, prevBlockItemCount: number): number {
  return oldIndex + prevBlockItemCount;
}

export interface VisiblePageProgress {
  pageIndex: number;
  scrollFraction: number;
}

// Deriva a posição de leitura a partir do offset acumulado de scroll — não de qual item
// "mudou de identidade" — porque uma única página de webtoon pode ocupar mais de uma tela
// inteira: sem isso, a barra de progresso fica parada enquanto o usuário rola dentro dela.
export function computeVisiblePageProgress(
  items: ReaderListItem[],
  measuredHeights: Map<string, number>,
  scrollOffsetY: number,
  viewportHeight: number,
  currChapterId: string,
  estimatedItemHeight: number,
): VisiblePageProgress | null {
  const viewportCenter = scrollOffsetY + viewportHeight / 2;
  let cumulativeOffset = 0;
  let bestMatch: VisiblePageProgress | null = null;

  for (const item of items) {
    const height = measuredHeights.get(item.key) ?? estimatedItemHeight;
    const itemTop = cumulativeOffset;
    const itemBottom = cumulativeOffset + height;
    if (
      item.kind === 'PAGE' &&
      item.chapterId === currChapterId &&
      item.pageIndex != null &&
      viewportCenter >= itemTop &&
      viewportCenter < itemBottom
    ) {
      const fraction = height > 0 ? (viewportCenter - itemTop) / height : 0;
      bestMatch = { pageIndex: item.pageIndex, scrollFraction: Math.min(1, Math.max(0, fraction)) };
      break;
    }
    cumulativeOffset = itemBottom;
  }

  return bestMatch;
}
