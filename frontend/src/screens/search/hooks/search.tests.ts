import { act, renderHook, waitFor } from '@testing-library/react-native';

// ── mocks: only the hook's I/O. SearchTool / the serials normalizers stay real (pure). ────────

const mockGet = jest.fn();
jest.mock('../../../shared/services/serials', () => ({
  SerialsService: { get: (...a: unknown[]) => mockGet(...a) },
}));

const mockGetAllIds = jest.fn();
const mockFollowedListeners: ((ids: string[]) => void)[] = [];
jest.mock('../../../shared/bridge', () => ({
  FollowedSeriesBridge: { getAllIds: (...a: unknown[]) => mockGetAllIds(...a) },
  SeriesFollowedEmitter: {
    addListener: (_event: string, handler: (ids: string[]) => void) => {
      mockFollowedListeners.push(handler);
      return { remove: jest.fn() };
    },
  },
}));

const mockHistoryList = jest.fn();
const mockHistoryPut = jest.fn();
const mockHistoryDelete = jest.fn();
jest.mock('../search.history', () => ({
  SearchHistory: {
    list: (...a: unknown[]) => mockHistoryList(...a),
    put: (...a: unknown[]) => mockHistoryPut(...a),
    delete: (...a: unknown[]) => mockHistoryDelete(...a),
  },
}));

const mockLanguage = { current: 'pt-BR' };
jest.mock('../../../shared/i18n', () => ({
  useStrings: () => require('../../../shared/i18n/strings').getStrings(mockLanguage.current),
}));

import { useSearch } from './search.hooks';
import type { SearchHistoryItem } from '../search.types';

const server = {
  groupId: 'g1', groupName: 'g', providerId: 'kavita', urlId: 'u1',
  url: 'https://x.invalid', timeoutMs: 5000, priority: 0,
};

function serialData(id: string, name: string) {
  return {
    isSuccess: true as const,
    id,
    name,
    coverImage: { url: `cover/${id}`, hasFetchedDimensions: false, resolvedAtEpochMs: 1, server, cache: null },
    pages: { read: 0, total: 100 },
    lastUpdatesUTC: { series: undefined, chapterAdded: undefined, readDate: undefined },
    resolvedAtEpochMs: 1,
    server,
    cache: null,
  };
}

function digest(serials: ReturnType<typeof serialData>[]) {
  return { isSuccess: true as const, serials, lastUpdatedEpochMs: Date.now() };
}

function historyItem(over: Partial<SearchHistoryItem> = {}): SearchHistoryItem {
  return { seriesId: 'h1', name: 'Hist One', coverUrl: 'ch1', openedAtEpochMs: 1_000, ...over };
}

const catalogue = [serialData('a', 'One Piece'), serialData('b', 'Attack on Titan'), serialData('c', 'Ação')];

beforeEach(() => {
  jest.clearAllMocks();
  mockFollowedListeners.length = 0;
  mockLanguage.current = 'pt-BR';
  mockGet.mockResolvedValue(digest(catalogue));
  mockGetAllIds.mockResolvedValue([]);
  mockHistoryList.mockResolvedValue([]);
  mockHistoryPut.mockResolvedValue([]);
  mockHistoryDelete.mockResolvedValue([]);
});

describe('useSearch — catalogue', () => {
  it('loads the catalogue once on mount, cache-first (no force)', async () => {
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith({});
  });

  it('results are empty until something is typed', async () => {
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.results).toEqual([]);
  });

  it('filters the catalogue in memory as the query changes — no extra fetch', async () => {
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setQuery('piece'));
    expect(result.current.results.map(r => r.id)).toEqual(['a']);

    act(() => result.current.setQuery('titan'));
    expect(result.current.results.map(r => r.id)).toEqual(['b']);

    // The whole point of the in-memory design: typing never hits the service again.
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('matches ignoring accents', async () => {
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setQuery('acao'));
    expect(result.current.results.map(r => r.id)).toEqual(['c']);
  });

  it('marks followed series on the rows', async () => {
    mockGetAllIds.mockResolvedValue(['b']);
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setQuery('a'));
    const followed = result.current.results.filter(r => r.isFollowed).map(r => r.id);
    expect(followed).toEqual(['b']);
  });

  it('the HISTORY carries the current followed flag — the bug where its star was always empty', async () => {
    mockGetAllIds.mockResolvedValue(['h1']);
    mockHistoryList.mockResolvedValue([historyItem({ seriesId: 'h1' })]);
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.history).toHaveLength(1));
    await waitFor(() => expect(result.current.history[0].isFollowed).toBe(true));
  });

  it('a history row for an unfollowed series stays unfollowed', async () => {
    mockGetAllIds.mockResolvedValue([]);
    mockHistoryList.mockResolvedValue([historyItem({ seriesId: 'h1' })]);
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.history).toHaveLength(1));
    expect(result.current.history[0].isFollowed).toBe(false);
  });

  it('a follow toggled elsewhere updates BOTH the results and the history, with no refetch', async () => {
    mockGetAllIds.mockResolvedValue([]);
    mockHistoryList.mockResolvedValue([historyItem({ seriesId: 'a', name: 'One Piece' })]);
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.history).toHaveLength(1));

    act(() => result.current.setQuery('piece'));
    expect(result.current.results[0].isFollowed).toBe(false);
    expect(result.current.history[0].isFollowed).toBe(false);

    // Kotlin pushes the new followed set (the user starred it from this screen or another).
    act(() => mockFollowedListeners.forEach(fn => fn(['a'])));

    expect(result.current.results[0].isFollowed).toBe(true);
    expect(result.current.history[0].isFollowed).toBe(true);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('a failed digest surfaces an error', async () => {
    mockGet.mockResolvedValue({ isSuccess: false, error: { code: 'NO_SERVER', message: 'no server' } });
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('no server');
  });

  it('a rejected fetch surfaces an error rather than throwing', async () => {
    mockGet.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('offline');
  });

  it('a followed-ids failure degrades to "nothing followed", it does not fail the load', async () => {
    mockGetAllIds.mockRejectedValue(new Error('bridge down'));
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    act(() => result.current.setQuery('piece'));
    expect(result.current.results).toHaveLength(1);
  });

  it('a language change re-labels the rows WITHOUT refetching the catalogue', async () => {
    const { result, rerender } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setQuery('piece'));
    expect(result.current.results[0].readStatusLabel).toBe('Não lido');

    mockLanguage.current = 'en';
    rerender({});

    await waitFor(() => expect(result.current.results[0].readStatusLabel).toBe('Unread'));
    // The catalogue itself never changed — re-fetching it would be wasted work.
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('reload refetches', async () => {
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.reload());
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
  });
});

