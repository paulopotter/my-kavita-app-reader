import { act, renderHook, waitFor } from '@testing-library/react-native';

// ── mocks: the hook's fetch dependencies (SeriesTool / LibraryTool stay real — pure) ──────────

// mockGet resolves a SerialsDigest ({ isSuccess, serials: SerialDigest[], lastUpdatedEpochMs }).
// serialsDigest() below is the shorthand for the common success shape.
const mockGet = jest.fn();
const mockExternalSync = jest.fn();
const mockGetDigest = jest.fn();
jest.mock('../../../shared/services/serials', () => ({
  SerialsService: {
    get: (...a: unknown[]) => mockGet(...a),
    externalDetails: { sync: (...a: unknown[]) => mockExternalSync(...a) },
  },
  SerialService: { get: (...a: unknown[]) => mockGetDigest(...a) },
}));

const mockGetAllIds = jest.fn();
jest.mock('../../../shared/bridge/followedSeries', () => ({
  FollowedSeriesBridge: { getAllIds: (...a: unknown[]) => mockGetAllIds(...a) },
}));

const mockIndexGet = jest.fn();
jest.mock('../../../shared/tools/series', () => {
  const actual = jest.requireActual('../../../shared/tools/series');
  return {
    ...actual,
    SeriesDigestIndex: { get: (...a: unknown[]) => mockIndexGet(...a) },
  };
});

const mockAddListener = jest.fn((_event: string, _handler: (ids: string[]) => void) => ({ remove: jest.fn() }));
jest.mock('../../../shared/bridge/series', () => ({
  SeriesFollowedEmitter: {
    addListener: (event: string, handler: (ids: string[]) => void) => mockAddListener(event, handler),
  },
}));

const mockGetViewMode = jest.fn();
const mockGetSortMode = jest.fn();
const mockSetViewMode = jest.fn();
const mockSetSortMode = jest.fn();
jest.mock('../library.prefs', () => ({
  DEFAULT_VIEW_MODE: 'GRID',
  DEFAULT_SORT_MODE: 'RECENTLY_UPDATED',
  LibraryPrefs: {
    getViewMode: (...a: unknown[]) => mockGetViewMode(...a),
    getSortMode: (...a: unknown[]) => mockGetSortMode(...a),
    setViewMode: (...a: unknown[]) => mockSetViewMode(...a),
    setSortMode: (...a: unknown[]) => mockSetSortMode(...a),
  },
}));

import { EventBus } from '../../../shared/managers/events';
import { ChapterEvents } from '../../../shared/tools/chapters';
import { SerieEvents } from '../../../shared/tools/series';
import { useLibrary, seedLibrary, __resetLibraryHandoff } from './library.hooks';
import type { LibraryEntry } from '../library.tool';
import type { ServerActiveInfo } from '../../../shared/bridge/digest';

const server: ServerActiveInfo = {
  groupId: 'g1', groupName: 'g', providerId: 'kavita', urlId: 'u1',
  url: 'https://x.invalid', timeoutMs: 5000, priority: 0,
};

// A minimal SerialDigestSuccess — the shape buildSerialsDigest hands back per list row (via the
// bridge): chapters/metadata absent, pages present. `over` may still pass pagesRead/totalPages
// for terser call sites — they're folded into `pages` here.
function serialData(id: string, over: Record<string, unknown> = {}) {
  const { pagesRead = 0, totalPages = 100, lastChapterAddedUtc, ...rest } = over as {
    pagesRead?: number;
    totalPages?: number;
    lastChapterAddedUtc?: string;
  } & Record<string, unknown>;
  const chapterAdded =
    lastChapterAddedUtc === undefined ? Date.parse('2026-01-01T00:00:00Z') : Date.parse(lastChapterAddedUtc);
  return {
    isSuccess: true as const,
    id,
    name: `S${id}`,
    coverImage: { url: `cover/${id}`, hasFetchedDimensions: false, resolvedAtEpochMs: 1, server, cache: null },
    pages: { read: pagesRead, total: totalPages },
    lastUpdatesUTC: { series: undefined, chapterAdded, readDate: undefined },
    resolvedAtEpochMs: 1,
    server,
    cache: null,
    ...rest,
  };
}

// The SerialsDigest.Success wrapper around a set of list-row digests.
function serialsDigest(serials: ReturnType<typeof serialData>[], lastUpdatedEpochMs: number | null = Date.now()) {
  return { isSuccess: true as const, serials, lastUpdatedEpochMs };
}

