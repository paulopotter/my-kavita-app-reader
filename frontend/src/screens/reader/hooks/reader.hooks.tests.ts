import { act, renderHook, waitFor } from '@testing-library/react-native';

// ── mocks ────────────────────────────────────────────────────────────────

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn().mockResolvedValue({ isConnected: true }),
  },
}));

jest.mock('../../../shared/services/chapters', () => ({
  ChapterService: {
    getFull: jest.fn(),
    progress: { set: jest.fn().mockResolvedValue(undefined) },
  },
}));

jest.mock('../../../shared/services/serials', () => ({
  SerialService: { get: jest.fn().mockResolvedValue({ isSuccess: true, id: 's1', name: 'Série Um' }) },
}));

// The real ChapterTool.mark.* calls onUpdate(optimistic) synchronously before resolving — the
// mock mirrors that so the hook's applyMarkUpdate (→ dispatch) runs, same as in production.
const mockMarkRead = jest.fn(({ chapterId, seriesId, onUpdate }: any) => {
  onUpdate?.({ chapterId, seriesId, readStatus: 'READ' });
  return Promise.resolve({ chapterId, seriesId, readStatus: 'READ' });
});
const mockMarkUnread = jest.fn(({ chapterId, seriesId, onUpdate }: any) => {
  onUpdate?.({ chapterId, seriesId, readStatus: 'UNREAD' });
  return Promise.resolve({ chapterId, seriesId, readStatus: 'UNREAD' });
});
let capturedEventHandler: ((p: unknown) => void) | null = null;

jest.mock('../../../shared/tools/chapters', () => {
  const actual = jest.requireActual('../../../shared/tools/chapters');
  return {
    ...actual,
    ChapterTool: {
      ...actual.ChapterTool,
      mark: {
        read: (args: unknown) => mockMarkRead(args),
        unread: (args: unknown) => mockMarkUnread(args),
      },
    },
  };
});

jest.mock('../../../shared/managers/events', () => {
  const actual = jest.requireActual('../../../shared/managers/events');
  return {
    ...actual,
    EventBus: { ...actual.EventBus, emit: jest.fn() },
    useEvent: (_token: unknown, handler: (p: unknown) => void) => {
      capturedEventHandler = handler;
    },
  };
});

const mockProgressGet = jest.fn();
const mockProgressSetLocal = jest.fn().mockResolvedValue(undefined);
const mockProgressClear = jest.fn().mockResolvedValue(undefined);
const mockFetchKeepScreenOnPref = jest.fn().mockResolvedValue(false);
const mockKeepScreenOnBridge = jest.fn().mockResolvedValue(undefined);
const mockAllowScreenOff = jest.fn().mockResolvedValue(undefined);
const mockFetchImmersiveModePref = jest.fn().mockResolvedValue(false);
const mockSetImmersiveMode = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../shared/managers/reading-progress', () => ({
  ReadingProgressManager: {
    get: (...a: unknown[]) => mockProgressGet(...a),
    set: (...a: unknown[]) => mockProgressSetLocal(...a),
    clear: (...a: unknown[]) => mockProgressClear(...a),
  },
}));

jest.mock('../ReaderService', () => ({
  fetchKeepScreenOnPref: (...a: unknown[]) => mockFetchKeepScreenOnPref(...a),
  keepScreenOn: (...a: unknown[]) => mockKeepScreenOnBridge(...a),
  allowScreenOff: (...a: unknown[]) => mockAllowScreenOff(...a),
  fetchImmersiveModePref: (...a: unknown[]) => mockFetchImmersiveModePref(...a),
  setImmersiveMode: (...a: unknown[]) => mockSetImmersiveMode(...a),
}));

import { ChapterService } from '../../../shared/services/chapters';
import { EventBus } from '../../../shared/managers/events';
import { isChapterEffectivelyRead, resolveInitialPage, reducer, shouldUnmarkOnReread, toReaderChapter, useReader } from './reader.hooks';
import type { ChapterDigestSuccess } from '../../../shared/bridge/digest';
import type { ReaderChapter, State } from '../reader.types';

