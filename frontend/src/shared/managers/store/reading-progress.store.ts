import { Store } from './store.manager';

// ReadingProgressManager — the reader's local reading position (Task 029 Fase 4), a thin bind of
// Store to the `readingProgress` domain. Kept as a named export with its own value/record types
// so the reader's call sites read intent-first ("reading progress"), not "a store row". The
// server (Kavita, ChapterService.progress) is the durable source of truth; this is a temporary
// sync buffer, reconciled at boot (Splash refactor task).

export interface ReadingProgressValue {
  seriesId: string;
  page: number;
  scrollFraction: number;
}

export interface ReadingProgressRecord extends ReadingProgressValue {
  updatedAtEpochMs: number;
}

const domain = Store.for<ReadingProgressValue>({ domain: 'readingProgress' });

export const ReadingProgressManager = {
  get(chapterId: string): Promise<ReadingProgressRecord | null> {
    return domain.get(chapterId);
  },
  set(chapterId: string, value: ReadingProgressValue): Promise<void> {
    return domain.set(chapterId, value);
  },
  clear(chapterId: string): Promise<void> {
    return domain.clear(chapterId);
  },
};
