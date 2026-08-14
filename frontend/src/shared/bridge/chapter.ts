import { NativeModules } from 'react-native';

export type { Chapter, ChapterReadStatus } from './series';

export interface LocalProgress {
  page: number;
  scrollFraction: number;
}

interface ReaderChapterBridgeInterface {
  getServerReadProgress(chapterId: string): Promise<number | null>;
  getLocalProgress(chapterId: string): Promise<LocalProgress | null>;
  saveLocalProgress(chapterId: string, seriesId: string, page: number, scrollFraction: number): Promise<void>;
  saveReadingProgress(chapterId: string, seriesId: string, page: number): Promise<void>;
  getKeepScreenOnDuringReading(): Promise<boolean>;
  keepScreenOn(): Promise<void>;
  allowScreenOff(): Promise<void>;
}

export const ReaderChapterBridge: ReaderChapterBridgeInterface = NativeModules.ReaderModule;