function seriesDigest(id: string, readCount: number, total: number) {
  return {
    isSuccess: true,
    id,
    name: `S${id}`,
    coverImage: { url: '', hasFetchedDimensions: false, resolvedAtEpochMs: 0, server, cache: null },
    chapters: { total, readCount, list: [] },
    resolvedAtEpochMs: 1,
    server,
    cache: null,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetLibraryHandoff();
  mockGet.mockResolvedValue(serialsDigest([]));
  mockExternalSync.mockResolvedValue([]);
  mockGetAllIds.mockResolvedValue([]);
  mockIndexGet.mockResolvedValue(null);
  mockGetViewMode.mockResolvedValue('GRID');
  mockGetSortMode.mockResolvedValue('RECENTLY_UPDATED');
  mockSetViewMode.mockResolvedValue(undefined);
  mockSetSortMode.mockResolvedValue(undefined);
});

describe('useLibrary — mount / assembly', () => {
  it('assembles entries from the batch list alone (page-based progress)', async () => {
    mockGet.mockResolvedValue(serialsDigest([serialData('1', { pagesRead: 50 }), serialData('2')]));
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(result.current.data[0]).toMatchObject({ id: '1', progressFraction: 0.5, isFollowed: false });
    expect(result.current.data[0].coverUrl).toBe('cover/1');
  });

  it('shows fresh data once the (cache-first) SerialsService.get resolves', async () => {
    mockGet.mockResolvedValue(serialsDigest([serialData('s1', { pagesRead: 100 })]));
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.data[0]?.name).toBe('Ss1'));
    expect(result.current.data[0].readStatus).toBe('READ');
    expect(result.current.loading).toBe(false);
  });

  it('reports lastUpdated via bannerState (fresh → no banner)', async () => {
    mockGet.mockResolvedValue(serialsDigest([serialData('1')], Date.now()));
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.bannerState.kind).toBe('none');
  });

  it('bannerState becomes "stale" when lastUpdated is older than the TTL', async () => {
    mockGet.mockResolvedValue(serialsDigest([serialData('1')], Date.now() - 20 * 60 * 1000));
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.bannerState.kind).toBe('stale');
  });

  it('surfaces an error when the critical get() rejects', async () => {
    mockGet.mockRejectedValue(new Error('kavita down'));
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.error).toBe('kavita down'));
  });

  it('a SerialsDigest.Failure is treated as a load error', async () => {
    mockGet.mockResolvedValue({ isSuccess: false, error: { code: 'X', message: 'digest failed' } });
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.error).toBe('digest failed'));
  });

  it('degrades when getAllIds / the BFF batch reject — the list still renders', async () => {
    mockGet.mockResolvedValue(serialsDigest([serialData('1')]));
    mockGetAllIds.mockRejectedValue(new Error('room error'));
    mockExternalSync.mockRejectedValue(new Error('bff down'));
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data[0].isFollowed).toBe(false);
    expect(result.current.data[0].downloadedChapters).toBeUndefined();
  });
});

describe('useLibrary — followed digests + index', () => {
  it('fetches followed digests, marks followed, uses chapter counts — WITHOUT re-emitting digestResolved', async () => {
    mockGet.mockResolvedValue(serialsDigest([serialData('1'), serialData('2')]));
    mockGetAllIds.mockResolvedValue(['1']);
    mockGetDigest.mockResolvedValue(seriesDigest('1', 3, 10));
    const digestSpy = jest.fn();
    const off = EventBus.on(SerieEvents.digestResolved, digestSpy);

    const { result } = renderHook(() => useLibrary({ filter: e => e.isFollowed }));
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    expect(mockGetDigest).toHaveBeenCalledWith({ seriesId: '1', force: false });
    // The list's own followed-digest fetch must NOT bounce SerieEvents.digestResolved back into
    // this hook (it would be one re-render per followed series).
    expect(digestSpy).not.toHaveBeenCalled();
    const e1 = result.current.data[0];
    expect(e1.id).toBe('1');
    expect(e1.isFollowed).toBe(true);
    expect(e1.readChapters).toBe(3);
    expect(e1.chapterCount).toBe(10);
    expect(e1.progressFraction).toBeCloseTo(0.3);
    off();
  });

  it('a failed followed digest falls back to page-based progress for that series', async () => {
    mockGet.mockResolvedValue(serialsDigest([serialData('1', { pagesRead: 20, totalPages: 100 })]));
    mockGetAllIds.mockResolvedValue(['1']);
    mockGetDigest.mockRejectedValue(new Error('digest failed'));
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data[0].readChapters).toBeUndefined();
    expect(result.current.data[0].progressFraction).toBe(0.2);
  });

  it('uses the persistent SeriesDigestIndex for a non-followed series opened before', async () => {
    mockGet.mockResolvedValue(serialsDigest([serialData('1', { pagesRead: 0, totalPages: 100 })]));
    mockGetAllIds.mockResolvedValue([]);
    mockIndexGet.mockImplementation((id: string) =>
      id === '1' ? Promise.resolve({ readChapters: 5, totalChapters: 8 }) : Promise.resolve(null),
    );
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data[0].readChapters).toBe(5);
    expect(result.current.data[0].chapterCount).toBe(8);
    expect(result.current.data[0].readStatus).toBe('IN_PROGRESS');
  });
});

