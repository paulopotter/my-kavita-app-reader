jest.mock('../caches/cache.manager', () => ({
  CacheManager: {
    persistent: { get: jest.fn(), put: jest.fn(), invalidate: jest.fn() },
  },
}));

import { CacheManager } from '../caches/cache.manager';
import { ReadingProgressManager } from './reading-progress.manager';

const mockGet = CacheManager.persistent.get as jest.Mock;
const mockPut = CacheManager.persistent.put as jest.Mock;
const mockInvalidate = CacheManager.persistent.invalidate as jest.Mock;

describe('ReadingProgressManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPut.mockResolvedValue({});
    mockInvalidate.mockResolvedValue(undefined);
  });

  describe('get', () => {
    it('returns null when the cache has no entry', async () => {
      mockGet.mockResolvedValue(null);
      expect(await ReadingProgressManager.get('c1')).toBeNull();
      expect(mockGet).toHaveBeenCalledWith({ key: 'c1', variant: '' });
    });

    it('parses the value and folds in the cache timestamp as updatedAtEpochMs', async () => {
      mockGet.mockResolvedValue({
        value: JSON.stringify({ seriesId: 's1', page: 12, scrollFraction: 0.4 }),
        cachedAtEpochMs: 1_700_000,
        ttlMs: 0,
        isExpired: false,
      });
      expect(await ReadingProgressManager.get('c1')).toEqual({
        seriesId: 's1', page: 12, scrollFraction: 0.4, updatedAtEpochMs: 1_700_000,
      });
    });

    it('returns null when the stored value is not valid JSON', async () => {
      mockGet.mockResolvedValue({ value: 'not json', cachedAtEpochMs: 1, ttlMs: 0, isExpired: false });
      expect(await ReadingProgressManager.get('c1')).toBeNull();
    });
  });

  describe('set', () => {
    it('writes the JSON value under the readingProgress domain', async () => {
      await ReadingProgressManager.set('c1', { seriesId: 's1', page: 7, scrollFraction: 0.1 });
      expect(mockPut).toHaveBeenCalledWith({
        key: 'c1',
        value: JSON.stringify({ seriesId: 's1', page: 7, scrollFraction: 0.1 }),
        domain: 'readingProgress',
        variant: '',
      });
    });

    it('resolves to undefined (not the descriptor)', async () => {
      mockPut.mockResolvedValue({ key: 'c1', cachedAtEpochMs: 1 });
      expect(await ReadingProgressManager.set('c1', { seriesId: 's1', page: 1, scrollFraction: 0 })).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('invalidates the entry by key', async () => {
      await ReadingProgressManager.clear('c1');
      expect(mockInvalidate).toHaveBeenCalledWith({ key: 'c1', variant: '' });
    });
  });
});
