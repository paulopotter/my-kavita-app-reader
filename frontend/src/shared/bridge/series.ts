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

// DESATIVADO (plano 017, Task 025): SeriesModule/ReaderChapterModule não emitem mais
// 'seriesProgressChanged' — a derivação de progresso era feita de dado local (Room), sem origem
// no servidor, e estava duplicada byte-a-byte entre as duas bridges. A notificação volta pelo
// EventBus RN→RN (Task 013), emitida por quem marca o progresso no RN. Este emitter e o tipo
// acima ficam como esqueleto até lá; o listener vivo está comentado em useLibrary.ts.
// (SeriesFollowedEmitter permanece ativo — sua origem, Room observando followedSeriesDao, é
// genuinamente nativa.)
export const SeriesProgressChangedEmitter = new NativeEventEmitter(NativeModules.SeriesModule);