describe('useSearch — history', () => {
  it('loads the stored history on mount', async () => {
    mockHistoryList.mockResolvedValue([historyItem()]);
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.history).toHaveLength(1));
  });

  it('recordOpened stores the series from a result row', async () => {
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.recordOpened({ seriesId: 'a' }));
    await waitFor(() => expect(mockHistoryPut).toHaveBeenCalled());
    expect(mockHistoryPut.mock.calls[0][0].item).toMatchObject({
      seriesId: 'a',
      name: 'One Piece',
      coverUrl: 'cover/a',
    });
  });

  it('recordOpened works for a HISTORY row even when it is not in the catalogue', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ seriesId: 'gone', name: 'Gone', coverUrl: 'cg' })]);
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.history).toHaveLength(1));

    act(() => result.current.recordOpened({ seriesId: 'gone' }));
    await waitFor(() => expect(mockHistoryPut).toHaveBeenCalled());
    expect(mockHistoryPut.mock.calls[0][0].item).toMatchObject({ seriesId: 'gone', name: 'Gone' });
  });

  it('recordOpened is a no-op for an id it can identify from neither list', async () => {
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.recordOpened({ seriesId: 'unknown' }));
    expect(mockHistoryPut).not.toHaveBeenCalled();
  });

  it('the stored list replaces the in-memory one after a write', async () => {
    mockHistoryPut.mockResolvedValue([historyItem({ seriesId: 'a', name: 'One Piece' })]);
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.recordOpened({ seriesId: 'a' }));
    await waitFor(() => expect(result.current.history.map(h => h.seriesId)).toEqual(['a']));
  });
});

describe('useSearch — delete confirmation', () => {
  it('requestDelete opens the dialog without deleting anything', async () => {
    mockHistoryList.mockResolvedValue([historyItem()]);
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.history).toHaveLength(1));

    act(() => result.current.requestDelete({ seriesId: 'h1' }));
    expect(result.current.pendingDelete?.seriesId).toBe('h1');
    expect(mockHistoryDelete).not.toHaveBeenCalled();
  });

  it('cancel closes the dialog and deletes nothing', async () => {
    mockHistoryList.mockResolvedValue([historyItem()]);
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.history).toHaveLength(1));

    act(() => result.current.requestDelete({ seriesId: 'h1' }));
    act(() => result.current.cancelDelete());
    expect(result.current.pendingDelete).toBeNull();
    expect(mockHistoryDelete).not.toHaveBeenCalled();
  });

  it('confirm deletes and closes', async () => {
    mockHistoryList.mockResolvedValue([historyItem()]);
    mockHistoryDelete.mockResolvedValue([]);
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.history).toHaveLength(1));

    act(() => result.current.requestDelete({ seriesId: 'h1' }));
    act(() => result.current.confirmDelete());
    expect(result.current.pendingDelete).toBeNull();
    await waitFor(() => expect(mockHistoryDelete).toHaveBeenCalledWith({ seriesId: 'h1' }));
    await waitFor(() => expect(result.current.history).toEqual([]));
  });

  it('requestDelete for an unknown id opens no dialog', async () => {
    mockHistoryList.mockResolvedValue([historyItem()]);
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.history).toHaveLength(1));
    act(() => result.current.requestDelete({ seriesId: 'nope' }));
    expect(result.current.pendingDelete).toBeNull();
  });

  it('confirm with no pending row is a no-op', async () => {
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.confirmDelete());
    expect(mockHistoryDelete).not.toHaveBeenCalled();
  });
});
