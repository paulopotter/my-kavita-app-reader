import type { OrderedChapter, ReaderChapter, ReaderWindow, State } from '../reader.types';
import { initialState, reducer } from '../hooks/reader.reducer';

function order(ids: string[]): OrderedChapter[] {
  return ids.map((id, i) => ({
    id,
    seriesId: 's1',
    number: i + 1,
    decimalNumber: i + 1,
    title: id,
    readStatus: 'UNREAD' as const,
  }));
}

function chapter(id: string, over: Partial<ReaderChapter> = {}): ReaderChapter {
  return {
    id,
    seriesId: 's1',
    number: 1,
    title: id,
    readStatus: 'UNREAD',
    pageCount: 5,
    pagesRead: 0,
    pageUrls: ['a', 'b', 'c', 'd', 'e'],
    pageAspectRatios: [1, 1, 1, 1, 1],
    serverResume: null,
    ...over,
  };
}

function windowOf(ids: string[], focusedIndex: number): ReaderWindow {
  return {
    entries: ids.map(id => ({ chapter: chapter(id), status: 'ready' as const })),
    focusedIndex,
  };
}

function withWindow(w: ReaderWindow): State {
  return { ...initialState, loading: false, window: w };
}

describe('reader.reducer', () => {
  it('LOADING resets error and sets loading', () => {
    const s = reducer({ ...initialState, error: 'x', loading: false }, { type: 'LOADING' });
    expect(s).toMatchObject({ loading: true, error: null });
  });

  it('ERROR clears loading and sets the message', () => {
    const s = reducer(initialState, { type: 'ERROR', error: 'boom' });
    expect(s).toMatchObject({ loading: false, error: 'boom' });
  });

  it('WINDOW_READY installs the window and seeds the scroll request', () => {
    const w = windowOf(['c1', 'c2'], 0);
    const s = reducer(initialState, {
      type: 'WINDOW_READY',
      window: w,
      initialPage: 3,
      initialScrollFraction: 0.2,
      initialChapterFraction: 0.4,
      scrollTo: { chapterId: 'c1', page: 3 },
    });
    expect(s.window).toBe(w);
    expect(s.currentVisiblePage).toBe(3);
    expect(s.scrollFraction).toBe(0.2);
    expect(s.chapterFraction).toBe(0.4);
    expect(s.scrollRequest).toEqual({ chapterId: 'c1', page: 3 });
    expect(s.loading).toBe(false);
  });

  it('SET_WINDOW with a scrollTo resets position to the target start', () => {
    const before = { ...withWindow(windowOf(['c1', 'c2', 'c3'], 1)), currentVisiblePage: 8, chapterFraction: 0.9 };
    const next = windowOf(['c1', 'c2', 'c3'], 2);
    const s = reducer(before, { type: 'SET_WINDOW', window: next, scrollTo: { chapterId: 'c3', page: 0 } });
    expect(s.window).toBe(next);
    expect(s.currentVisiblePage).toBe(0);
    expect(s.chapterFraction).toBe(0);
    expect(s.scrollRequest).toEqual({ chapterId: 'c3', page: 0 });
  });

  it('MOVE_FOCUS native-scroll crossing into the next neighbour adopts its position, no scroll request', () => {
    const before = { ...withWindow(windowOf(['c1', 'c2', 'c3'], 1)), currentVisiblePage: 8, scrollRequest: null };
    const s = reducer(before, {
      type: 'MOVE_FOCUS',
      trigger: { source: 'native-scroll', reportedChapterId: 'c3', page: 0, pageFraction: 0, chapterFraction: 0.02 },
      order: order(['c1', 'c2', 'c3', 'c4', 'c5']),
    });
    expect(s.window!.entries[s.window!.focusedIndex].chapter.id).toBe('c3');
    expect(s.currentVisiblePage).toBe(0);
    expect(s.chapterFraction).toBe(0.02);
    expect(s.scrollRequest).toBeNull();
  });

  it('MOVE_FOCUS native-scroll report for the focused chapter is a position-only update', () => {
    const before = withWindow(windowOf(['c1', 'c2', 'c3'], 1));
    const s = reducer(before, {
      type: 'MOVE_FOCUS',
      trigger: { source: 'native-scroll', reportedChapterId: 'c2', page: 4, pageFraction: 0.5, chapterFraction: 0.3 },
      order: order(['c1', 'c2', 'c3', 'c4', 'c5']),
    });
    expect(s.window!.entries[s.window!.focusedIndex].chapter.id).toBe('c2'); // unchanged
    expect(s.currentVisiblePage).toBe(4);
    expect(s.chapterFraction).toBe(0.3);
  });

  it('two native-scroll MOVE_FOCUS in sequence serialize (2nd builds on the 1st) — no stale-snapshot bug', () => {
    const o = order(['c1', 'c2', 'c3', 'c4', 'c5']);
    let s: State = withWindow(windowOf(['c1', 'c2', 'c3'], 1)); // focus c2
    // crossing into c3, then a crossing into c4 (c4 was appended by the first move)
    s = reducer(s, {
      type: 'MOVE_FOCUS',
      trigger: { source: 'native-scroll', reportedChapterId: 'c3', page: 0, pageFraction: 0, chapterFraction: 0 },
      order: o,
    });
    s = reducer(s, {
      type: 'MOVE_FOCUS',
      trigger: { source: 'native-scroll', reportedChapterId: 'c4', page: 0, pageFraction: 0, chapterFraction: 0 },
      order: o,
    });
    expect(s.window!.entries[s.window!.focusedIndex].chapter.id).toBe('c4');
  });

  it('MOVE_FOCUS with no window is a noop', () => {
    const s = reducer(initialState, {
      type: 'MOVE_FOCUS',
      trigger: { source: 'native-scroll', reportedChapterId: 'c1', page: 0, pageFraction: 0, chapterFraction: 0 },
      order: order(['c1', 'c2']),
    });
    expect(s).toBe(initialState);
  });

  it('ENTRY_LOADED merges the chapter into its slot and marks it ready', () => {
    const w: ReaderWindow = {
      entries: [
        { chapter: chapter('c1'), status: 'placeholder' },
        { chapter: chapter('c2'), status: 'ready' },
      ],
      focusedIndex: 1,
    };
    const loaded = chapter('c1', { title: 'Loaded', pageUrls: ['x', 'y'] });
    const s = reducer(withWindow(w), { type: 'ENTRY_LOADED', chapterId: 'c1', chapter: loaded });
    expect(s.window!.entries[0]).toEqual({ chapter: loaded, status: 'ready' });
    expect(s.window!.entries[1].status).toBe('ready'); // untouched
  });

  it('ENTRY_LOADED for an id no longer in the window is a noop', () => {
    const w = windowOf(['c1', 'c2'], 0);
    const s = reducer(withWindow(w), { type: 'ENTRY_LOADED', chapterId: 'cX', chapter: chapter('cX') });
    expect(s.window).toBe(w);
  });

  it('ENTRY_ERROR flips just that entry to error', () => {
    const w: ReaderWindow = {
      entries: [
        { chapter: chapter('c1'), status: 'placeholder' },
        { chapter: chapter('c2'), status: 'placeholder' },
      ],
      focusedIndex: 0,
    };
    const s = reducer(withWindow(w), { type: 'ENTRY_ERROR', chapterId: 'c2' });
    expect(s.window!.entries.map(e => e.status)).toEqual(['placeholder', 'error']);
  });

  it('SET_CURRENT_PAGE updates the three position fields', () => {
    const s = reducer(withWindow(windowOf(['c1'], 0)), {
      type: 'SET_CURRENT_PAGE',
      page: 4,
      scrollFraction: 0.7,
      chapterFraction: 0.8,
    });
    expect(s).toMatchObject({ currentVisiblePage: 4, scrollFraction: 0.7, chapterFraction: 0.8 });
  });

  it('SCROLL_TO_PAGE requests a scroll to that page of the focused chapter', () => {
    const s = reducer(withWindow(windowOf(['c1', 'c2', 'c3'], 1)), { type: 'SCROLL_TO_PAGE', page: 2 });
    expect(s.currentVisiblePage).toBe(2);
    expect(s.scrollRequest).toEqual({ chapterId: 'c2', page: 2 });
  });

  it('SCROLL_REQUEST_HANDLED clears the pending request', () => {
    const before = { ...withWindow(windowOf(['c1'], 0)), scrollRequest: { chapterId: 'c1', page: 3 } };
    expect(reducer(before, { type: 'SCROLL_REQUEST_HANDLED' }).scrollRequest).toBeNull();
  });

  it('OPTIMISTIC_MARK flips the given chapter (not just the focused one) to READ with full pagesRead', () => {
    const w = windowOf(['c1', 'c2', 'c3'], 1);
    const s = reducer(withWindow(w), { type: 'OPTIMISTIC_MARK', chapterId: 'c3', readStatus: 'READ' });
    expect(s.window!.entries[2].chapter.readStatus).toBe('READ');
    expect(s.window!.entries[2].chapter.pagesRead).toBe(s.window!.entries[2].chapter.pageCount);
    expect(s.window!.entries[1].chapter.readStatus).toBe('UNREAD'); // untouched
  });

  it('OPTIMISTIC_MARK to UNREAD zeroes pagesRead', () => {
    const w = windowOf(['c1'], 0);
    w.entries[0].chapter.readStatus = 'READ';
    w.entries[0].chapter.pagesRead = 5;
    const s = reducer(withWindow(w), { type: 'OPTIMISTIC_MARK', chapterId: 'c1', readStatus: 'UNREAD' });
    expect(s.window!.entries[0].chapter).toMatchObject({ readStatus: 'UNREAD', pagesRead: 0 });
  });

  it('TOGGLE_OVERLAY flips overlayVisible', () => {
    expect(reducer(initialState, { type: 'TOGGLE_OVERLAY' }).overlayVisible).toBe(true);
  });

  it('SET_OFFLINE sets the flag', () => {
    expect(reducer(initialState, { type: 'SET_OFFLINE', offline: true }).offline).toBe(true);
  });

  it('SERIES_NAME_LOADED sets the name', () => {
    expect(reducer(initialState, { type: 'SERIES_NAME_LOADED', seriesName: 'Berserk' }).seriesName).toBe('Berserk');
  });
});
