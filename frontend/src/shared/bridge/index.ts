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
export * from './library';
export * from './network';
export * from './page';
export * from './preferences';
export * from './server';
export * from './startup';

// series.ts is the legacy SeriesBridge (screens/series-detail's own data source, being migrated
// away from) — its own SeriesMetadata/ChapterReadStatus collide by name with digest.ts's real,
// current versions of the same concepts. Renamed on the way out so both can be imported from this
// single index without ambiguity; new code should reach for digest.ts's SeriesMetadata/
// ChapterReadStatus, never the Legacy* ones.
export type {
  Chapter as LegacyChapter,
  ChapterReadStatus as LegacyChapterReadStatus,
  ChapterSortMode as LegacyChapterSortMode,
  ChapterSortPrefs as LegacyChapterSortPrefs,
  SeriesDetail as LegacySeriesDetail,
  SeriesMetadata as LegacySeriesMetadata,
} from './series';
export { SeriesBridge, SeriesFollowedEmitter, SeriesProgressChangedEmitter } from './series';
export type { SeriesProgressChangedEvent } from './series';
