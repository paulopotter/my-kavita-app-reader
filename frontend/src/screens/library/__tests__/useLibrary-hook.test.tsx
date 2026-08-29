import { act, renderHook, waitFor } from '@testing-library/react-native';
import { SeriesSummary } from '../../../shared/bridge/library';
import { EventBus } from '../../../shared/managers/events';
import { ChapterEvents, type ChapterReadStatusChangedPayload } from '../../../shared/tools/chapters';

let followedIdsListener: ((ids: string[]) => void) | null = null;

jest.mock('../../../shared/bridge/series', () => ({
  SeriesFollowedEmitter: {
    addListener: jest.fn((_event: string, cb: (ids: string[]) => void) => {
      followedIdsListener = cb;
      return { remove: jest.fn() };
    }),
  },
  SeriesBridge: {},
}));

// Emit a real ChapterEvents.readStatusChanged through the real EventBus singleton — the hook
// subscribes to exactly this. Defaults cover the common "optimistic, prevStatus known" case.
function emitReadStatusChanged(overrides: Partial<ChapterReadStatusChangedPayload> & { seriesId: string }) {
  const { seriesId, ...rest } = overrides;
  EventBus.emit(ChapterEvents.readStatusChanged, {
    chapter: { id: 'c1', seriesId },
    changed: { readStatus: 'READ', prevStatus: 'UNREAD' },
    phase: 'optimistic',
    ...rest,
  });
}

