import type { ReaderModeAdapter } from './reading-mode.types';

// STUB — paginated (one page at a time, manual advance) reading mode. Not implemented yet.
//
// When implemented, note it needs a DIFFERENT native Composable (HorizontalPager, not the
// webtoon LazyColumn) — the adapter doesn't remove that need, it isolates WHERE the choice enters
// (a switch(readingMode) in reader.screen.tsx picking which <ReaderXxxView> to render), with no
// change to the reducer / moveFocus / data model.
//
// The "infinite vs. tap-to-load-next" difference is a POLICY of when moveFocus fires
// automatically, not a property of this adapter: paginated would expose a "load next chapter"
// action calling moveFocus manually instead of scroll firing it automatically.
export const paginatedAdapter: ReaderModeAdapter<never> = {
  mode: 'paginated',
  toRenderModel() {
    throw new Error('paginated reading mode not implemented');
  },
  interpretPositionReport() {
    return null;
  },
};
