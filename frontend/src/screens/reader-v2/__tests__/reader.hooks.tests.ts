import { act, renderHook, waitFor } from '@testing-library/react-native';

// ── mocks ───────────────────────────────────────────────────────────────

const mockGetFull = jest.fn();
const mockProgressSet = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../shared/services/chapters', () => ({
  ChapterService: {
    getFull: (...a: unknown[]) => mockGetFull(...a),
    progress: { set: (...a: unknown[]) => mockProgressSet(...a) },
  },
}));

const mockSerialGet = jest.fn();
jest.mock('../../../shared/services/serials', () => ({
  SerialService: { get: (...a: unknown[]) => mockSerialGet(...a) },
}));

const mockMarkRead = jest.fn();
const mockMarkUnread = jest.fn();
let readStatusChangedHandler: ((p: unknown) => void) | null = null;
jest.mock('../../../shared/tools/chapters', () => ({
  ChapterTool: {
    format: { title: (c: { title: string }) => c.title },
    mark: {
      read: (...a: unknown[]) => mockMarkRead(...a),
      unread: (...a: unknown[]) => mockMarkUnread(...a),
    },
  },
  ChapterEvents: { readStatusChanged: { name: 'chapterReadStatusChanged' } },
}));

jest.mock('../../../shared/managers/events', () => ({
  createEvent: (name: string) => ({ name }),
  EventBus: { emit: jest.fn() },
  useEvent: (_token: unknown, handler: (p: unknown) => void) => {
    readStatusChangedHandler = handler;
  },
}));

const mockProgressGet = jest.fn().mockResolvedValue(null);
const mockProgressSetLocal = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../shared/managers/reading-progress', () => ({
  ReadingProgressManager: {
    get: (...a: unknown[]) => mockProgressGet(...a),
    set: (...a: unknown[]) => mockProgressSetLocal(...a),
  },
}));

const mockReadingModeGet = jest.fn().mockResolvedValue({ mode: 'webtoon' });
jest.mock('../reading-mode.tool', () => ({
  ReadingModeTool: { get: (...a: unknown[]) => mockReadingModeGet(...a) },
}));

jest.mock('../reader.screen-control', () => ({
  ReaderScreenControl: {
    fetchKeepScreenOnPref: jest.fn().mockResolvedValue(false),
    keepScreenOn: jest.fn().mockResolvedValue(undefined),
    allowScreenOff: jest.fn().mockResolvedValue(undefined),
    fetchImmersiveModePref: jest.fn().mockResolvedValue(false),
    setImmersiveMode: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn(() => jest.fn()) },
}));

import { useReader } from '../hooks/reader.hooks';

// ── digest fixtures ─────────────────────────────────────────────────────

function pages(n: number) {
  return {
    count: n,
    readCount: 0,
    list: Array.from({ length: n }, (_, i) => ({ isSuccess: true, url: `p${i}`, width: 100, height: 150 })),
  };
}

function chapterDigest(
  id: string,
  number: number,
  opts: { prev?: string; next?: string; pageCount?: number } = {},
) {
  return {
    isSuccess: true,
    id,
    seriesId: 's1',
    number,
    decimalNumber: number,
    title: id,
    readStatus: 'UNREAD',
    pages: pages(opts.pageCount ?? 5),
    prevChapter: opts.prev
      ? { isSuccess: true, id: opts.prev, seriesId: 's1', number: number - 1, title: opts.prev, readStatus: 'UNREAD', pages: pages(5) }
      : undefined,
    nextChapter: opts.next
      ? { isSuccess: true, id: opts.next, seriesId: 's1', number: number + 1, title: opts.next, readStatus: 'UNREAD', pages: pages(5) }
      : undefined,
  };
}

function seriesDigest(ids: string[]) {
  return {
    isSuccess: true,
    name: 'Minha Série',
    chapters: {
      list: ids.map((id, i) => ({
        isSuccess: true,
        id,
        seriesId: 's1',
        number: i + 1,
        decimalNumber: i + 1,
        title: id,
        readStatus: 'UNREAD',
      })),
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  readStatusChangedHandler = null;
  mockProgressGet.mockResolvedValue(null);
  mockReadingModeGet.mockResolvedValue({ mode: 'webtoon' });
  mockSerialGet.mockResolvedValue(seriesDigest(['c1', 'c2', 'c3', 'c4', 'c5']));
});

// ── tests ───────────────────────────────────────────────────────────────

describe('useReader V2 — open', () => {
  it('opens the chapter and builds a window focused on it', async () => {
    mockGetFull.mockResolvedValue(chapterDigest('c3', 3, { prev: 'c2', next: 'c4' }));
    const { result } = renderHook(() => useReader('s1', 'c3'));
    await waitFor(() => expect(result.current.window).not.toBeNull());
    const w = result.current.window!;
    expect(w.entries[w.focusedIndex].chapter.id).toBe('c3');
    expect(w.entries[w.focusedIndex].status).toBe('ready');
  });

  it('surfaces an error (no window) when the digest resolves as Failure', async () => {
    mockGetFull.mockResolvedValue({ isSuccess: false, error: { message: 'not found' } });
    const { result } = renderHook(() => useReader('s1', 'c3'));
    await waitFor(() => expect(result.current.error).toBe('not found'));
    expect(result.current.window).toBeNull();
  });

  it('resolves the initial page from local progress when newer than the server', async () => {
    mockGetFull.mockResolvedValue(chapterDigest('c1', 1, { next: 'c2', pageCount: 20 }));
    mockProgressGet.mockResolvedValue({ seriesId: 's1', page: 8, scrollFraction: 0.3, updatedAtEpochMs: 999 });
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.window).not.toBeNull());
    expect(result.current.currentVisiblePage).toBe(8);
  });
});

