import { CacheManager } from '../caches/cache.manager';

// ReadingProgressManager — where the reader's local reading position lives (Task 029 Fase 4),
// replacing the legacy `reading_progress` Room table (ReaderChapterBridge.getLocalProgress /
// saveLocalProgress). Backed by CacheManager.persistent (Room via the Kotlin :cache module) so
// it survives the app being killed — but it's a TEMPORARY sync buffer, not the durable source of
// truth: the server (Kavita, ChapterService.progress) is. A boot-time reconciliation (its own
// task — Splash refactor) pushes newer local entries to the server and drops the ones the server
// has caught up to, keeping this table small.
//
// The cache entry's own cachedAtEpochMs IS the "updated at" — every put() re-stamps it, so
// resolveInitialPage can compare it against the server's resumePoint.recordedAtEpochMs and let
// whichever is newer win.

const DOMAIN = 'readingProgress';

export interface ReadingProgressValue {
  seriesId: string;
  page: number;
  scrollFraction: number;
}

export interface ReadingProgressRecord extends ReadingProgressValue {
  updatedAtEpochMs: number;
}

export const ReadingProgressManager = {
  get(chapterId: string): Promise<ReadingProgressRecord | null> {
    return CacheManager.persistent.get({ key: chapterId, variant: '' }).then(entry => {
      if (!entry) {return null;}
      try {
        const parsed = JSON.parse(entry.value) as ReadingProgressValue;
        return { ...parsed, updatedAtEpochMs: entry.cachedAtEpochMs };
      } catch {
        return null;
      }
    });
  },

  set(chapterId: string, value: ReadingProgressValue): Promise<void> {
    return CacheManager.persistent
      .put({ key: chapterId, value: JSON.stringify(value), domain: DOMAIN, variant: '' })
      .then(() => undefined);
  },

  clear(chapterId: string): Promise<void> {
    return CacheManager.persistent.invalidate({ key: chapterId, variant: '' });
  },
};
