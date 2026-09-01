// Types for the reader screen's local state machine (useReader / reader.hooks.ts).
//
// Plano 017, Task 029:
//  - Fase 1: reads the current chapter from the new stack (ChapterService.getFull → ChapterDigest).
//  - Fase 2: mark via ChapterTool, server progress via ChapterService.progress, series name.
//  - Fase 4: local reading position via ReadingProgressManager, "newest of {local, server}" wins.
//  - Fase 3: the trio (prev/curr/next) + infinite chapter navigation + the unified switchChapter
//    contract. `prev`/`next` are real ReaderChapters now.

// A chapter normalized for the reader — a subset of ChapterDigestSuccess/ChapterNeighborDigest
// plus what the screen needs already materialized (page URLs as a flat array, aspect ratios).
//
// Deliberately NOT reusing SerieChapter (shared/tools/chapters): that shape carries an
// `action: ActionContract` (navigation intent) the reader never uses, and does not materialize
// `pages` into URLs. This is the reader screen's own shape.
export interface ReaderChapter {
  id: string;
  seriesId: string;
  number?: number; // from ChapterDigest.number (numeric — the legacy Chapter.number was a string)
  decimalNumber?: number; // ChapterDigest.decimalNumber — for ChapterTool.format.title
  specialLabel?: string; // ChapterDigest.specialLabel — for ChapterTool.format.title
  isSpecial?: boolean; // ChapterDigest.isSpecial — for ChapterTool.format.title
  title: string;
  readStatus: 'READ' | 'IN_PROGRESS' | 'UNREAD';
  pageCount: number; // ChapterDigest.pages.count ?? pages.list.length
  pagesRead: number; // ChapterDigest.pages.readCount ?? 0
  // From ChapterDigest.pages.list[].url — a page that failed to resolve (PageDigest.Failure, R8:
  // a failed page is never dropped from the array) becomes '' here, keeping index alignment.
  pageUrls: string[];
  // height / width per page, index-aligned with pageUrls — the ratio the native list expects
  // (see ReaderChapterBlock.pageAspectRatios). null means the dimension wasn't available; the
  // native side falls back to measuring that page once it's decoded on-device.
  pageAspectRatios: (number | null)[];
  // Server-tracked resume point (ChapterDigest.pages.resumePoint): the page the Kavita server
  // thinks the user stopped at, plus WHEN it recorded that. `recordedAtEpochMs` is what
  // resolveInitialPage compares against the local progress's own updatedAtEpochMs — newest wins.
  serverResume: { page: number; recordedAtEpochMs: number | null } | null;
  // Whether this chapter's `pageUrls`/`pageAspectRatios` are actually populated. A neighbor added
  // from orderedChaptersRef alone (no getFull yet) is `false` — the reader still renders its
  // block, just without pages, until loadNeighbor fills it in.
  hasPages: boolean;
}

// The trio. `prev`/`next` are null only at the true ends of the series (no chapter that side) or
// briefly while a neighbor is being fetched.
export interface ViewerState {
  prev: ReaderChapter | null;
  curr: ReaderChapter;
  next: ReaderChapter | null;
}

export interface State {
  loading: boolean;
  error: string | null;
  viewer: ViewerState | null;
  // Series name for the top bar. Seeded from the route param when the reader was opened from the
  // series screen (fast-path); otherwise fetched via SerialService.get. Empty until resolved.
  seriesName: string;
  overlayVisible: boolean;
  currentVisiblePage: number;
  // One-shot "scroll to this page" request — consumed by ReaderScreen and cleared via
  // SCROLL_TO_PAGE_HANDLED. Used for "continue reading" on open, progress-bar jumps, and the
  // overlay arrows / overscroll (which force the target chapter's first page) — never for
  // natural scroll crossing a chapter boundary (the native list is already positioned there).
  scrollToPageRequest: number | null;
  // Which chapter the pending scrollToPageRequest belongs to. The native list scrolls only when
  // this matches a block it's showing — so a request seeded for the new `curr` after a manual
  // switch lands on the right chapter, not whatever was visible before.
  scrollToChapterId: string | null;
  // Fraction within the current page (0..1) — what ReadingProgressManager.set persists.
  scrollFraction: number;
  // Continuous fraction across the whole chapter (0..1) — progress bar only, never persisted.
  chapterFraction: number;
  offline: boolean;
  // True while a switchChapter is in flight — mutual exclusion so natural-scroll boundary
  // crossings and the overlay arrows can't both drive a switch at the same time (the legacy
  // dual-mechanism race, plan 017 Task 029's documented root cause).
  isSwitching: boolean;
}

// The useReducer message type. Named ReaderAction (not the bare `Action`) to avoid colliding
// with the new model's ActionContract / createNavigateAction (UI interaction intent), which is a
// different concept — this is a reducer message, local to the reader screen.
export type ReaderAction =
  | { type: 'LOADING' }
  | { type: 'ERROR'; error: string }
  | {
      type: 'VIEWER_READY';
      viewer: ViewerState;
      initialPage: number;
      initialScrollFraction: number;
      initialChapterFraction: number;
      // Present for a fresh open / manual switch (scroll the native list to initialPage of
      // viewer.curr); absent for a natural-scroll boundary crossing (the list is already there).
      scrollToChapterId?: string;
    }
  | {
      // Natural-scroll boundary crossing — the native list already scrolled into the neighbour.
      // Slide the trio, keep the position the atomic native payload reported, NEVER emit a
      // programmatic scroll.
      type: 'SET_VIEWER';
      viewer: ViewerState;
      page: number;
      scrollFraction: number;
      chapterFraction: number;
    }
  | {
      // Overlay arrow / overscroll — the target chapter is already in `blocks`. Slide the trio
      // AND ask the native list to scroll to `page` of `chapterId`.
      type: 'SCROLL_TO_CHAPTER';
      viewer: ViewerState;
      chapterId: string;
      page: number;
    }
  // A chapter's pages finished loading — merge them into whichever trio slot it now occupies
  // (prev/curr/next). Doesn't move the reading position.
  | { type: 'SET_TRIO_SLOT'; slot: 'prev' | 'curr' | 'next'; chapter: ReaderChapter }
  // Re-apply the series-order `number` to every chapter in the trio — used once the order lands
  // after the trio was already built with the isolated (wrong) number.
  | { type: 'PATCH_NUMBERS'; numberById: Record<string, number> }
  | { type: 'SET_CURRENT_PAGE'; page: number; scrollFraction: number; chapterFraction: number }
  | { type: 'SCROLL_TO_PAGE'; page: number }
  | { type: 'SCROLL_TO_PAGE_HANDLED' }
  | { type: 'SERIES_NAME_LOADED'; seriesName: string }
  | { type: 'TOGGLE_OVERLAY' }
  | { type: 'SET_OFFLINE'; offline: boolean }
  | { type: 'SET_SWITCHING'; isSwitching: boolean }
  | { type: 'OPTIMISTIC_MARK_READ'; chapterId: string }
  | { type: 'OPTIMISTIC_MARK_UNREAD'; chapterId: string };