const mockGetFull = ChapterService.getFull as jest.Mock;
const mockProgressSet = ChapterService.progress.set as jest.Mock;
const mockEventEmit = EventBus.emit as jest.Mock;

const server = {
  groupId: 'g1', groupName: 'g', providerId: 'kavita', urlId: 'u1',
  url: 'https://example.invalid', timeoutMs: 5000, priority: 0,
};

function makePage(number: number, over: Partial<Record<string, unknown>> = {}) {
  return {
    isSuccess: true as const,
    id: `c1:${number}`,
    number,
    url: `https://example.invalid/p${number}.jpg`,
    hasFetchedDimensions: true,
    width: 800,
    height: 1200,
    resolvedAtEpochMs: 1,
    server,
    cache: null,
    ...over,
  };
}

function makeDigest(over: Partial<ChapterDigestSuccess> = {}): ChapterDigestSuccess {
  return {
    isSuccess: true,
    id: 'c1',
    seriesId: 's1',
    number: 1,
    title: 'A Chegada',
    coverImage: { url: '', hasFetchedDimensions: false, resolvedAtEpochMs: 0, server, cache: null },
    readStatus: 'UNREAD',
    pages: {
      count: 3,
      readCount: 0,
      total: 3,
      list: [makePage(0), makePage(1), makePage(2)],
    },
    resolvedAtEpochMs: 1,
    server,
    cache: null,
    ...over,
  } as ChapterDigestSuccess;
}

