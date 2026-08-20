import { SeriesBridge } from '../../shared/bridge/series';
import { LocalProgress, PageDimension, ReaderChapterBridge, ScreenControlBridge } from '../../shared/bridge/chapter';

export async function fetchServerReadProgress(chapterId: string): Promise<number | null> {
  return ReaderChapterBridge.getServerReadProgress(chapterId);
}

// Best-effort: callers should treat a rejected promise or empty array as "fall back to measuring
// pages as they're decoded" (see ReaderPageList's itemHeights) rather than a hard failure — Kavita
// being unreachable or a chapter not being covered are both expected, non-fatal cases.
export async function fetchPageDimensions(chapterId: string): Promise<PageDimension[]> {
  return ReaderChapterBridge.getPageDimensions(chapterId);
}

// Converts server-reported page dimensions into height/width aspect ratios indexed by page
// number, swallowing any failure into an empty array — see fetchPageDimensions for why that's the
// expected non-fatal case, not an error callers need to handle themselves.
export async function fetchPageAspectRatios(chapterId: string, expectedPageCount: number): Promise<(number | null)[]> {
  try {
    const dimensions = await fetchPageDimensions(chapterId);
    const byPageNumber = new Map(dimensions.map(d => [d.pageNumber, d]));
    return Array.from({ length: expectedPageCount }, (_, pageIndex) => {
      const dimension = byPageNumber.get(pageIndex);
      if (!dimension || dimension.width <= 0) {return null;}
      return dimension.height / dimension.width;
    });
  } catch {
    return Array.from({ length: expectedPageCount }, () => null);
  }
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
  return ScreenControlBridge.getKeepScreenOnDuringReading();
}

export async function keepScreenOn(): Promise<void> {
  return ScreenControlBridge.keepScreenOn();
}

export async function allowScreenOff(): Promise<void> {
  return ScreenControlBridge.allowScreenOff();
}

export async function fetchImmersiveModePref(): Promise<boolean> {
  return ScreenControlBridge.getImmersiveModeDuringReading();
}

export async function setImmersiveMode(enabled: boolean): Promise<void> {
  return ScreenControlBridge.setImmersiveMode(enabled);
}

export async function markChapterRead(seriesId: string, chapterId: string): Promise<void> {
  return SeriesBridge.markChaptersRead(seriesId, [chapterId]);
}

export async function markChapterUnread(seriesId: string, chapterId: string): Promise<void> {
  return SeriesBridge.markChaptersUnread(seriesId, [chapterId]);
}

export async function fetchSeriesName(seriesId: string): Promise<string> {
  const detail = await SeriesBridge.getSeriesDetail(seriesId);
  return detail.name;
}
