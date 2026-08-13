import { SeriesBridge } from '../../shared/bridge/series';
import { LocalProgress, ReaderChapterBridge } from '../../shared/bridge/chapter';

export async function fetchServerReadProgress(chapterId: string): Promise<number | null> {
  return ReaderChapterBridge.getServerReadProgress(chapterId);
}

export async function fetchLocalProgress(chapterId: string): Promise<LocalProgress | null> {
  return ReaderChapterBridge.getLocalProgress(chapterId);
}

export async function saveLocalProgress(
  chapterId: string,
  seriesId: string,
  page: number,
  scrollFraction: number,
): Promise<void> {
  return ReaderChapterBridge.saveLocalProgress(chapterId, seriesId, page, scrollFraction);
}

export async function saveServerProgress(chapterId: string, seriesId: string, page: number): Promise<void> {
  return ReaderChapterBridge.saveReadingProgress(chapterId, seriesId, page);
}

export async function fetchKeepScreenOnPref(): Promise<boolean> {
  return ReaderChapterBridge.getKeepScreenOnDuringReading();
}

export async function markChapterRead(seriesId: string, chapterId: string): Promise<void> {
  return SeriesBridge.markChaptersRead(seriesId, [chapterId]);
}

export async function markChapterUnread(seriesId: string, chapterId: string): Promise<void> {
  return SeriesBridge.markChaptersUnread(seriesId, [chapterId]);
}
