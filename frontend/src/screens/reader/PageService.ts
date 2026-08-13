import { ReaderBridge } from '../../shared/bridge/page';

export async function fetchPageUrls(chapterId: string, expectedPageCount: number): Promise<string[]> {
  return ReaderBridge.getPageUrls(chapterId, expectedPageCount);
}

export async function invalidatePageCache(chapterId: string): Promise<void> {
  return ReaderBridge.invalidatePageCache(chapterId);
}