describe('useReader V2 — chapter navigation', () => {
  it('the arrow RELOADS the next chapter (fresh window centered on it) — "location.replace"', async () => {
    mockGetFull.mockImplementation(({ chapterId }: { chapterId: string }) =>
      Promise.resolve(
        chapterId === 'c3'
          ? chapterDigest('c3', 3, { prev: 'c2', next: 'c4' })
          : chapterDigest('c4', 4, { prev: 'c3', next: 'c5' }),
      ),
    );
    const { result } = renderHook(() => useReader('s1', 'c3'));
    await waitFor(() => expect(result.current.window!.entries[result.current.window!.focusedIndex].chapter.id).toBe('c3'));
    mockGetFull.mockClear();

    act(() => result.current.goToAdjacent('next'));

    // openChapter('c4') runs: getFull for c4, a fresh window centered on c4
    await waitFor(() => expect(mockGetFull).toHaveBeenCalledWith({ seriesId: 's1', chapterId: 'c4', force: undefined }));
    await waitFor(() =>
      expect(result.current.window!.entries[result.current.window!.focusedIndex].chapter.id).toBe('c4'),
    );
    expect(result.current.currentVisiblePage).toBe(0); // starts at the top
  });

  it('the arrow at the true series end is a no-op (no reload)', async () => {
    // c5 is the last chapter in the mocked series order (see beforeEach)
    mockGetFull.mockResolvedValue(chapterDigest('c5', 5, { prev: 'c4' }));
    const { result } = renderHook(() => useReader('s1', 'c5'));
    await waitFor(() => expect(result.current.window!.entries[result.current.window!.focusedIndex].chapter.id).toBe('c5'));
    mockGetFull.mockClear();

    act(() => result.current.goToAdjacent('next'));

    // nothing after c5 → openChapter never called
    await new Promise<void>(resolve => setTimeout(() => resolve(), 10));
    expect(mockGetFull).not.toHaveBeenCalled();
  });

  it('a native-scroll report for the focused chapter is a position-only update, not a focus move', async () => {
    mockGetFull.mockResolvedValue(chapterDigest('c3', 3, { prev: 'c2', next: 'c4', pageCount: 10 }));
    const { result } = renderHook(() => useReader('s1', 'c3'));
    await waitFor(() => expect(result.current.window).not.toBeNull());

    act(() => result.current.onNativePosition('c3', 4, 0.5, 0.45));

    expect(result.current.window!.entries[result.current.window!.focusedIndex].chapter.id).toBe('c3');
    expect(result.current.currentVisiblePage).toBe(4);
    expect(result.current.chapterFraction).toBe(0.45);
  });

  it('drops an internally-inconsistent native-scroll report (page near the end, chapterFraction ~0)', async () => {
    // Device rc35: Kotlin emitted page=9/10 with chapterFraction=0.009 mid-transition. Adopting it
    // splits the overlay — dots jump to the end, progress bar stays empty. The report is dropped.
    mockGetFull.mockResolvedValue(chapterDigest('c3', 3, { prev: 'c2', next: 'c4', pageCount: 10 }));
    const { result } = renderHook(() => useReader('s1', 'c3'));
    await waitFor(() => expect(result.current.window).not.toBeNull());
    const pageBefore = result.current.currentVisiblePage;
    const fracBefore = result.current.chapterFraction;

    act(() => result.current.onNativePosition('c3', 9, 1, 0.009));

    expect(result.current.currentVisiblePage).toBe(pageBefore); // unchanged
    expect(result.current.chapterFraction).toBe(fracBefore); // unchanged
  });

  it('a native scroll event that arrives right at open (before window ready) does not crash', async () => {
    // Repro of the rc30 device crash: onVisiblePageChanged fired on the first frame and the
    // handler dereferenced an undefined adapter. onNativePosition must be a no-op safe call at
    // any time, including before the window exists.
    mockGetFull.mockReturnValue(new Promise(() => {})); // never resolves — window stays null
    const { result } = renderHook(() => useReader('s1', 'c1'));
    expect(() => {
      act(() => result.current.onNativePosition('c1', 0, 0, 0));
    }).not.toThrow();
  });

  it('a native-scroll crossing into the next neighbour slides the focus', async () => {
    mockGetFull.mockResolvedValue(chapterDigest('c3', 3, { prev: 'c2', next: 'c4' }));
    const { result } = renderHook(() => useReader('s1', 'c3'));
    await waitFor(() => expect(result.current.window!.entries[result.current.window!.focusedIndex].chapter.id).toBe('c3'));

    act(() => result.current.handleScrollRequestHandled());
    act(() => result.current.onNativePosition('c3', 0, 0, 0.01));
    act(() => result.current.onNativePosition('c4', 0, 0, 0.02));

    expect(result.current.window!.entries[result.current.window!.focusedIndex].chapter.id).toBe('c4');
  });
});