describe('useLibrary — sort', () => {
  it('applies persisted ALPHABETICAL sort', async () => {
    mockGetSortMode.mockResolvedValue('ALPHABETICAL');
    mockGet.mockResolvedValue(serialsDigest([serialData('b', { name: 'Zed' }), serialData('a', { name: 'Ada' })]));
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(result.current.data.map(e => e.name)).toEqual(['Ada', 'Zed']);
  });

  it('toggleSortMode flips and persists', async () => {
    mockGet.mockResolvedValue(serialsDigest([serialData('1')]));
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    act(() => result.current.toggleSortMode());
    expect(result.current.sortMode).toBe('ALPHABETICAL');
    expect(mockSetSortMode).toHaveBeenCalledWith('library', 'ALPHABETICAL');
  });
});

describe('useLibrary — Following filter', () => {
  it('filters reactively over the unfiltered list', async () => {
    mockGet.mockResolvedValue(serialsDigest([serialData('a'), serialData('b')]));
    mockGetAllIds.mockResolvedValue(['a']);
    mockGetDigest.mockResolvedValue(seriesDigest('a', 1, 2));
    const { result } = renderHook(() => useLibrary({ filter: e => e.isFollowed, prefsKey: 'following' }));
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data[0].id).toBe('a');
  });

  it('an item newly followed via the followed-ids event enters the filtered list', async () => {
    mockGet.mockResolvedValue(serialsDigest([serialData('a'), serialData('b')]));
    mockGetAllIds.mockResolvedValue(['a']);
    mockGetDigest.mockResolvedValue(seriesDigest('a', 1, 2));
    const { result } = renderHook(() => useLibrary({ filter: e => e.isFollowed, prefsKey: 'following' }));
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    const handler = mockAddListener.mock.calls[0][1];
    act(() => handler(['a', 'b']));
    expect(result.current.data.map(e => e.id).sort()).toEqual(['a', 'b']);
  });
});

describe('useLibrary — cross-screen events', () => {
  it('does not re-assemble the list on its own — a single mount triggers exactly one get()', async () => {
    mockGet.mockResolvedValue(serialsDigest([serialData('1'), serialData('2')]));
    renderHook(() => useLibrary());
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    // give any stray effects a chance to fire a second load
    await new Promise<void>(r => setTimeout(() => r(), 50));
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('patches chapter counts on SerieEvents.digestResolved', async () => {
    mockGet.mockResolvedValue(serialsDigest([serialData('1')]));
    mockGetAllIds.mockResolvedValue(['1']);
    mockGetDigest.mockResolvedValue(seriesDigest('1', 1, 10));
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.data[0].readChapters).toBe(1));
    act(() => {
      EventBus.emit(SerieEvents.digestResolved, { seriesId: '1', readChapters: 5, totalChapters: 10 });
    });
    expect(result.current.data[0].readChapters).toBe(5);
    expect(result.current.data[0].progressFraction).toBeCloseTo(0.5);
    expect(result.current.data[0].readStatus).toBe('IN_PROGRESS');
  });

  it('adjusts read count optimistically on ChapterEvents.readStatusChanged and schedules a reload', async () => {
    jest.useFakeTimers();
    mockGet.mockResolvedValue(serialsDigest([serialData('1')]));
    mockGetAllIds.mockResolvedValue(['1']);
    mockGetDigest.mockResolvedValue(seriesDigest('1', 2, 10));
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.data[0].readChapters).toBe(2));
    mockGet.mockClear();

    act(() => {
      EventBus.emit(ChapterEvents.readStatusChanged, {
        chapter: { id: 'c1', seriesId: '1' },
        changed: { readStatus: 'READ', prevStatus: 'UNREAD' },
        phase: 'optimistic',
      });
    });
    expect(result.current.data[0].readChapters).toBe(3);

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(mockGet).toHaveBeenCalled();
    jest.useRealTimers();
  });
});