function makeReaderChapter(over: Partial<ReaderChapter> = {}): ReaderChapter {
  return {
    id: 'c1',
    seriesId: 's1',
    number: 1,
    title: 'A Chegada',
    readStatus: 'UNREAD',
    pageCount: 3,
    pagesRead: 0,
    pageUrls: ['a', 'b', 'c'],
    pageAspectRatios: [1.5, 1.5, 1.5],
    serverResume: null,
    hasPages: true,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockGetFull.mockResolvedValue(makeDigest());
  mockProgressGet.mockResolvedValue(null);
  mockProgressSetLocal.mockResolvedValue(undefined);
  mockProgressSet.mockResolvedValue(undefined);
  capturedEventHandler = null;
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// ── pure helpers ─────────────────────────────────────────────────────────

describe('toReaderChapter', () => {
  it('maps a ChapterDigestSuccess to the flat ReaderChapter shape', () => {
    const c = toReaderChapter(makeDigest());
    expect(c).toMatchObject({
      id: 'c1',
      seriesId: 's1',
      number: 1,
      title: 'A Chegada',
      readStatus: 'UNREAD',
      pageCount: 3,
      pagesRead: 0,
    });
    expect(c.pageUrls).toEqual([
      'https://example.invalid/p0.jpg',
      'https://example.invalid/p1.jpg',
      'https://example.invalid/p2.jpg',
    ]);
    // height / width = 1200 / 800 = 1.5
    expect(c.pageAspectRatios).toEqual([1.5, 1.5, 1.5]);
  });

  it('keeps index alignment when a page failed to resolve (PageDigest.Failure)', () => {
    const digest = makeDigest({
      pages: {
        count: 2, readCount: 0, total: 2,
        list: [makePage(0), { isSuccess: false, error: { message: 'gone' } } as never],
      },
    });
    const c = toReaderChapter(digest);
    expect(c.pageUrls).toEqual(['https://example.invalid/p0.jpg', '']);
    expect(c.pageAspectRatios).toEqual([1.5, null]);
  });

  it('falls back to list.length / 0 when count/readCount are absent', () => {
    const digest = makeDigest({ pages: { list: [makePage(0), makePage(1)] } as never });
    const c = toReaderChapter(digest);
    expect(c.pageCount).toBe(2);
    expect(c.pagesRead).toBe(0);
  });

  it('carries the server resume point with its recorded timestamp', () => {
    const digest = makeDigest({
      pages: {
        count: 3, readCount: 1, total: 3,
        resumePoint: { stoppedAtPageIndex: 2, recordedAtEpochMs: 1_700_000 },
        list: [makePage(0), makePage(1), makePage(2)],
      },
    });
    expect(toReaderChapter(digest).serverResume).toEqual({ page: 2, recordedAtEpochMs: 1_700_000 });
  });

  it('serverResume is null when there is no resume point', () => {
    expect(toReaderChapter(makeDigest()).serverResume).toBeNull();
  });
});

describe('isChapterEffectivelyRead', () => {
  it('is true when readStatus is READ', () => {
    expect(isChapterEffectivelyRead(makeReaderChapter({ readStatus: 'READ' }))).toBe(true);
  });
  it('is true when pagesRead / pageCount crosses 98%', () => {
    expect(isChapterEffectivelyRead(makeReaderChapter({ pageCount: 100, pagesRead: 99 }))).toBe(true);
  });
  it('is false below 98%', () => {
    expect(isChapterEffectivelyRead(makeReaderChapter({ pageCount: 100, pagesRead: 50 }))).toBe(false);
  });
  it('is false when pageCount is 0', () => {
    expect(isChapterEffectivelyRead(makeReaderChapter({ pageCount: 0, pagesRead: 0 }))).toBe(false);
  });
});

describe('resolveInitialPage', () => {
  const localRec = (page: number, updatedAtEpochMs: number, scrollFraction = 0) => ({
    seriesId: 's1', page, scrollFraction, updatedAtEpochMs,
  });

  it('starts at 0 for a read chapter, ignoring local progress (marking read = reread from start)', () => {
    expect(
      resolveInitialPage(makeReaderChapter({ readStatus: 'READ', pageCount: 15 }), localRec(11, 5000, 0.4)),
    ).toEqual({ page: 0, scrollFraction: 0 });
  });

  it('local wins when it is newer than the server resume point', () => {
    const c = makeReaderChapter({ pageCount: 15, serverResume: { page: 3, recordedAtEpochMs: 1000 } });
    expect(resolveInitialPage(c, localRec(11, 2000, 0.4))).toEqual({ page: 11, scrollFraction: 0.4 });
  });

  it('server wins when its resume point is newer than the local record', () => {
    const c = makeReaderChapter({ pageCount: 15, serverResume: { page: 8, recordedAtEpochMs: 9000 } });
    expect(resolveInitialPage(c, localRec(2, 1000))).toEqual({ page: 8, scrollFraction: 0 });
  });

  it('local wins on a tie', () => {
    const c = makeReaderChapter({ pageCount: 15, serverResume: { page: 8, recordedAtEpochMs: 5000 } });
    expect(resolveInitialPage(c, localRec(2, 5000))).toEqual({ page: 2, scrollFraction: 0 });
  });

  it('local wins when the server point has no timestamp', () => {
    const c = makeReaderChapter({ pageCount: 15, serverResume: { page: 8, recordedAtEpochMs: null } });
    expect(resolveInitialPage(c, localRec(2, 1))).toEqual({ page: 2, scrollFraction: 0 });
  });

  it('uses local when there is no server resume point', () => {
    expect(resolveInitialPage(makeReaderChapter({ pageCount: 15 }), localRec(11, 1))).toEqual({
      page: 11, scrollFraction: 0,
    });
  });

  it('uses the server resume page when there is no local record', () => {
    const c = makeReaderChapter({ serverResume: { page: 7, recordedAtEpochMs: 1 } });
    expect(resolveInitialPage(c, null)).toEqual({ page: 7, scrollFraction: 0 });
  });

  it('falls back to the start', () => {
    expect(resolveInitialPage(makeReaderChapter(), null)).toEqual({ page: 0, scrollFraction: 0 });
  });
});

describe('shouldUnmarkOnReread', () => {
  it('is true when the chapter was read on open and the user is not at the last page', () => {
    expect(shouldUnmarkOnReread(true, 2, 10, false)).toBe(true);
  });
  it('is false when it was not read on open', () => {
    expect(shouldUnmarkOnReread(false, 2, 10, false)).toBe(false);
  });
  it('is false when already unmarked this session', () => {
    expect(shouldUnmarkOnReread(true, 2, 10, true)).toBe(false);
  });
  it('is false at the last page', () => {
    expect(shouldUnmarkOnReread(true, 9, 10, false)).toBe(false);
  });
});

// ── reducer ──────────────────────────────────────────────────────────────

describe('reducer', () => {
  const base: State = {
    loading: true, error: null, viewer: null, seriesName: '', overlayVisible: false,
    currentVisiblePage: 0, scrollToPageRequest: null, scrollToChapterId: null, scrollFraction: 0,
    chapterFraction: 0, offline: false, isSwitching: false,
  };

  it('VIEWER_READY with scrollToChapterId seeds the scroll request (fresh open / manual switch)', () => {
    const viewer = { prev: null, curr: makeReaderChapter(), next: null } as const;
    const s = reducer(base, {
      type: 'VIEWER_READY', viewer, initialPage: 3, initialScrollFraction: 0.4, initialChapterFraction: 0.2,
      scrollToChapterId: 'c1',
    });
    expect(s.loading).toBe(false);
    expect(s.viewer).toBe(viewer);
    expect(s.currentVisiblePage).toBe(3);
    expect(s.scrollToPageRequest).toBe(3);
    expect(s.scrollToChapterId).toBe('c1');
    expect(s.scrollFraction).toBe(0.4);
  });

  it('SET_VIEWER (natural crossing) slides the trio without a scroll request', () => {
    const viewer = { prev: null, curr: makeReaderChapter({ id: 'c2' }), next: null } as const;
    const s = reducer(base, {
      type: 'SET_VIEWER', viewer, page: 1, scrollFraction: 0.2, chapterFraction: 0.1,
    });
    expect(s.viewer).toBe(viewer);
    expect(s.currentVisiblePage).toBe(1);
    expect(s.scrollToPageRequest).toBeNull();
    expect(s.isSwitching).toBe(false);
  });

  it('ERROR clears loading and sets the message', () => {
    expect(reducer(base, { type: 'ERROR', error: 'boom' })).toMatchObject({ loading: false, error: 'boom' });
  });

  it('OPTIMISTIC_MARK_READ flips the current chapter to READ with full pagesRead', () => {
    const withViewer: State = { ...base, viewer: { prev: null, curr: makeReaderChapter(), next: null } };
    const s = reducer(withViewer, { type: 'OPTIMISTIC_MARK_READ', chapterId: 'c1' });
    expect(s.viewer?.curr.readStatus).toBe('READ');
    expect(s.viewer?.curr.pagesRead).toBe(3);
  });

  it('OPTIMISTIC_MARK_UNREAD leaves every chapter untouched for an id not in the trio', () => {
    const withViewer: State = { ...base, viewer: { prev: null, curr: makeReaderChapter(), next: null } };
    const s = reducer(withViewer, { type: 'OPTIMISTIC_MARK_UNREAD', chapterId: 'other' });
    expect(s.viewer?.curr.readStatus).toBe('UNREAD'); // unchanged
    expect(s.viewer?.curr.id).toBe('c1');
  });

  it('OPTIMISTIC_MARK_READ can mark a NEIGHBOUR in the trio (not just curr)', () => {
    const withViewer: State = {
      ...base,
      viewer: { prev: makeReaderChapter({ id: 'c0' }), curr: makeReaderChapter(), next: makeReaderChapter({ id: 'c2' }) },
    };
    const s = reducer(withViewer, { type: 'OPTIMISTIC_MARK_READ', chapterId: 'c2' });
    expect(s.viewer?.next?.readStatus).toBe('READ');
    expect(s.viewer?.curr.readStatus).toBe('UNREAD');
  });

  it('SCROLL_TO_PAGE_HANDLED clears the pending request', () => {
    expect(reducer({ ...base, scrollToPageRequest: 5 }, { type: 'SCROLL_TO_PAGE_HANDLED' }).scrollToPageRequest).toBeNull();
  });
});

// ── hook ─────────────────────────────────────────────────────────────────

describe('useReader — loadChapter', () => {
  it('loads the current chapter via ChapterService.getFull and ends with a viewer', async () => {
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.viewer).not.toBeNull());
    expect(mockGetFull).toHaveBeenCalledWith({ seriesId: 's1', chapterId: 'c1' });
    expect(result.current.viewer?.curr.id).toBe('c1');
    expect(result.current.viewer?.prev).toBeNull();
    expect(result.current.viewer?.next).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('sets error (no viewer) when the digest resolves as Failure', async () => {
    mockGetFull.mockResolvedValue({ isSuccess: false, error: { message: 'chapter not found' } });
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.error).toBe('chapter not found'));
    expect(result.current.viewer).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('sets error when getFull throws', async () => {
    mockGetFull.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.error).toBe('network'));
    expect(result.current.viewer).toBeNull();
  });

  it('resolves initial page from local progress', async () => {
    mockProgressGet.mockResolvedValue({ seriesId: 's1', page: 2, scrollFraction: 0.5, updatedAtEpochMs: 5000 });
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.viewer).not.toBeNull());
    expect(result.current.currentVisiblePage).toBe(2);
    expect(result.current.scrollFraction).toBe(0.5);
  });

  it('a manual reload with startAtBeginning ignores local progress', async () => {
    mockProgressGet.mockResolvedValue({ seriesId: 's1', page: 2, scrollFraction: 0.5, updatedAtEpochMs: 5000 });
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.viewer).not.toBeNull());
    await act(async () => {
      await result.current.loadChapter('c1', true);
    });
    expect(result.current.currentVisiblePage).toBe(0);
    expect(result.current.scrollFraction).toBe(0);
  });

  it('discards a stale response when a newer load started', async () => {
    let resolveFirst: (v: unknown) => void = () => {};
    mockGetFull
      .mockImplementationOnce(() => new Promise(r => { resolveFirst = r; }))
      .mockResolvedValueOnce(makeDigest({ id: 'c2', title: 'Segundo' }));
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await act(async () => {
      result.current.loadChapter('c2'); // newer
      resolveFirst(makeDigest({ id: 'c1', title: 'Primeiro' })); // stale, resolves late
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.viewer?.curr.id).toBe('c2'));
  });
});

