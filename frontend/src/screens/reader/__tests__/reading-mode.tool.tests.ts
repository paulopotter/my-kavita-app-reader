jest.mock('../../../shared/managers/preferences', () => ({
  PreferencesManager: {
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

import { PreferencesManager } from '../../../shared/managers/preferences';
import { ReadingModeTool } from '../reading-mode.tool';

const mockGet = PreferencesManager.get as jest.Mock;
const mockPut = PreferencesManager.put as jest.Mock;
const mockDelete = PreferencesManager.delete as jest.Mock;

describe('ReadingModeTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPut.mockResolvedValue({});
    mockDelete.mockResolvedValue(undefined);
  });

  describe('get', () => {
    it('returns the hardcoded default when nothing is stored (global scope)', async () => {
      mockGet.mockResolvedValue(null);
      expect(await ReadingModeTool.get({ domain: 'global' })).toEqual({ mode: 'webtoon' });
      expect(mockGet).toHaveBeenCalledWith({ key: 'global' });
    });

    it('returns the stored global prefs when present', async () => {
      mockGet.mockResolvedValue({ value: JSON.stringify({ mode: 'paginated' }) });
      expect(await ReadingModeTool.get({ domain: 'global' })).toEqual({ mode: 'paginated' });
    });

    it('series scope with no override falls through to global (no isOverride)', async () => {
      mockGet.mockImplementation(({ key }: { key: string }) =>
        Promise.resolve(key === 'global' ? { value: JSON.stringify({ mode: 'horizontal' }) } : null),
      );
      const result = await ReadingModeTool.get({ domain: 'series', seriesId: 's1' });
      expect(result).toEqual({ mode: 'horizontal' });
      expect('isOverride' in result).toBe(false);
    });

    it('series scope with an override returns it flagged isOverride', async () => {
      mockGet.mockImplementation(({ key }: { key: string }) =>
        Promise.resolve(key === 's1' ? { value: JSON.stringify({ mode: 'paginated' }) } : null),
      );
      const result = await ReadingModeTool.get({ domain: 'series', seriesId: 's1' });
      expect(result).toEqual({ mode: 'paginated', isOverride: true });
    });

    it('series scope with neither override nor global falls back to the default', async () => {
      mockGet.mockResolvedValue(null);
      expect(await ReadingModeTool.get({ domain: 'series', seriesId: 's1' })).toEqual({ mode: 'webtoon' });
    });
  });

  describe('put', () => {
    it('writes the global prefs under the readingModePrefs domain, key "global"', async () => {
      await ReadingModeTool.put({ domain: 'global' }, { mode: 'horizontal' });
      expect(mockPut).toHaveBeenCalledWith({
        key: 'global',
        value: JSON.stringify({ mode: 'horizontal' }),
        domain: 'readingModePrefs',
      });
    });

    it('writes a per-series override under key = seriesId', async () => {
      await ReadingModeTool.put({ domain: 'series', seriesId: 's7' }, { mode: 'paginated' });
      expect(mockPut).toHaveBeenCalledWith({
        key: 's7',
        value: JSON.stringify({ mode: 'paginated' }),
        domain: 'readingModePrefs',
      });
    });
  });

  describe('reset', () => {
    it('deletes the per-series override and returns the global default that now applies', async () => {
      mockGet.mockResolvedValue({ value: JSON.stringify({ mode: 'horizontal' }) });
      const result = await ReadingModeTool.reset({ seriesId: 's1' });
      expect(mockDelete).toHaveBeenCalledWith({ key: 's1' });
      expect(result).toEqual({ mode: 'horizontal' });
    });
  });
});