describe('useLibrary — cross-screen handoff (Library <-> Following)', () => {
  it('a second instance mounting right after the first paints via the handoff, WITHOUT its own get()', async () => {
    mockGet.mockResolvedValue(serialsDigest([serialData('a'), serialData('b')]));
    const first = renderHook(() => useLibrary());
    await waitFor(() => expect(first.result.current.data).toHaveLength(2));
    expect(mockGet).toHaveBeenCalledTimes(1);

    // Following mounts moments later — no spinner, no extra fetch.
    const second = renderHook(() => useLibrary({ filter: e => e.isFollowed, prefsKey: 'following' }));
    await waitFor(() => expect(second.result.current.loading).toBe(false));
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('an instance mounted alongside another receives its assembled list via the event', async () => {
    // Both mount before any data resolves.
    let resolveGet: (v: unknown) => void = () => {};
    mockGet.mockImplementation(() => new Promise(r => { resolveGet = r; }));
    const lib = renderHook(() => useLibrary());
    const fol = renderHook(() => useLibrary({ filter: e => e.isFollowed, prefsKey: 'following' }));

    // Only the first mount's get() is in flight (second mount also called it, but...); resolve it.
    act(() => resolveGet(serialsDigest([serialData('a'), serialData('b')])));
    await waitFor(() => expect(lib.result.current.data.length).toBe(2));
    // Following got the same list through LibraryEvents.assembled — no crash, no loop, data present.
    await waitFor(() => expect(fol.result.current.data.length).toBe(0)); // none followed → filtered empty
    expect(fol.result.current.loading).toBe(false);
  });

  it('the handoff never loops — a hydrate does not trigger another get() or emit', async () => {
    mockGet.mockResolvedValue(serialsDigest([serialData('a')]));
    const first = renderHook(() => useLibrary());
    await waitFor(() => expect(first.result.current.data).toHaveLength(1));
    const callsAfterFirst = mockGet.mock.calls.length;

    const second = renderHook(() => useLibrary({ prefsKey: 'following' }));
    await waitFor(() => expect(second.result.current.loading).toBe(false));

    // Give any stray re-emit / reload a chance to fire.
    await new Promise<void>(r => setTimeout(r, 50));
    expect(mockGet.mock.calls.length).toBe(callsAfterFirst); // still no extra fetch from the handoff
  });

  it('the second instance never renders a loading frame (lazy init from the handoff)', async () => {
    mockGet.mockResolvedValue(serialsDigest([serialData('a')]));
    const first = renderHook(() => useLibrary());
    await waitFor(() => expect(first.result.current.data).toHaveLength(1));

    // From its very first render, the second instance is already non-loading with data.
    const second = renderHook(() => useLibrary({ prefsKey: 'following' }));
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.data).toHaveLength(1);
  });

  it('seedLibrary (the splash entry point) lets the first screen mount with data and no fetch', async () => {
    const seeded: LibraryEntry[] = [
      { id: 'x', name: 'Seeded', coverUrl: 'c', progressFraction: 0, readStatus: 'UNREAD', isFollowed: false },
    ];
    seedLibrary(seeded, 1_700_000_000_000);

    const { result } = renderHook(() => useLibrary());
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(seeded);
    // No background fetch — the seeder (splash) just produced this.
    await new Promise<void>(r => setTimeout(r, 20));
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('a stale handoff is ignored — the mount fetches normally', async () => {
    // Seed, then age it past HANDOFF_FRESH_MS by faking Date.now.
    seedLibrary([{ id: 'old', name: 'Old', coverUrl: 'c', progressFraction: 0, readStatus: 'UNREAD', isFollowed: false }], null);
    const realNow = Date.now;
    Date.now = () => realNow() + 60 * 1000;
    try {
      mockGet.mockResolvedValue(serialsDigest([serialData('fresh')]));
      const { result } = renderHook(() => useLibrary());
      await waitFor(() => expect(result.current.data).toHaveLength(1));
      expect(result.current.data[0].id).toBe('fresh');
      expect(mockGet).toHaveBeenCalledTimes(1);
    } finally {
      Date.now = realNow;
    }
  });
});

describe('useLibrary — presentation state', () => {
  it('builds the alphabet index only in LIST + ALPHABETICAL', async () => {
    mockGetViewMode.mockResolvedValue('LIST');
    mockGetSortMode.mockResolvedValue('ALPHABETICAL');
    mockGet.mockResolvedValue(serialsDigest([serialData('a', { name: 'Ada' }), serialData('b', { name: 'Bob' })]));
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.alphabetIndex.size).toBe(2));
    expect(result.current.alphabetIndex.get('A')).toBe(0);
    expect(result.current.alphabetIndex.get('B')).toBe(1);
  });

  it('pads the GRID list to an even count', async () => {
    mockGet.mockResolvedValue(serialsDigest([serialData('a'), serialData('b'), serialData('c')]));
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.data).toHaveLength(3));
    expect(result.current.paddedData).toHaveLength(4);
    expect(result.current.paddedData[3]).toBeNull();
  });

  it('handleScroll toggles showScrollTop when scrolling up past the threshold', async () => {
    mockGet.mockResolvedValue(serialsDigest([serialData('1')]));
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    act(() => result.current.handleScroll({ nativeEvent: { contentOffset: { y: 500 } } } as never));
    act(() => result.current.handleScroll({ nativeEvent: { contentOffset: { y: 400 } } } as never));
    expect(result.current.showScrollTop).toBe(true);
    act(() => result.current.hideScrollTop());
    expect(result.current.showScrollTop).toBe(false);
  });
});
