import { NativeModules } from 'react-native';

export type { Chapter, ChapterReadStatus } from './series';

export interface LocalProgress {
  page: number;
  scrollFraction: number;
}

export interface PageDimension {
  pageNumber: number;
  width: number;
  height: number;
}

interface ReaderChapterBridgeInterface {
  getServerReadProgress(chapterId: string): Promise<number | null>;
  getLocalProgress(chapterId: string): Promise<LocalProgress | null>;
  saveLocalProgress(chapterId: string, seriesId: string, page: number, scrollFraction: number): Promise<void>;
  saveReadingProgress(chapterId: string, seriesId: string, page: number): Promise<void>;
  getKeepScreenOnDuringReading(): Promise<boolean>;
  keepScreenOn(): Promise<void>;
  allowScreenOff(): Promise<void>;
  // Kavita already extracted/cached every page while indexing the library, so this returns page
  // pixel dimensions as JSON without downloading any image bytes — lets the reader size its
  // progress-bar landmarks before a page has actually been decoded on-device. Server-side source
  // of truth; ReaderPageList falls back to measuring pages as they're decoded when this fails or
  // a chapter isn't covered (e.g. Kavita down, page not yet indexed).
  getPageDimensions(chapterId: string): Promise<PageDimension[]>;
}

export const ReaderChapterBridge: ReaderChapterBridgeInterface = NativeModules.ReaderModule;
