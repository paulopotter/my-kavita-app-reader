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
  markChaptersRead: jest.fn().mockResolvedValue(undefined),
  markChaptersUnread: jest.fn().mockResolvedValue(undefined),
  toggleFollow: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../shared/bridge/series', () => ({
  SeriesFollowedEmitter: { addListener: jest.fn(() => ({ remove: jest.fn() })) },
  SeriesBridge: {},
}));

// useFocusEffect real dispara logo após o mount quando a tela já nasce em foco (caso comum de
// navegação) — rodando em paralelo com o efeito de carregamento inicial (load()). Este mock
// simula esse disparo imediato para expor a race entre os dois.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(effect, []);
  },
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
  mockFetchChapters.mockResolvedValue([makeChapter({ id: '1' }), makeChapter({ id: '2' })]);
});

describe('useSeriesDetail — race entre load() inicial e useFocusEffect', () => {
  it('nao sobrescreve com lista vazia quando o sync do foco termina primeiro que o load() inicial', async () => {
    const { result } = renderHook(() => useSeriesDetail('10'));

    await waitFor(() => expect(result.current.chapters.length).toBe(2));

    // Aguarda qualquer efeito assincrono remanescente (o load() inicial, mais lento, resolvendo
    // por ultimo) para garantir que ele nao pisa no resultado ja carregado.
    await act(async () => {
      await new Promise<void>(resolve => setTimeout(resolve, 20));
    });

    expect(result.current.chapters.length).toBe(2);
  });
});
