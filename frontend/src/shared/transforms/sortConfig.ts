import { ChapterSortMode } from '../bridge/series';
import { Strings } from '../i18n/strings';

export function sortModeLabel(
  mode: ChapterSortMode,
  fixedThreshold: number | undefined,
  progressPercent: number,
  t: Strings,
): string {
  switch (mode) {
    case 'ASCENDING':
      return t.seriesDetailSortAscending;
    case 'DESCENDING':
      return t.seriesDetailSortDescending;
    case 'AUTO_FIXED':
      return t.seriesDetailSortAutoFixed.replace('{0}', String(fixedThreshold ?? 0));
    case 'AUTO_PROGRESS':
      return t.seriesDetailSortAutoProgress.replace('{0}', String(progressPercent));
  }
}

export interface ParsedSortConfig {
  fixedThreshold: number | undefined;
  progressPercent: number;
}

export function parseSortConfigInput(
  thresholdText: string,
  progressText: string,
  fallbackProgressPercent: number,
): ParsedSortConfig {
  const parsedThreshold = parseFloat(thresholdText);
  const parsedProgress = parseInt(progressText, 10);
  const fixedThreshold = isNaN(parsedThreshold) || parsedThreshold < 0 ? undefined : parsedThreshold;
  const progressPercent = isNaN(parsedProgress)
    ? fallbackProgressPercent
    : Math.min(100, Math.max(0, parsedProgress));
  return { fixedThreshold, progressPercent };
}
