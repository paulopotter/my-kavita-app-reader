import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Chapter } from '../../../shared/bridge/series';

const mockFetchSeriesDetail = jest.fn().mockResolvedValue({ id: '10', name: 'S', coverImageUrl: '' });
const mockFetchSeriesMetadata = jest.fn().mockResolvedValue({ summary: null, genres: [], tags: [] });
const mockFetchChapters = jest.fn();
const mockFetchCachedChapters = jest.fn().mockResolvedValue([]);
const mockFetchIsSeriesFollowed = jest.fn().mockResolvedValue(false);
const mockGetChapterSortPrefs = jest.fn().mockResolvedValue({ mode: 'ASCENDING', progressPercent: 50 });
const mockGetSeriesSortPrefs = jest.fn().mockResolvedValue(null);
const mockReplaceCachedChapters = jest.fn().mockResolvedValue(undefined);
const mockMarkChaptersRead = jest.fn().mockResolvedValue(undefined);
const mockMarkChaptersUnread = jest.fn().mockResolvedValue(undefined);

jest.mock('../SeriesDetailService', () => ({
  fetchSeriesDetail: (...args: unknown[]) => mockFetchSeriesDetail(...args),
  fetchSeriesMetadata: (...args: unknown[]) => mockFetchSeriesMetadata(...args),
  fetchCachedSeriesDetail: jest.fn().mockResolvedValue(null),
  fetchCachedSeriesMetadata: jest.fn().mockResolvedValue(null),
  fetchChapters: (...args: unknown[]) => mockFetchChapters(...args),
  fetchCachedChapters: (...args: unknown[]) => mockFetchCachedChapters(...args),
  fetchIsSeriesFollowed: (...args: unknown[]) => mockFetchIsSeriesFollowed(...args),
  getChapterSortPrefs: (...args: unknown[]) => mockGetChapterSortPrefs(...args),
  getSeriesSortPrefs: (...args: unknown[]) => mockGetSeriesSortPrefs(...args),
  setSeriesSortPrefs: jest.fn().mockResolvedValue(undefined),
  resetSeriesSortPrefs: jest.fn().mockResolvedValue(undefined),
  replaceCachedChapters: (...args: unknown[]) => mockReplaceCachedChapters(...args),
  markChaptersRead: (...args: unknown[]) => mockMarkChaptersRead(...args),
  markChaptersUnread: (...args: unknown[]) => mockMarkChaptersUnread(...args),
  toggleFollow: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../shared/bridge/series', () => ({
  SeriesFollowedEmitter: { addListener: jest.fn(() => ({ remove: jest.fn() })) },
  SeriesBridge: {},
}));

// useFocusEffect real só dispara quando a tela ganha foco (depois do mount) — não imediatamente
// no mount como um useEffect comum. Mockamos como no-op: os testes deste arquivo cobrem o
// carregamento inicial via load(), não o refetch de foco (useSeriesDetail.test.ts cobre o
// reducer isoladamente).
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: () => {},
}));

import { useSeriesDetail } from '../useSeriesDetail';

function makeChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: '1',
    seriesId: '10',
    title: 'Cap',
    number: '1',
    pageCount: 20,
    sortOrder: 1,
    readStatus: 'UNREAD',
    pagesRead: 0,
    updatedAtLocalMs: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchSeriesDetail.mockResolvedValue({ id: '10', name: 'S', coverImageUrl: '' });
  mockFetchSeriesMetadata.mockResolvedValue({ summary: null, genres: [], tags: [] });
  mockFetchCachedChapters.mockResolvedValue([]);
  mockFetchIsSeriesFollowed.mockResolvedValue(false);
  mockGetChapterSortPrefs.mockResolvedValue({ mode: 'ASCENDING', progressPercent: 50 });
  mockGetSeriesSortPrefs.mockResolvedValue(null);
  mockReplaceCachedChapters.mockResolvedValue(undefined);
  mockMarkChaptersRead.mockResolvedValue(undefined);
  mockMarkChaptersUnread.mockResolvedValue(undefined);
  mockFetchChapters.mockResolvedValue([makeChapter({ id: '1' }), makeChapter({ id: '2' })]);
});

describe('useSeriesDetail — sair do modo selecao apos marcar', () => {
  it('markRead sai do modo selecao apos marcar os capitulos selecionados', async () => {
    const { result } = renderHook(() => useSeriesDetail('10'));

    await waitFor(() => expect(result.current.chapters.length).toBe(2));

    act(() => {
      result.current.onChapterLongPress('1');
    });
    expect(result.current.selectionMode).toBe(true);

    await act(async () => {
      await result.current.markRead(['1']);
    });

    expect(mockMarkChaptersRead).toHaveBeenCalledWith('10', ['1']);
    expect(result.current.selectionMode).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('markUnread sai do modo selecao apos desmarcar os capitulos selecionados', async () => {
    const { result } = renderHook(() => useSeriesDetail('10'));

    await waitFor(() => expect(result.current.chapters.length).toBe(2));

    act(() => {
      result.current.onChapterLongPress('1');
    });
    expect(result.current.selectionMode).toBe(true);

    await act(async () => {
      await result.current.markUnread(['1']);
    });

    expect(mockMarkChaptersUnread).toHaveBeenCalledWith('10', ['1']);
    expect(result.current.selectionMode).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });
});