describe('useReader — progress timers (Fase 2 / Fase 4)', () => {
  it('saves local progress via ReadingProgressManager on the 2s interval', async () => {
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.viewer).not.toBeNull());
    mockProgressSetLocal.mockClear();
    await act(async () => { jest.advanceTimersByTime(2000); });
    expect(mockProgressSetLocal).toHaveBeenCalledWith('c1', {
      seriesId: 's1', page: expect.any(Number), scrollFraction: expect.any(Number),
    });
  });

  it('syncs server progress via ChapterService.progress.set and emits ReaderEvents.progressChanged', async () => {
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.viewer).not.toBeNull());
    // move the reading position so the sync isn't skipped as "same page"
    act(() => result.current.setCurrentPage(2, 0, 0.1));
    mockProgressSet.mockClear();
    mockEventEmit.mockClear();
    await act(async () => {
      jest.advanceTimersByTime(20000);
      await Promise.resolve();
    });
    expect(mockProgressSet).toHaveBeenCalledWith({ seriesId: 's1', chapterId: 'c1', pageIndex: 2 });
    expect(mockEventEmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'readerProgressChanged' }),
      { seriesId: 's1', chapterId: 'c1', pageIndex: 2 },
    );
  });

  it('onScreenExit flushes local progress and (for an unread chapter) server progress', async () => {
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.viewer).not.toBeNull());
    mockProgressSetLocal.mockClear();
    mockProgressSet.mockClear();
    await act(async () => { await result.current.onScreenExit(); });
    expect(mockProgressSetLocal).toHaveBeenCalledWith('c1', {
      seriesId: 's1', page: expect.any(Number), scrollFraction: expect.any(Number),
    });
    expect(mockProgressSet).toHaveBeenCalledWith({ seriesId: 's1', chapterId: 'c1', pageIndex: expect.any(Number) });
  });
});

