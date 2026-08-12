import { Chapter } from '../bridge/series';
import { chapterNumberComparator } from './chapter';

const REREAD_THRESHOLD_FRACTION = 0.98;

export function computeContinueChapter(chapters: Chapter[]): Chapter | null {
  if (chapters.length === 0) return null;

  const ascending = [...chapters].sort(chapterNumberComparator);

  const hasAnyProgress = ascending.some(c => c.readStatus !== 'UNREAD' || c.pagesRead > 0);
  if (!hasAnyProgress) return null;

  const inProgress = ascending.find(c => c.readStatus === 'IN_PROGRESS');
  if (inProgress) return inProgress;

  const firstUnread = ascending.find(c => c.readStatus === 'UNREAD');
  if (firstUnread) return firstUnread;

  const firstUnfinished = ascending.find(c => {
    if (c.pageCount <= 0) return false;
    const fraction = c.pagesRead / c.pageCount;
    return fraction < REREAD_THRESHOLD_FRACTION;
  });
  if (firstUnfinished) return firstUnfinished;

  return ascending[0] ?? null;
}
