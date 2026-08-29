import { NativeEventEmitter, NativeModules } from 'react-native';

export interface SeriesDetail {
  id: string;
  name: string;
  coverImageUrl: string;
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

// Task 024 — getSeriesMetadata/getCachedSeriesDetail/getCachedSeriesMetadata/getChapters/
// replaceCachedChapters/toggleFollow/isSeriesFollowed/the 3 chapter-sort-prefs methods were
// removed from SeriesModule (Kotlin) once the legacy SeriesDetailScreen (their only real caller)
// was deleted — SerieScreen's own tools (SerieTool/ChapterTool/ChaptersTool) already cover the
// same concerns through DigestBridge/FollowedSeriesBridgeModule/PreferencesBridgeModule instead.
interface SeriesModuleInterface {
  getSeriesDetail(seriesId: string): Promise<SeriesDetail>;
  getCachedChapters(seriesId: string): Promise<Chapter[]>;
  markChaptersRead(seriesId: string, chapterIds: string[]): Promise<void>;
  markChaptersUnread(seriesId: string, chapterIds: string[]): Promise<void>;
}

export const SeriesBridge: SeriesModuleInterface = NativeModules.SeriesModule;

export const SeriesFollowedEmitter = new NativeEventEmitter(NativeModules.SeriesModule);

export interface SeriesProgressChangedEvent {
  seriesId: string;
  progressFraction: number;
  readChapters: number;
  chapterCount: number;
}

// Emitido pelo lado nativo sempre que o progresso de leitura de uma série muda localmente
// (markChaptersRead/Unread no Series Detail, saveReadingProgress no Reader) — permite que a
// Library confie no dado local mais recente sem esperar o TTL do seu cache em memória expirar,
// mesmo padrão de SeriesFollowedEmitter para follow/unfollow.
export const SeriesProgressChangedEmitter = new NativeEventEmitter(NativeModules.SeriesModule);
