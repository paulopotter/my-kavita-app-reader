import { NativeEventEmitter, NativeModules } from 'react-native';

export interface SeriesDetail {
  id: string;
  name: string;
  coverImageUrl: string;
}

export interface SeriesMetadata {
  summary: string | null;
  genres: string[];
  tags: string[];
}

export type ChapterReadStatus = 'UNREAD' | 'IN_PROGRESS' | 'READ';

export interface Chapter {
  id: string;
  seriesId: string;
  title: string;
  number: string;
  pageCount: number;
  sortOrder: number;
  readStatus: ChapterReadStatus;
  pagesRead: number;
  updatedAtLocalMs: number | null;
}

export type ChapterSortMode = 'ASCENDING' | 'DESCENDING' | 'AUTO_FIXED' | 'AUTO_PROGRESS';

export interface ChapterSortPrefs {
  mode: ChapterSortMode;
  fixedThreshold?: number;
  progressPercent: number;
}

interface SeriesModuleInterface {
  getSeriesDetail(seriesId: string): Promise<SeriesDetail>;
  getSeriesMetadata(seriesId: string): Promise<SeriesMetadata>;
  getChapters(seriesId: string): Promise<Chapter[]>;
  getCachedChapters(seriesId: string): Promise<Chapter[]>;
  replaceCachedChapters(seriesId: string, chapters: Chapter[]): Promise<void>;
  markChaptersRead(seriesId: string, chapterIds: string[]): Promise<void>;
  markChaptersUnread(seriesId: string, chapterIds: string[]): Promise<void>;
  toggleFollow(seriesId: string): Promise<void>;
  isSeriesFollowed(seriesId: string): Promise<boolean>;
  getChapterSortPrefs(): Promise<ChapterSortPrefs>;
  setChapterSortPrefs(
    mode: ChapterSortMode,
    fixedThreshold: number | undefined,
    progressPercent: number,
  ): Promise<void>;
  getSeriesSortPrefs(seriesId: string): Promise<ChapterSortPrefs | null>;
  setSeriesSortPrefs(
    seriesId: string,
    mode: ChapterSortMode,
    fixedThreshold: number | undefined,
    progressPercent: number,
  ): Promise<void>;
  resetSeriesSortPrefs(seriesId: string): Promise<void>;
}

export const SeriesBridge: SeriesModuleInterface = NativeModules.SeriesModule;

export const SeriesFollowedEmitter = new NativeEventEmitter(NativeModules.SeriesModule);
