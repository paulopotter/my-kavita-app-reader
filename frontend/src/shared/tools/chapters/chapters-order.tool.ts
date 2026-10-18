import type { ChapterDigestSuccess, ChapterReadStatus, SerialDigestSuccess } from '../../bridge';

// A series' canonical reading order — the sequence prev/next depend on, not the display sort.
// Promoted out of the image reader when the book reader became its second consumer.
export interface OrderedChapter {
  id: string;
  seriesId: string;
  number?: number;
  decimalNumber?: number;
  specialLabel?: string;
  isSpecial?: boolean;
  title: string;
  readStatus: ChapterReadStatus;
}

export function toOrderedChapters(digest: SerialDigestSuccess): OrderedChapter[] {
  const list = (digest.chapters?.list ?? [])
    .filter((c): c is ChapterDigestSuccess => c.isSuccess)
    .map(c => ({
      id: c.id,
      seriesId: c.seriesId,
      number: c.number,
      decimalNumber: c.decimalNumber,
      specialLabel: c.specialLabel,
      isSpecial: c.isSpecial,
      title: c.title,
      readStatus: c.readStatus,
    }));
  return list.sort((a, b) => {
    const na = a.number ?? a.decimalNumber;
    const nb = b.number ?? b.decimalNumber;
    if (na != null && nb != null && na !== nb) {return na - nb;}
    if (na != null && nb == null) {return -1;}
    if (na == null && nb != null) {return 1;}
    return a.title.localeCompare(b.title);
  });
}

// The ids immediately before/after `id` in a reading-ordered list (or null at the ends).
export function neighborsOfIn(
  list: OrderedChapter[],
  id: string,
): { prevId: string | null; nextId: string | null } {
  const i = list.findIndex(c => c.id === id);
  if (i === -1) {return { prevId: null, nextId: null };}
  return {
    prevId: i > 0 ? list[i - 1].id : null,
    nextId: i < list.length - 1 ? list[i + 1].id : null,
  };
}

// The next / previous chapter id in the canonical reading order, relative to `chapterId`.
// null at the series ends or when the order isn't loaded.
export function adjacentChapterId(
  order: OrderedChapter[],
  chapterId: string,
  direction: 'next' | 'prev',
): string | null {
  const i = order.findIndex(c => c.id === chapterId);
  if (i === -1) {return null;}
  const j = direction === 'next' ? i + 1 : i - 1;
  return j >= 0 && j < order.length ? order[j].id : null;
}
