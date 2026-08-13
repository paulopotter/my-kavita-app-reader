import { Chapter } from '../../shared/bridge/series';
import { Strings } from '../../shared/i18n/strings';

export { sortModeLabel, parseSortConfigInput } from '../../shared/transforms/sortConfig';
export type { ParsedSortConfig } from '../../shared/transforms/sortConfig';

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
