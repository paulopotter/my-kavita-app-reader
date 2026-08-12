import { Chapter, ChapterSortMode } from '../../shared/bridge/series';
import { Strings } from '../../shared/i18n/strings';

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

export function actionButtonLabel(
  continueChapter: Chapter | null,
  readCount: number,
  totalCount: number,
  t: Strings,
): string {
  if (totalCount === 0) return t.seriesDetailStartReading;
  if (continueChapter === null) return t.seriesDetailRereadFromStart;
  if (readCount === 0) return t.seriesDetailStartReading;
  return t.seriesDetailContinueReading.replace('{0}', continueChapter.number);
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
  return {
    fixedThreshold: isNaN(parsedThreshold) ? undefined : parsedThreshold,
    progressPercent: isNaN(parsedProgress) ? fallbackProgressPercent : parsedProgress,
  };
}