describe('useReader — mark as read (Fase 2: via ChapterTool)', () => {
  it('markAsReadIfNeeded optimistically flips the chapter and calls ChapterTool.mark.read', async () => {
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.viewer).not.toBeNull());
    await act(async () => {
      await result.current.markAsReadIfNeeded(result.current.viewer!.curr);
    });
    expect(result.current.viewer?.curr.readStatus).toBe('READ');
    expect(mockMarkRead).toHaveBeenCalledWith(
      expect.objectContaining({ seriesId: 's1', chapterId: 'c1', prevStatus: 'UNREAD' }),
    );
  });

  it('does not call ChapterTool.mark.read twice for the same chapter in one session', async () => {
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.viewer).not.toBeNull());
    await act(async () => {
      await result.current.markAsReadIfNeeded(result.current.viewer!.curr);
      await result.current.markAsReadIfNeeded(result.current.viewer!.curr);
    });
    expect(mockMarkRead).toHaveBeenCalledTimes(1);
  });

  it('reacts to ChapterEvents.readStatusChanged from another screen for the chapter on screen', async () => {
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.viewer).not.toBeNull());
    expect(capturedEventHandler).not.toBeNull();
    act(() => {
      capturedEventHandler!({
        chapter: { id: 'c1', seriesId: 's1' },
        changed: { readStatus: 'READ' },
        phase: 'optimistic',
      });
    });
    expect(result.current.viewer?.curr.readStatus).toBe('READ');
  });

  it('ignores a readStatusChanged event for a different chapter', async () => {
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.viewer).not.toBeNull());
    act(() => {
      capturedEventHandler!({
        chapter: { id: 'other', seriesId: 's1' },
        changed: { readStatus: 'READ' },
        phase: 'optimistic',
      });
    });
    expect(result.current.viewer?.curr.readStatus).toBe('UNREAD');
  });
});

