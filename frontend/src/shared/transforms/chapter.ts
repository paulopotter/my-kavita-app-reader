import { Chapter, ChapterSortMode } from '../bridge/series';

export function chapterDisplayTitle(chapter: Chapter): string {
  const numberLabel = chapter.number ? `Cap. ${chapter.number}` : '';
  if (!chapter.title) return numberLabel || 'Sem título';
  if (!numberLabel) return chapter.title;
  return `${numberLabel} — ${chapter.title}`;
}

export function chapterNumberComparator(a: Chapter, b: Chapter): number {
  const na = parseFloat(a.number);
  const nb = parseFloat(b.number);
  const validA = !isNaN(na);
  const validB = !isNaN(nb);
  if (validA && validB && na !== nb) return na - nb;
  if (validA && !validB) return -1;
  if (!validA && validB) return 1;
  return a.title.localeCompare(b.title);
}

function isReadEnough(chapter: Chapter, progressPercent: number): boolean {
  if (chapter.readStatus === 'READ') return true;
  if (chapter.pageCount <= 0) return chapter.readStatus !== 'UNREAD';
  const fraction = chapter.pagesRead / chapter.pageCount;
  return fraction * 100 >= progressPercent;
}

export function sortChapters(
  chapters: Chapter[],
  mode: ChapterSortMode,
  fixedThreshold?: number,
  progressPercent = 50,
): Chapter[] {
  const ascending = [...chapters].sort(chapterNumberComparator);

  switch (mode) {
    case 'ASCENDING':
      return ascending;
    case 'DESCENDING':
      return [...ascending].reverse();
    case 'AUTO_FIXED': {
      const threshold = fixedThreshold ?? 0;
      const hasUnreadPastThreshold = ascending.some(
        c => parseFloat(c.number) >= threshold && c.readStatus !== 'READ',
      );
      return hasUnreadPastThreshold ? ascending : [...ascending].reverse();
    }
    case 'AUTO_PROGRESS': {
      const readCount = ascending.filter(c => isReadEnough(c, progressPercent)).length;
      const fractionRead = ascending.length > 0 ? readCount / ascending.length : 0;
      return fractionRead * 100 >= progressPercent ? [...ascending].reverse() : ascending;
    }
  }
}
