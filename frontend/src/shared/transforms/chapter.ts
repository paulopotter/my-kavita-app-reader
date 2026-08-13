import { Chapter, ChapterSortMode } from '../bridge/series';
import { Strings } from '../i18n/strings';

export function chapterDisplayTitle(chapter: Chapter, t: Strings): string {
  // O Kavita às vezes preenche `title` com o próprio número do capítulo —
  // isso não conta como um título real, só um número duplicado.
  const hasRealTitle = chapter.title.trim().length > 0 && chapter.title !== chapter.number;
  if (hasRealTitle) {
    return chapter.number ? `${chapter.number}. ${chapter.title}` : chapter.title;
  }
  if (chapter.number) return t.seriesDetailChapterNumberLabel.replace('{0}', chapter.number);
  return t.seriesDetailChapterUntitled;
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
      if (fixedThreshold == null) return ascending;
      const lastReadNumber = ascending
        .filter(c => c.readStatus === 'READ')
        .map(c => parseFloat(c.number))
        .filter(n => !isNaN(n))
        .reduce((max, n) => Math.max(max, n), 0);
      return lastReadNumber > fixedThreshold ? [...ascending].reverse() : ascending;
    }
    case 'AUTO_PROGRESS': {
      const readCount = ascending.filter(c => c.readStatus === 'READ').length;
      const actualPercent = ascending.length === 0 ? 0 : (readCount / ascending.length) * 100;
      return actualPercent >= progressPercent ? [...ascending].reverse() : ascending;
    }
  }
}
