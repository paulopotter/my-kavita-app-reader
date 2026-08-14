import { Chapter } from '../../shared/bridge/series';
import { Strings } from '../../shared/i18n/strings';
import { chapterDisplayTitle } from '../../shared/transforms/chapter';

export function progressBarFraction(page: number, scrollFraction: number, totalPages: number): number {
  if (totalPages <= 0) {return 0;}
  return Math.min(1, Math.max(0, (page + scrollFraction) / totalPages));
}

export function chapterHeaderTitle(chapter: Chapter, t: Strings): string {
  return chapterDisplayTitle(chapter, t);
}

export function offlineBannerVisible(isOffline: boolean): boolean {
  return isOffline;
}
