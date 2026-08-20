import { act, renderHook, waitFor } from '@testing-library/react-native';
import { SeriesSummary } from '../../../shared/bridge/library';

let followedIdsListener: ((ids: string[]) => void) | null = null;
let progressChangedListener: ((event: unknown) => void) | null = null;

jest.mock('../../../shared/bridge/series', () => ({
  SeriesFollowedEmitter: {
    addListener: jest.fn((_event: string, cb: (ids: string[]) => void) => {
      followedIdsListener = cb;
      return { remove: jest.fn() };
    }),
  },
  SeriesProgressChangedEmitter: {
    addListener: jest.fn((_event: string, cb: (event: unknown) => void) => {
      progressChangedListener = cb;
      return { remove: jest.fn() };
    }),
  },
  SeriesBridge: {},
}));

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

beforeEach(() => {
  jest.clearAllMocks();
  followedIdsListener = null;
  progressChangedListener = null;
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

describe('useLibrary — progresso reage a mudanças via evento (sem refetch)', () => {
  it('atualiza progressFraction/readChapters/readStatus da serie correspondente ao evento', async () => {
    const { result } = renderHook(() => useLibrary());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      progressChangedListener?.({ seriesId: '1', progressFraction: 0.5, readChapters: 5, chapterCount: 10 });
    });

    await waitFor(() => {
      const series = result.current.data.find(s => s.id === 1);
      expect(series?.progressFraction).toBe(0.5);
      expect(series?.readChapters).toBe(5);
      expect(series?.chapterCount).toBe(10);
      expect(series?.readStatus).toBe('IN_PROGRESS');
    });

    // Série não referenciada pelo evento permanece intocada.
    expect(result.current.data.find(s => s.id === 2)?.progressFraction).toBe(0);
  });

  it('deriva readStatus READ quando readChapters atinge chapterCount', async () => {
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      progressChangedListener?.({ seriesId: '1', progressFraction: 1, readChapters: 10, chapterCount: 10 });
    });

    await waitFor(() => expect(result.current.data.find(s => s.id === 1)?.readStatus).toBe('READ'));
  });
});