describe('useReader — series name (Fase 2)', () => {
  it('uses the hint when provided, without waiting on a fetch for the name', async () => {
    const { result } = renderHook(() => useReader('s1', 'c1', 'Nome Dado'));
    await waitFor(() => expect(result.current.viewer).not.toBeNull());
    // SerialService.get IS still called (for the chapter order), but the name stays the hint —
    // no SERIES_NAME_LOADED dispatch from the fallback path.
    expect(result.current.seriesName).toBe('Nome Dado');
  });

  it('fetches the series name via SerialService.get when no hint is given', async () => {
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.seriesName).toBe('Série Um'));
  });
});

describe('useReader — Fase 3: the trio + switchChapter', () => {
  // A chapter digest that also embeds prev/next (as ChapterNeighborDigest, with pages).
  const neighbor = (id: string, number: number) => ({
    isSuccess: true as const,
    id,
    seriesId: 's1',
    number,
    title: `Ch ${number}`,
    coverImage: { url: '', hasFetchedDimensions: false, resolvedAtEpochMs: 0, server, cache: null },
    readStatus: 'UNREAD' as const,
    pages: { count: 2, readCount: 0, total: 2, list: [makePage(0), makePage(1)] },
    resolvedAtEpochMs: 1,
    server,
    cache: null,
  });

  const digestWithTrio = (id: string, number: number, opts: { prev?: string; next?: string } = {}) =>
    makeDigest({
      id,
      number,
      title: `Ch ${number}`,
      prevChapter: opts.prev ? neighbor(opts.prev, number - 1) : undefined,
      nextChapter: opts.next ? neighbor(opts.next, number + 1) : undefined,
    } as Partial<ChapterDigestSuccess>);

  const seriesOrder = {
    isSuccess: true,
    id: 's1',
    name: 'Série Um',
    chapters: {
      total: 4,
      list: [
        { ...neighbor('c1', 1), pages: { list: [] } },
        { ...neighbor('c2', 2), pages: { list: [] } },
        { ...neighbor('c3', 3), pages: { list: [] } },
        { ...neighbor('c4', 4), pages: { list: [] } },
      ],
    },
  };

  beforeEach(() => {
    const { SerialService } = jest.requireMock('../../../shared/services/serials');
    SerialService.get.mockResolvedValue(seriesOrder);
  });

  it('opens with prev/curr/next from the embedded neighbours', async () => {
    mockGetFull.mockResolvedValue(digestWithTrio('c2', 2, { prev: 'c1', next: 'c3' }));
    const { result } = renderHook(() => useReader('s1', 'c2'));
    await waitFor(() => expect(result.current.viewer).not.toBeNull());
    expect(result.current.viewer?.prev?.id).toBe('c1');
    expect(result.current.viewer?.curr.id).toBe('c2');
    expect(result.current.viewer?.next?.id).toBe('c3');
  });

  it('goToAdjacent("next") slides the trio (curr→prev, next→curr) WITHOUT re-fetching, and scrolls to page 0', async () => {
    mockGetFull.mockResolvedValue(digestWithTrio('c2', 2, { prev: 'c1', next: 'c3' }));
    const { result } = renderHook(() => useReader('s1', 'c2'));
    await waitFor(() => expect(result.current.viewer?.curr.id).toBe('c2'));
    mockGetFull.mockClear(); // any further getFull would mean a re-fetch — there should be one only for the NEW edge (c4)
    act(() => result.current.goToAdjacent('next'));
    expect(result.current.viewer?.prev?.id).toBe('c2'); // old curr
    expect(result.current.viewer?.curr.id).toBe('c3'); // old next, no re-fetch
    expect(result.current.currentVisiblePage).toBe(0);
    expect(result.current.scrollToChapterId).toBe('c3');
    // exactly one getFull, for the new edge c4 (from the series order)
    await waitFor(() => expect(mockGetFull).toHaveBeenCalledWith({ seriesId: 's1', chapterId: 'c4' }));
    expect(mockGetFull).toHaveBeenCalledTimes(1);
  });

  it('a natural-scroll crossing into next slides the trio WITHOUT a scroll request', async () => {
    mockGetFull.mockResolvedValue(digestWithTrio('c2', 2, { prev: 'c1', next: 'c3' }));
    const { result } = renderHook(() => useReader('s1', 'c2'));
    await waitFor(() => expect(result.current.viewer?.curr.id).toBe('c2'));
    act(() => result.current.handleScrollToPageHandled());
    // the native list reports the neighbour c3 as visible, page 0 (crossing forward)
    act(() => result.current.onNativePosition('c3', 0, 0, 0.02));
    expect(result.current.viewer?.curr.id).toBe('c3');
    expect(result.current.viewer?.prev?.id).toBe('c2');
    expect(result.current.currentVisiblePage).toBe(0);
    expect(result.current.scrollToPageRequest).toBeNull(); // SET_VIEWER never seeds one
  });

  it('a second native report for the now-curr chapter is just a position update (anti-loop)', async () => {
    mockGetFull.mockResolvedValue(digestWithTrio('c2', 2, { prev: 'c1', next: 'c3' }));
    const { result } = renderHook(() => useReader('s1', 'c2'));
    await waitFor(() => expect(result.current.viewer?.curr.id).toBe('c2'));
    act(() => result.current.onNativePosition('c3', 0, 0, 0.02)); // crosses → curr becomes c3
    act(() => result.current.onNativePosition('c3', 5, 0.1, 0.3)); // same chapter now → only position
    expect(result.current.viewer?.curr.id).toBe('c3'); // NOT slid again
    expect(result.current.currentVisiblePage).toBe(5);
  });

  it('infinite: after sliding to next, the new next comes from the series order (c4)', async () => {
    mockGetFull.mockResolvedValue(digestWithTrio('c2', 2, { prev: 'c1', next: 'c3' }));
    const { result } = renderHook(() => useReader('s1', 'c2'));
    await waitFor(() => expect(result.current.viewer?.curr.id).toBe('c2'));
    act(() => result.current.goToAdjacent('next'));
    expect(result.current.viewer?.next?.id).toBe('c4'); // placeholder from seriesOrder
  });

  it('handleScroll/handleScrollEndDrag accept native scroll args', async () => {
    mockGetFull.mockResolvedValue(digestWithTrio('c2', 2, { prev: 'c1', next: 'c3' }));
    const { result } = renderHook(() => useReader('s1', 'c2'));
    await waitFor(() => expect(result.current.viewer).not.toBeNull());
    act(() => {
      result.current.handleScroll(-9999, true); // overscroll at top → goToAdjacent('prev')
      result.current.handleScrollEndDrag(0);
    });
    expect(result.current.viewer?.curr.id).toBe('c1'); // slid to prev
  });
});
