// Reader V2 — pure reducer, extracted from the hook so every ReaderAction is unit-testable
// against a ReaderWindow without mounting React.
//
// The reducer OWNS the window. A relative focus move is dispatched as MOVE_FOCUS { trigger, order }
// and the transition (computeWindowAfterFocusMove) is computed HERE, against this reducer's own
// state.window — so two MOVE_FOCUS in the same React batch serialize correctly (the 2nd builds on
// the 1st's result). Nothing in the hook keeps a parallel copy of the window.

import { computeWindowAfterFocusMove } from '../transforms';
import type { LoadedChapterEntry, ReaderAction, ReaderWindow, State } from '../reader.types';

export const initialState: State = {
  loading: true,
  error: null,
  window: null,
  seriesName: '',
  overlayVisible: false,
  currentVisiblePage: 0,
  scrollFraction: 0,
  chapterFraction: 0,
  scrollRequest: null,
  offline: false,
  nativeListKey: 0,
};

function mapEntry(
  window: ReaderWindow,
  chapterId: string,
  fn: (e: LoadedChapterEntry) => LoadedChapterEntry,
): ReaderWindow {
  const idx = window.entries.findIndex(e => e.chapter.id === chapterId);
  if (idx === -1) {return window;}
  const entries = window.entries.slice();
  entries[idx] = fn(entries[idx]);
  return { ...window, entries };
}

export function reducer(state: State, action: ReaderAction): State {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null };

    case 'ERROR':
      return { ...state, loading: false, error: action.error };

    case 'WINDOW_READY':
      return {
        ...state,
        loading: false,
        error: null,
        window: action.window,
        currentVisiblePage: action.initialPage,
        scrollFraction: action.initialScrollFraction,
        chapterFraction: action.initialChapterFraction,
        // "continue reading" jump to a non-zero initial page. A fresh remounted list already
        // starts at page 0, so this only matters when initialPage > 0.
        scrollRequest: action.scrollTo,
        // Force the native list to remount (see State.nativeListKey) — this is the reload path
        // (open / arrow / jump). The old native View is torn down; the new one is built straight
        // onto the target chapter, so there is no surviving scroll position to fight.
        nativeListKey: state.nativeListKey + 1,
      };

    case 'SET_WINDOW':
      return {
        ...state,
        window: action.window,
        currentVisiblePage: action.scrollTo ? action.scrollTo.page : state.currentVisiblePage,
        scrollFraction: action.scrollTo ? 0 : state.scrollFraction,
        chapterFraction: action.scrollTo ? 0 : state.chapterFraction,
        scrollRequest: action.scrollTo ?? state.scrollRequest,
      };

    case 'MOVE_FOCUS': {
      if (!state.window) {return state;}
      const outcome = computeWindowAfterFocusMove(state.window, action.order, action.trigger);
      if (outcome.kind === 'noop') {return state;}
      if (outcome.kind === 'position-only') {
        return {
          ...state,
          currentVisiblePage: outcome.page,
          scrollFraction: outcome.pageFraction,
          chapterFraction: outcome.chapterFraction,
        };
      }
      // focus-moved (natural crossing): adopt the new chapter's position from the crossing report
      // so the progress bar / page dots follow the new chapter immediately. No scroll request —
      // the native list is already physically there.
      return {
        ...state,
        window: outcome.window,
        currentVisiblePage: outcome.position.page,
        scrollFraction: outcome.position.pageFraction,
        chapterFraction: outcome.position.chapterFraction,
      };
    }

    case 'ENTRY_LOADED': {
      if (!state.window) {return state;}
      return {
        ...state,
        window: mapEntry(state.window, action.chapterId, () => ({
          chapter: action.chapter,
          status: 'ready',
        })),
      };
    }

    case 'ENTRY_ERROR': {
      if (!state.window) {return state;}
      return {
        ...state,
        window: mapEntry(state.window, action.chapterId, e => ({ ...e, status: 'error' })),
      };
    }

    case 'SET_CURRENT_PAGE':
      return {
        ...state,
        currentVisiblePage: action.page,
        scrollFraction: action.scrollFraction,
        chapterFraction: action.chapterFraction,
      };

    case 'SCROLL_TO_PAGE':
      return {
        ...state,
        currentVisiblePage: action.page,
        scrollRequest: state.window
          ? { chapterId: state.window.entries[state.window.focusedIndex].chapter.id, page: action.page }
          : state.scrollRequest,
      };

    case 'SCROLL_REQUEST_HANDLED':
      return { ...state, scrollRequest: null };

    case 'SERIES_NAME_LOADED':
      return { ...state, seriesName: action.seriesName };

    case 'TOGGLE_OVERLAY':
      return { ...state, overlayVisible: !state.overlayVisible };

    case 'SET_OFFLINE':
      return { ...state, offline: action.offline };

    case 'OPTIMISTIC_MARK': {
      if (!state.window) {return state;}
      return {
        ...state,
        window: mapEntry(state.window, action.chapterId, e => ({
          ...e,
          chapter: {
            ...e.chapter,
            readStatus: action.readStatus,
            pagesRead: action.readStatus === 'READ' ? e.chapter.pageCount : 0,
          },
        })),
      };
    }

    default:
      return state;
  }
}
