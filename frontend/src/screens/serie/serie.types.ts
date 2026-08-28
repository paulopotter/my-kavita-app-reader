// Deliberately duplicated from shared/bridge/series.ts's ChapterSortMode (legacy — see
// shared/index.ts's Legacy* re-exports) instead of reusing it: this screen never depends on
// legacy code, even for a plain string-literal union that happens to share the same 4 values
// today.
export type ChapterSortMode = 'ASCENDING' | 'DESCENDING' | 'AUTO_FIXED' | 'AUTO_PROGRESS';
