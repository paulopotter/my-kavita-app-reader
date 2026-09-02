export * from './cache';
// chapter.ts re-exports Chapter/ChapterReadStatus from series.ts verbatim (same legacy types, not
// a divergent copy) — excluded here since series.ts's own export below already renames them to
// Legacy* to avoid colliding with digest.ts's real, current versions of the same concepts.
export type { LocalProgress, PageDimension } from './chapter';
export { ReaderChapterBridge, ScreenControlBridge } from './chapter';
export * from './config';
export * from './db-validator';
export * from './digest';
export * from './external';
export * from './followedSeries';
export * from './network';
export * from './page';
export * from './preferences';
export * from './server';
export * from './startup';

// series.ts is the legacy SeriesBridge — still needed by ReaderService/useReader
// (getSeriesDetail/getCachedChapters/markChaptersRead/Unread) and useLibrary (the two emitters);
// every other method it used to expose was removed once the legacy SeriesDetailScreen (their only
// real caller) was deleted (Task 024). Its own Chapter/ChapterReadStatus collide by name with
// digest.ts's real, current versions of the same concepts — renamed on the way out so both can be
// imported from this single index without ambiguity; new code should reach for digest.ts's
// ChapterReadStatus, never LegacyChapterReadStatus.
export type {
  Chapter as LegacyChapter,
  ChapterReadStatus as LegacyChapterReadStatus,
  SeriesDetail as LegacySeriesDetail,
} from './series';
export { SeriesBridge, SeriesFollowedEmitter } from './series';
