import type { Strings } from '../../../shared/i18n/strings';
import type { FocusMoveTrigger, OrderedChapter, ReaderWindow } from '../reader.types';

// The 3 reading modes the app will support. Only 'webtoon' is implemented now; 'horizontal' and
// 'paginated' are stubs that keep the door open (see horizontal.adapter.ts / paginated.adapter.ts).
export type ReadingMode = 'webtoon' | 'horizontal' | 'paginated';

// A reading-mode adapter translates between the mode-agnostic ReaderWindow (pure data) and what a
// specific mode's UI consumes. The reducer and moveFocus never see this — only the screen does,
// via the selected adapter. Adding a mode = a new adapter + a new native view, with zero change
// to the data model / moveFocus contract.
export interface ReaderModeAdapter<TRenderModel> {
  readonly mode: ReadingMode;

  // ReaderWindow -> the render model this mode's UI needs. Pure — no I/O, no state outside args.
  toRenderModel(window: ReaderWindow, order: OrderedChapter[], t: Strings): TRenderModel;

  // This mode's raw position report (each mode has its own notion of "the user turned the page":
  // continuous scroll for webtoon, discrete swipe for paginated) -> the generic FocusMoveTrigger.
  // Returns null when the raw event carries nothing actionable.
  interpretPositionReport(raw: unknown): FocusMoveTrigger | null;
}
