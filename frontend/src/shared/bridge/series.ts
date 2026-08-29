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

// Nota (plano 017, Tasks 025/013): não existe mais um SeriesProgressChangedEmitter nativo. O
// evento de progresso de leitura vive agora no EventBus RN→RN como ChapterEvents.readStatusChanged
// (shared/tools/chapters), emitido pelo ChapterTool.mark.* e consumido pela useLibrary.
// SeriesFollowedEmitter permanece porque sua origem — Room observando followedSeriesDao — é
// genuinamente nativa.
