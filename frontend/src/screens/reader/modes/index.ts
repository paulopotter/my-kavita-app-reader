import type { ReaderModeAdapter, ReadingMode } from './reading-mode.types';
import { webtoonAdapter } from './webtoon.adapter';
import { horizontalAdapter } from './horizontal.adapter';
import { paginatedAdapter } from './paginated.adapter';

export type { ReaderModeAdapter, ReadingMode } from './reading-mode.types';
export { webtoonAdapter } from './webtoon.adapter';

export const READER_MODE_ADAPTERS: Record<ReadingMode, ReaderModeAdapter<unknown>> = {
  webtoon: webtoonAdapter,
  horizontal: horizontalAdapter,
  paginated: paginatedAdapter,
};
