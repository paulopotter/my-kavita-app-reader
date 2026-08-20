jest.mock('../../../shared/bridge/series', () => ({
  SeriesBridge: {
    getSeriesDetail: jest.fn(),
    getSeriesMetadata: jest.fn(),
    getCachedSeriesDetail: jest.fn(),
    getCachedSeriesMetadata: jest.fn(),
    getChapters: jest.fn(),
    getCachedChapters: jest.fn(),
    replaceCachedChapters: jest.fn(),
    markChaptersRead: jest.fn(),
    markChaptersUnread: jest.fn(),
    toggleFollow: jest.fn(),
    isSeriesFollowed: jest.fn(),
    getChapterSortPrefs: jest.fn(),
    setChapterSortPrefs: jest.fn(),
    getSeriesSortPrefs: jest.fn(),
    setSeriesSortPrefs: jest.fn(),
    resetSeriesSortPrefs: jest.fn(),
  },
}));

import { SeriesBridge } from '../../../shared/bridge/series';
import * as service from '../SeriesDetailService';

const mockSeriesBridge = SeriesBridge as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  Object.values(mockSeriesBridge).forEach(fn => fn.mockResolvedValue(undefined));
});

describe('SeriesDetailService — delega para SeriesBridge', () => {
  it('fetchSeriesDetail', async () => {
    mockSeriesBridge.getSeriesDetail.mockResolvedValue({ id: '1', name: 'S', coverImageUrl: '' });
    expect(await service.fetchSeriesDetail('1')).toEqual({ id: '1', name: 'S', coverImageUrl: '' });
    expect(mockSeriesBridge.getSeriesDetail).toHaveBeenCalledWith('1');
  });

  it('fetchSeriesMetadata', async () => {
    mockSeriesBridge.getSeriesMetadata.mockResolvedValue({ summary: null, genres: [], tags: [] });
    await service.fetchSeriesMetadata('1');
    expect(mockSeriesBridge.getSeriesMetadata).toHaveBeenCalledWith('1');
  });

  it('fetchCachedSeriesDetail', async () => {
    mockSeriesBridge.getCachedSeriesDetail.mockResolvedValue(null);
    expect(await service.fetchCachedSeriesDetail('1')).toBeNull();
    expect(mockSeriesBridge.getCachedSeriesDetail).toHaveBeenCalledWith('1');
  });

  it('fetchCachedSeriesMetadata', async () => {
    mockSeriesBridge.getCachedSeriesMetadata.mockResolvedValue(null);
    expect(await service.fetchCachedSeriesMetadata('1')).toBeNull();
    expect(mockSeriesBridge.getCachedSeriesMetadata).toHaveBeenCalledWith('1');
  });

  it('fetchChapters', async () => {
    mockSeriesBridge.getChapters.mockResolvedValue([]);
    await service.fetchChapters('1');
    expect(mockSeriesBridge.getChapters).toHaveBeenCalledWith('1');
  });

  it('fetchCachedChapters', async () => {
    mockSeriesBridge.getCachedChapters.mockResolvedValue([]);
    await service.fetchCachedChapters('1');
    expect(mockSeriesBridge.getCachedChapters).toHaveBeenCalledWith('1');
  });

  it('replaceCachedChapters', async () => {
    await service.replaceCachedChapters('1', []);
    expect(mockSeriesBridge.replaceCachedChapters).toHaveBeenCalledWith('1', []);
  });

  it('markChaptersRead', async () => {
    await service.markChaptersRead('1', ['c1']);
    expect(mockSeriesBridge.markChaptersRead).toHaveBeenCalledWith('1', ['c1']);
  });

  it('markChaptersUnread', async () => {
    await service.markChaptersUnread('1', ['c1']);
    expect(mockSeriesBridge.markChaptersUnread).toHaveBeenCalledWith('1', ['c1']);
  });

  it('toggleFollow', async () => {
    await service.toggleFollow('1');
    expect(mockSeriesBridge.toggleFollow).toHaveBeenCalledWith('1');
  });

  it('fetchIsSeriesFollowed', async () => {
    mockSeriesBridge.isSeriesFollowed.mockResolvedValue(true);
    expect(await service.fetchIsSeriesFollowed('1')).toBe(true);
    expect(mockSeriesBridge.isSeriesFollowed).toHaveBeenCalledWith('1');
  });

  it('getChapterSortPrefs', async () => {
    mockSeriesBridge.getChapterSortPrefs.mockResolvedValue({ mode: 'ASCENDING', progressPercent: 50 });
    await service.getChapterSortPrefs();
    expect(mockSeriesBridge.getChapterSortPrefs).toHaveBeenCalled();
  });

  it('setChapterSortPrefs', async () => {
    await service.setChapterSortPrefs('ASCENDING', 5, 50);
    expect(mockSeriesBridge.setChapterSortPrefs).toHaveBeenCalledWith('ASCENDING', 5, 50);
  });

  it('getSeriesSortPrefs', async () => {
    mockSeriesBridge.getSeriesSortPrefs.mockResolvedValue(null);
    expect(await service.getSeriesSortPrefs('1')).toBeNull();
    expect(mockSeriesBridge.getSeriesSortPrefs).toHaveBeenCalledWith('1');
  });

  it('setSeriesSortPrefs', async () => {
    await service.setSeriesSortPrefs('1', 'DESCENDING', undefined, 50);
    expect(mockSeriesBridge.setSeriesSortPrefs).toHaveBeenCalledWith('1', 'DESCENDING', undefined, 50);
  });

  it('resetSeriesSortPrefs', async () => {
    await service.resetSeriesSortPrefs('1');
    expect(mockSeriesBridge.resetSeriesSortPrefs).toHaveBeenCalledWith('1');
  });
});
