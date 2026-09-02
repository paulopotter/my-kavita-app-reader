// Types for Reader V2 — the ground-up rewrite (plano 017, Task 029 successor).
//
// Why a rewrite: the previous reader (screens/reader/) had TWO parallel mechanisms mutating the
// same chapter-navigation state — the native LazyColumn's continuous scroll (reported via
// onVisiblePageChanged) and the manual arrow — with no coordination. When they raced, the second
// write clobbered the first (real log: pressing "next" on chapter 26 jumped straight to 28).
// Every fix so far was time-based (a 1200ms "settling window") and only lowered the odds.
//
// Reader V2's core idea:
//   - Data model: a POSITION-INDEXED window (a ruler + a pointer), not a named {prev, curr, next}
//     trio. Moving chapter = moving `focusedIndex`, one atomic reducer assignment. No named slot
//     for two writes to fight over.
//   - Flow: ONE function `moveFocus(trigger)` — every trigger (native scroll, arrow, overscroll,
//     future "jump") enters through it. No settling timer.
//   - Coordination: one AbortController per moveFocus call — aborts the previous metadata fetch
//     (bandwidth) AND is the identity token that discards a result that outran the abort.
//
// The rendering layer (webtoon LazyColumn / future horizontal / future paginated) is a SEPARATE
// concern — see modes/reading-mode.types.ts. This file (and the reducer) stay 100% mode-agnostic.

// ── ReaderChapter — a chapter normalized for the reader ───────────────────
//
// A subset of ChapterDigestSuccess / ChapterNeighborDigestSuccess plus what the screen needs
// already materialized (page URLs as a flat array, aspect ratios). Deliberately NOT reusing
// SerieChapter (shared/tools/chapters): that shape carries an `action: ActionContract` the reader
// never uses and doesn't materialize `pages` into URLs.
//
// Note vs. the legacy reader.types.ts: there's no `hasPages: boolean` here — that state is
// LoadedChapterEntry.status ('placeholder' | 'loading' | 'ready' | 'error'), which is explicit
// about the three real cases instead of one overloaded boolean.
export interface ReaderChapter {
  id: string;
  seriesId: string;
  number?: number; // ChapterDigest.number — the series-order 1-indexed position (what the series screen shows)
  decimalNumber?: number; // ChapterDigest.decimalNumber — for ChapterTool.format.title
  specialLabel?: string; // ChapterDigest.specialLabel — for ChapterTool.format.title
  isSpecial?: boolean; // ChapterDigest.isSpecial — for ChapterTool.format.title
  title: string;
  readStatus: 'READ' | 'IN_PROGRESS' | 'UNREAD';
  pageCount: number; // ChapterDigest.pages.count ?? pages.list.length
  pagesRead: number; // ChapterDigest.pages.readCount ?? 0
  // From ChapterDigest.pages.list[].url — a page that failed to resolve becomes '' here, keeping
  // index alignment with pageAspectRatios.
  pageUrls: string[];
  // height / width per page, index-aligned with pageUrls — null means the dimension wasn't
  // available; the native side measures that page once it's decoded on-device.
  pageAspectRatios: (number | null)[];
  // Server-tracked resume point (ChapterDigest.pages.resumePoint): the page the Kavita server
  // thinks the user stopped at, plus WHEN it recorded that. `recordedAtEpochMs` is what
  // resolveInitialPage compares against the local progress's own updatedAtEpochMs — newest wins.
  serverResume: { page: number; recordedAtEpochMs: number | null } | null;
}

// ── The window — a position-indexed ruler, not a named trio ───────────────

export type LoadedChapterStatus = 'placeholder' | 'loading' | 'ready' | 'error';
// placeholder = only series-order metadata known, no getFull fetch dispatched yet
// loading     = ChapterService.getFull in flight
// ready       = pageUrls / pageAspectRatios populated
// error       = fetch failed; the block still renders (no pages), retry possible

export interface LoadedChapterEntry {
  chapter: ReaderChapter;
  status: LoadedChapterStatus;
}

// A CONTIGUOUS subsequence of the series' canonical reading order (same order as
// SerialDigest.chapters.list). `focusedIndex` is the ONE source of truth for "where the user is"
// — there is no separate `curr` field that could desync from the index.
//
// Today the window stays ~3 entries wide (same memory as the old trio). Growing it (free ±100
// navigation) and jumping to a distant chapter are the SAME structural operation: replace
// `entries` with a new subsequence centered on X, `focusedIndex` = X's position in it. Only the
// width policy changes later — never this shape.
export interface ReaderWindow {
  entries: LoadedChapterEntry[];
  focusedIndex: number;
}

// ── Series reading order ─────────────────────────────────────────────────