jest.mock('../../../shared/bridge/config', () => ({
  ConfigRepository: {
    getUiPreferences: jest.fn().mockResolvedValue({}),
    upsertUiPreferences: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockFetchSeries = jest.fn();
const mockSyncBff = jest.fn().mockResolvedValue(undefined);
const mockToggleFollow = jest.fn().mockResolvedValue(undefined);

jest.mock('../LibraryService', () => ({
  fetchSeries: (...args: unknown[]) => mockFetchSeries(...args),
  syncBff: () => mockSyncBff(),
  toggleFollow: (...args: unknown[]) => mockToggleFollow(...args),
}));

import { useLibrary } from '../useLibrary';

function makeSeries(id: number, isFollowed: boolean): SeriesSummary {
  return {
    id,
    name: `Series ${id}`,
    coverUrl: '',
    readStatus: 'UNREAD',
    progressFraction: 0,
    pagesRead: 0,
    totalPages: 0,
    lastChapterAddedUtc: null,
    downloadedChapters: null,
    totalChapters: null,
    readChapters: null,
    chapterCount: null,
    latestChapterLabel: null,
    publicationStatus: 'NONE',
    hasErrors: false,
    isFollowed,
  };
}

// makeSeries defaults readChapters/chapterCount to null; this variant gives a real count so
// the optimistic ADJUST_SERIES_PROGRESS path (which skips null-count series) can run.
function makeSeriesWithProgress(id: number, readChapters: number, chapterCount: number): SeriesSummary {
  return { ...makeSeries(id, false), readChapters, chapterCount, progressFraction: readChapters / chapterCount };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  followedIdsListener = null;
  mockFetchSeries.mockResolvedValue([makeSeries(1, false), makeSeries(2, true)]);
});

describe('useLibrary — filtro isFollowed reage a mudanças (sem refetch)', () => {
  it('um item recém-seguido via evento aparece no filtro isFollowed', async () => {
    const filter = (s: SeriesSummary) => s.isFollowed;
    const { result } = renderHook(() => useLibrary({ filter, prefsKey: 'following' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data.map(s => s.id)).toEqual([2]);

    act(() => {
      followedIdsListener?.(['1', '2']);
    });

    await waitFor(() => expect(result.current.data.map(s => s.id)).toEqual([1, 2]));
  });

  it('um item desseguido via evento some do filtro isFollowed', async () => {
    const filter = (s: SeriesSummary) => s.isFollowed;
    const { result } = renderHook(() => useLibrary({ filter, prefsKey: 'following' }));

    await waitFor(() => expect(result.current.data.map(s => s.id)).toEqual([2]));

    act(() => {
      followedIdsListener?.([]);
    });

    await waitFor(() => expect(result.current.data).toEqual([]));
  });

  it('toggleFollow otimista reflete no filtro imediatamente', async () => {
    const filter = (s: SeriesSummary) => s.isFollowed;
    const { result } = renderHook(() => useLibrary({ filter, prefsKey: 'following' }));

    await waitFor(() => expect(result.current.data.map(s => s.id)).toEqual([2]));

    act(() => {
      result.current.toggleFollow(1);
    });

    await waitFor(() => expect(result.current.data.map(s => s.id).sort()).toEqual([1, 2]));
  });
});

describe('useLibrary — progresso reage a ChapterEvents.readStatusChanged (otimista + reconcile)', () => {
  it('marcar READ (prevStatus UNREAD) soma 1 no readChapters e recalcula fraction/status', async () => {
    mockFetchSeries.mockResolvedValue([makeSeriesWithProgress(1, 4, 10), makeSeries(2, true)]);
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => emitReadStatusChanged({ seriesId: '1', changed: { readStatus: 'READ', prevStatus: 'UNREAD' } }));

    await waitFor(() => {
      const series = result.current.data.find(s => s.id === 1);
      expect(series?.readChapters).toBe(5);
      expect(series?.progressFraction).toBe(0.5);
      expect(series?.readStatus).toBe('IN_PROGRESS');
    });
  });

  it('o clamp impede readChapters de ultrapassar chapterCount', async () => {
    mockFetchSeries.mockResolvedValue([makeSeriesWithProgress(1, 10, 10)]);
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => emitReadStatusChanged({ seriesId: '1', changed: { readStatus: 'READ', prevStatus: undefined } }));

    await waitFor(() => {
      const series = result.current.data.find(s => s.id === 1);
      expect(series?.readChapters).toBe(10);
      expect(series?.readStatus).toBe('READ');
    });
  });

  it('marcar UNREAD (prevStatus READ) subtrai 1; o clamp segura em 0', async () => {
    mockFetchSeries.mockResolvedValue([makeSeriesWithProgress(1, 0, 10)]);
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => emitReadStatusChanged({ seriesId: '1', changed: { readStatus: 'UNREAD', prevStatus: undefined } }));

    await waitFor(() => expect(result.current.data.find(s => s.id === 1)?.readChapters).toBe(0));
  });

  it('phase reverted desfaz o ajuste otimista (delta invertido)', async () => {
    mockFetchSeries.mockResolvedValue([makeSeriesWithProgress(1, 4, 10)]);
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => emitReadStatusChanged({ seriesId: '1', changed: { readStatus: 'READ', prevStatus: 'UNREAD' }, phase: 'optimistic' }));
    await waitFor(() => expect(result.current.data.find(s => s.id === 1)?.readChapters).toBe(5));

    // O revert de mark.read carrega prevStatus 'READ' (o valor otimista já aplicado).
    act(() => emitReadStatusChanged({ seriesId: '1', changed: { readStatus: 'UNREAD', prevStatus: 'READ' }, phase: 'reverted' }));
    await waitFor(() => expect(result.current.data.find(s => s.id === 1)?.readChapters).toBe(4));
  });

  it('phase confirmed é ignorada (não mexe no readChapters)', async () => {
    mockFetchSeries.mockResolvedValue([makeSeriesWithProgress(1, 4, 10)]);
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => emitReadStatusChanged({ seriesId: '1', changed: { readStatus: 'READ', prevStatus: 'UNREAD' }, phase: 'confirmed' }));

    // pequena espera para garantir que nada mudou
    await new Promise<void>(r => setTimeout(() => r(), 20));
    expect(result.current.data.find(s => s.id === 1)?.readChapters).toBe(4);
  });

  it('série com readChapters/chapterCount null é ignorada pelo ajuste otimista', async () => {
    mockFetchSeries.mockResolvedValue([makeSeries(1, false)]); // readChapters/chapterCount = null
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => emitReadStatusChanged({ seriesId: '1', changed: { readStatus: 'READ', prevStatus: 'UNREAD' } }));

    await new Promise<void>(r => setTimeout(() => r(), 20));
    expect(result.current.data.find(s => s.id === 1)?.readChapters).toBeNull();
  });

  it('dispara um refetch (refresh) debounced após o evento para reconciliar', async () => {
    mockFetchSeries.mockResolvedValue([makeSeriesWithProgress(1, 4, 10)]);
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    mockFetchSeries.mockClear();

    act(() => emitReadStatusChanged({ seriesId: '1' }));

    await waitFor(() => expect(mockFetchSeries).toHaveBeenCalledTimes(1), { timeout: 1000 });
  });

  it('vários eventos em sequência colapsam em um único refetch (debounce)', async () => {
    mockFetchSeries.mockResolvedValue([makeSeriesWithProgress(1, 4, 10)]);
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    mockFetchSeries.mockClear();

    act(() => {
      emitReadStatusChanged({ seriesId: '1' });
      emitReadStatusChanged({ seriesId: '1' });
      emitReadStatusChanged({ seriesId: '1' });
    });

    await waitFor(() => expect(mockFetchSeries).toHaveBeenCalledTimes(1), { timeout: 1000 });
    // garante que não vieram mais chamadas depois
    await new Promise<void>(r => setTimeout(() => r(), 50));
    expect(mockFetchSeries).toHaveBeenCalledTimes(1);
  });
});
