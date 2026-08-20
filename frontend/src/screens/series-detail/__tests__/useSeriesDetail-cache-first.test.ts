import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockFetchSeriesDetail = jest.fn();
const mockFetchSeriesMetadata = jest.fn();
const mockFetchCachedSeriesDetail = jest.fn().mockResolvedValue(null);
const mockFetchCachedSeriesMetadata = jest.fn().mockResolvedValue(null);
const mockFetchChapters = jest.fn().mockResolvedValue([]);
const mockFetchCachedChapters = jest.fn().mockResolvedValue([]);
const mockFetchIsSeriesFollowed = jest.fn().mockResolvedValue(false);
const mockGetChapterSortPrefs = jest.fn().mockResolvedValue({ mode: 'ASCENDING', progressPercent: 50 });
const mockGetSeriesSortPrefs = jest.fn().mockResolvedValue(null);

jest.mock('../SeriesDetailService', () => ({
  fetchSeriesDetail: (...args: unknown[]) => mockFetchSeriesDetail(...args),
  fetchSeriesMetadata: (...args: unknown[]) => mockFetchSeriesMetadata(...args),
  fetchCachedSeriesDetail: (...args: unknown[]) => mockFetchCachedSeriesDetail(...args),
  fetchCachedSeriesMetadata: (...args: unknown[]) => mockFetchCachedSeriesMetadata(...args),
  fetchChapters: (...args: unknown[]) => mockFetchChapters(...args),
  fetchCachedChapters: (...args: unknown[]) => mockFetchCachedChapters(...args),
  fetchIsSeriesFollowed: (...args: unknown[]) => mockFetchIsSeriesFollowed(...args),
  getChapterSortPrefs: (...args: unknown[]) => mockGetChapterSortPrefs(...args),
  getSeriesSortPrefs: (...args: unknown[]) => mockGetSeriesSortPrefs(...args),
  setSeriesSortPrefs: jest.fn().mockResolvedValue(undefined),
  resetSeriesSortPrefs: jest.fn().mockResolvedValue(undefined),
  replaceCachedChapters: jest.fn().mockResolvedValue(undefined),
  markChaptersRead: jest.fn().mockResolvedValue(undefined),
  markChaptersUnread: jest.fn().mockResolvedValue(undefined),
  toggleFollow: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../shared/bridge/series', () => ({
  SeriesFollowedEmitter: { addListener: jest.fn(() => ({ remove: jest.fn() })) },
  SeriesBridge: {},
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: () => {},
}));

import { useSeriesDetail } from '../useSeriesDetail';

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchCachedSeriesDetail.mockResolvedValue(null);
  mockFetchCachedSeriesMetadata.mockResolvedValue(null);
  mockFetchChapters.mockResolvedValue([]);
  mockFetchCachedChapters.mockResolvedValue([]);
  mockFetchIsSeriesFollowed.mockResolvedValue(false);
  mockGetChapterSortPrefs.mockResolvedValue({ mode: 'ASCENDING', progressPercent: 50 });
  mockGetSeriesSortPrefs.mockResolvedValue(null);
});

describe('useSeriesDetail — cache-first de detail/metadata', () => {
  it('pinta detail/metadata do cache local antes da rede resolver', async () => {
    mockFetchCachedSeriesDetail.mockResolvedValue({ id: '10', name: 'Nome em cache', coverImageUrl: 'cache.jpg' });
    mockFetchCachedSeriesMetadata.mockResolvedValue({ summary: 'resumo em cache', genres: ['Ação'], tags: [] });
    let resolveNetwork: (() => void) | null = null;
    mockFetchSeriesDetail.mockImplementation(
      () => new Promise(resolve => { resolveNetwork = () => resolve({ id: '10', name: 'Nome da rede', coverImageUrl: 'rede.jpg' }); }),
    );
    mockFetchSeriesMetadata.mockResolvedValue({ summary: 'resumo da rede', genres: ['Ação', 'Aventura'], tags: [] });

    const { result } = renderHook(() => useSeriesDetail('10'));

    await waitFor(() => expect(result.current.detail?.name).toBe('Nome em cache'));
    expect(result.current.metadata?.summary).toBe('resumo em cache');

    await act(async () => {
      resolveNetwork?.();
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.detail?.name).toBe('Nome da rede'));
  });

  it('nao quebra quando nao ha cache local (primeira visita)', async () => {
    mockFetchCachedSeriesDetail.mockResolvedValue(null);
    mockFetchCachedSeriesMetadata.mockResolvedValue(null);
    mockFetchSeriesDetail.mockResolvedValue({ id: '10', name: 'Nome da rede', coverImageUrl: 'rede.jpg' });
    mockFetchSeriesMetadata.mockResolvedValue({ summary: null, genres: [], tags: [] });

    const { result } = renderHook(() => useSeriesDetail('10'));

    await waitFor(() => expect(result.current.detail?.name).toBe('Nome da rede'));
  });
});