describe('useReader V2 — neighbour prefetch', () => {
  it('prefetches the placeholder NEXT chapter of the opened one', async () => {
    // buildWindow is [opened, next] — the prev is added only by a backward scroll, so only the
    // next placeholder is prefetched on open.
    mockGetFull.mockImplementation(({ chapterId }: { chapterId: string }) =>
      Promise.resolve(
        chapterId === 'c3'
          ? chapterDigest('c3', 3) // no embedded next → c4 lands as a placeholder
          : chapterDigest(chapterId, Number(chapterId.slice(1))),
      ),
    );
    const { result } = renderHook(() => useReader('s1', 'c3'));
    await waitFor(() => expect(result.current.window!.entries[result.current.window!.focusedIndex].chapter.id).toBe('c3'));

    await waitFor(() => expect(mockGetFull).toHaveBeenCalledWith({ seriesId: 's1', chapterId: 'c4' }));
  });
});

describe('useReader V2 — cross-screen mark', () => {
  it('applies a readStatusChanged event for a chapter in the window', async () => {
    mockGetFull.mockResolvedValue(chapterDigest('c3', 3, { prev: 'c2', next: 'c4' }));
    const { result } = renderHook(() => useReader('s1', 'c3'));
    await waitFor(() => expect(result.current.window).not.toBeNull());

    act(() => readStatusChangedHandler!({ chapter: { id: 'c3', seriesId: 's1' }, changed: { readStatus: 'READ' } }));

    const focused = result.current.window!.entries[result.current.window!.focusedIndex].chapter;
    expect(focused.readStatus).toBe('READ');
  });

  it('ignores a readStatusChanged event for a chapter not in the window', async () => {
    mockGetFull.mockResolvedValue(chapterDigest('c3', 3, { prev: 'c2', next: 'c4' }));
    const { result } = renderHook(() => useReader('s1', 'c3'));
    await waitFor(() => expect(result.current.window).not.toBeNull());

    act(() => readStatusChangedHandler!({ chapter: { id: 'cZ', seriesId: 's1' }, changed: { readStatus: 'READ' } }));

    expect(
      result.current.window!.entries.every(e => e.chapter.readStatus === 'UNREAD'),
    ).toBe(true);
  });
});

describe('useReader V2 — series name', () => {
  it('uses the hint without waiting on a fetch', async () => {
    mockGetFull.mockResolvedValue(chapterDigest('c1', 1, { next: 'c2' }));
    const { result } = renderHook(() => useReader('s1', 'c1', 'Hint Name'));
    expect(result.current.seriesName).toBe('Hint Name');
  });

  it('fetches the series name when no hint is given', async () => {
    mockGetFull.mockResolvedValue(chapterDigest('c1', 1, { next: 'c2' }));
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.seriesName).toBe('Minha Série'));
  });
});

describe('useReader V2 — arrow enablement', () => {
  it('hasPrevChapter/hasNextChapter come from the canonical order, not the window shape', async () => {
    // series order is c1..c5 (beforeEach). Open c3, whose window is just [c3, c4].
    mockGetFull.mockResolvedValue(chapterDigest('c3', 3));
    const { result } = renderHook(() => useReader('s1', 'c3'));
    await waitFor(() => expect(result.current.window!.entries[result.current.window!.focusedIndex].chapter.id).toBe('c3'));

    // window has no entry before c3, but the series does → ▲ enabled
    expect(result.current.hasPrevChapter).toBe(true);
    expect(result.current.hasNextChapter).toBe(true);
  });

  it('hasPrevChapter is false at the first chapter of the series', async () => {
    mockGetFull.mockResolvedValue(chapterDigest('c1', 1));
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.window!.entries[result.current.window!.focusedIndex].chapter.id).toBe('c1'));

    expect(result.current.hasPrevChapter).toBe(false);
    expect(result.current.hasNextChapter).toBe(true);
  });

  it('hasNextChapter is false at the last chapter of the series', async () => {
    mockGetFull.mockResolvedValue(chapterDigest('c5', 5));
    const { result } = renderHook(() => useReader('s1', 'c5'));
    await waitFor(() => expect(result.current.window!.entries[result.current.window!.focusedIndex].chapter.id).toBe('c5'));

    expect(result.current.hasPrevChapter).toBe(true);
    expect(result.current.hasNextChapter).toBe(false);
  });
});
