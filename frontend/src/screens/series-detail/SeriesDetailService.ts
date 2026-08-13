import {
  Chapter,
  ChapterSortMode,
  ChapterSortPrefs,
  SeriesBridge,
  SeriesDetail,
  SeriesMetadata,
} from '../../shared/bridge/series';

export async function fetchSeriesDetail(seriesId: string): Promise<SeriesDetail> {
  return SeriesBridge.getSeriesDetail(seriesId);
}

export async function fetchSeriesMetadata(seriesId: string): Promise<SeriesMetadata> {
  return SeriesBridge.getSeriesMetadata(seriesId);
}

export async function fetchChapters(seriesId: string): Promise<Chapter[]> {
  return SeriesBridge.getChapters(seriesId);
}

export async function fetchCachedChapters(seriesId: string): Promise<Chapter[]> {
  return SeriesBridge.getCachedChapters(seriesId);
}

export async function replaceCachedChapters(seriesId: string, chapters: Chapter[]): Promise<void> {
  return SeriesBridge.replaceCachedChapters(seriesId, chapters);
}

export async function markChaptersRead(seriesId: string, chapterIds: string[]): Promise<void> {
  return SeriesBridge.markChaptersRead(seriesId, chapterIds);
}

export async function markChaptersUnread(seriesId: string, chapterIds: string[]): Promise<void> {
  return SeriesBridge.markChaptersUnread(seriesId, chapterIds);
}

export async function toggleFollow(seriesId: string): Promise<void> {
  return SeriesBridge.toggleFollow(seriesId);
}

export async function fetchIsSeriesFollowed(seriesId: string): Promise<boolean> {
  return SeriesBridge.isSeriesFollowed(seriesId);
}

export async function getChapterSortPrefs(): Promise<ChapterSortPrefs> {
  return SeriesBridge.getChapterSortPrefs();
}

export async function setChapterSortPrefs(
  mode: ChapterSortMode,
  fixedThreshold: number | undefined,
  progressPercent: number,
): Promise<void> {
  return SeriesBridge.setChapterSortPrefs(mode, fixedThreshold, progressPercent);
}

export async function getSeriesSortPrefs(seriesId: string): Promise<ChapterSortPrefs | null> {
  return SeriesBridge.getSeriesSortPrefs(seriesId);
}

export async function setSeriesSortPrefs(
  seriesId: string,
  mode: ChapterSortMode,
  fixedThreshold: number | undefined,
  progressPercent: number,
): Promise<void> {
  return SeriesBridge.setSeriesSortPrefs(seriesId, mode, fixedThreshold, progressPercent);
}

export async function resetSeriesSortPrefs(seriesId: string): Promise<void> {
  return SeriesBridge.resetSeriesSortPrefs(seriesId);
}