// Reading order (ascending by number) — the sequence prev/next depend on, not the display sort.
export interface OrderedChapter {
  id: string;
  seriesId: string;
  number?: number;
  decimalNumber?: number;
  specialLabel?: string;
  isSpecial?: boolean;
  title: string;
  readStatus: ReaderChapter['readStatus'];
}

// ── moveFocus — for NATURAL SCROLL crossings only ───────────────────────
//
// The overlay arrows / overscroll do NOT go through here — they reload the target chapter from
// scratch via openChapter (a "location.replace": the LazyColumn remounts on a fresh short
// `blocks` list starting at the target, no programmatic scroll — listState.scrollToItem proved
// unreliable across 8 device builds). moveFocus only handles the continuous webtoon scroll
// between chapters that are ALREADY loaded in the window, where the native list is already
// physically positioned and RN just slides its focus pointer to match.
export type FocusMoveTrigger = {
  source: 'native-scroll';
  reportedChapterId: string;
  page: number;
  pageFraction: number;
  chapterFraction: number;
};

// ── reducer state / actions ─────────────────────────────────────────────

export interface State {
  loading: boolean;
  error: string | null;
  window: ReaderWindow | null;
  // Series name for the top bar. Seeded from the route param when the reader was opened from the
  // series screen (fast-path); otherwise fetched via SerialService.get. Empty until resolved.
  seriesName: string;
  overlayVisible: boolean;
  // reading position (same fields the native list reports atomically)
  currentVisiblePage: number;
  scrollFraction: number; // fraction within the current page (0..1) — what ReadingProgressManager.set persists
  chapterFraction: number; // continuous fraction across the whole chapter (0..1) — progress bar only, never persisted
  // One-shot ABSOLUTE scroll request — used on open / arrow-reload to jump to the resolved
  // initial page (only matters when it's not page 0; the fresh short `blocks` list already starts
  // at the target chapter's top). Consumed via onScrollToChapterHandled → SCROLL_REQUEST_HANDLED.
  // NEVER set by native-scroll.
  scrollRequest: { chapterId: string; page: number } | null;
  offline: boolean;
  // Bumped on every openChapter → WINDOW_READY (screen open, arrow reload, jump). The screen
  // passes it as the `key` of the native list component, so a chapter switch UNMOUNTS the old
  // native View and mounts a fresh one — the new LazyColumn starts at the target chapter's top
  // with no stale scroll offset to fight. NOT bumped by MOVE_FOCUS (natural scroll crossings
  // must NOT remount — that would jank mid-scroll).
  nativeListKey: number;
}

export type ReaderAction =
  | { type: 'LOADING' }
  | { type: 'ERROR'; error: string }
  | {
      // Fresh open / non-adjacent jump landed — the whole window is (re)built and the native list
      // must scroll to `scrollTo`.
      type: 'WINDOW_READY';
      window: ReaderWindow;
      initialPage: number;
      initialScrollFraction: number;
      initialChapterFraction: number;
      scrollTo: { chapterId: string; page: number };
    }
  | {
      // A focus transition. The reducer runs computeWindowAfterFocusMove against ITS OWN
      // state.window + `order` — so two of these dispatched in the same React batch serialize
      // correctly (the 2nd sees the 1st's result), instead of both being computed against a
      // stale snapshot in the hook. `order` is the canonical reading order (from the hook's ref).
      type: 'MOVE_FOCUS';
      trigger: FocusMoveTrigger;
      order: OrderedChapter[];
    }
  | {
      // A wholesale window replacement (openChapter, jump, order-reconcile rebuild) — not a
      // relative move, so it carries the window directly.
      type: 'SET_WINDOW';
      window: ReaderWindow;
      scrollTo: { chapterId: string; page: number } | null;
    }
  | {
      // A chapter's getFull resolved — merge its pages into whichever window slot still holds that
      // id. Guarded at the call site by the AbortController identity check.
      type: 'ENTRY_LOADED';
      chapterId: string;
      chapter: ReaderChapter;
    }
  | { type: 'ENTRY_ERROR'; chapterId: string }
  | { type: 'SET_CURRENT_PAGE'; page: number; scrollFraction: number; chapterFraction: number }
  | { type: 'SCROLL_TO_PAGE'; page: number }
  | { type: 'SCROLL_REQUEST_HANDLED' }
  | { type: 'SERIES_NAME_LOADED'; seriesName: string }
  | { type: 'TOGGLE_OVERLAY' }
  | { type: 'SET_OFFLINE'; offline: boolean }
  | { type: 'OPTIMISTIC_MARK'; chapterId: string; readStatus: ReaderChapter['readStatus'] };
