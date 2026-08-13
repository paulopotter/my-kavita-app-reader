import { NativeModules } from 'react-native';

export interface PageCacheEntry {
  pageIndex: number;
  url: string;
}

interface ReaderModuleInterface {
  getPageUrls(chapterId: string, expectedPageCount: number): Promise<string[]>;
  invalidatePageCache(chapterId: string): Promise<void>;
  getPageCacheUrls(chapterId: string): Promise<PageCacheEntry[]>;
}

export const ReaderBridge: ReaderModuleInterface = NativeModules.ReaderModule;
