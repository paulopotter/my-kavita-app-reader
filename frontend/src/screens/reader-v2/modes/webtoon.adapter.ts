import { webtoonReportToTrigger } from '../transforms/reader.transform';
import { windowToWebtoonBlocks } from '../transforms/webtoon-blocks.transform';
import type { ReaderChapterBlock } from '../components/reader-page-list-view';
import type { ReaderModeAdapter } from './reading-mode.types';

// Both members delegate to standalone transforms — the screen and hook use those directly, never
// reach through this object. The adapter exists to formalize the mode contract (and to be the
// registry entry); keeping its methods as thin delegations avoids a second copy of the logic.
export const webtoonAdapter: ReaderModeAdapter<ReaderChapterBlock[]> = {
  mode: 'webtoon',
  toRenderModel: windowToWebtoonBlocks,
  interpretPositionReport: webtoonReportToTrigger,
};
