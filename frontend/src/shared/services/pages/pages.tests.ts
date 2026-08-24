import { PageService } from './pages.services';

jest.mock('../../bridge/digest', () => ({
  DigestBridge: {
    getPageDigest: jest.fn(),
  },
}));

jest.mock('../../bridge/server', () => ({
  ServerBridge: {
    getPageDimensions: jest.fn(),
    getPageUrl: jest.fn(),
  },
}));

import { DigestBridge } from '../../bridge/digest';
import { ServerBridge } from '../../bridge/server';

const mockGetPageDigest = DigestBridge.getPageDigest as jest.Mock;
const mockGetPageDimensions = ServerBridge.getPageDimensions as jest.Mock;
const mockGetPageUrl = ServerBridge.getPageUrl as jest.Mock;

describe('PageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('forwards seriesId/chapterId/pageIndex to DigestBridge.getPageDigest', async () => {
      mockGetPageDigest.mockResolvedValue({ isSuccess: true });
      await PageService.get({ seriesId: 'series-1', chapterId: 'chapter-1', pageIndex: 3 });
      expect(mockGetPageDigest).toHaveBeenCalledWith('series-1', 'chapter-1', 3);
    });

    it('returns the PageDigest exactly as the bridge resolved it (success)', async () => {
      const digest = { isSuccess: true, id: 'page-1', number: 3 };
      mockGetPageDigest.mockResolvedValue(digest);
      const result = await PageService.get({ seriesId: 'series-1', chapterId: 'chapter-1', pageIndex: 3 });
      expect(result).toBe(digest);
    });

    it('returns the PageDigest exactly as the bridge resolved it (failure)', async () => {
      const digest = { isSuccess: false, error: { message: 'not found' } };
      mockGetPageDigest.mockResolvedValue(digest);
      const result = await PageService.get({ seriesId: 'series-1', chapterId: 'chapter-1', pageIndex: 3 });
      expect(result).toBe(digest);
    });
  });

  describe('raw.dimensions', () => {
    it('calls ServerBridge.getPageDimensions and returns the raw PluginPageDimension', async () => {
      const dimensions = { width: 800, height: 1200 };
      mockGetPageDimensions.mockResolvedValue(dimensions);
      const result = await PageService.raw.dimensions({ seriesId: 'series-1', chapterId: 'chapter-1', pageIndex: 3 });
      expect(mockGetPageDimensions).toHaveBeenCalledWith('series-1', 'chapter-1', 3);
      expect(result).toBe(dimensions);
    });
  });

  describe('raw.url', () => {
    it('calls ServerBridge.getPageUrl and returns the raw url', async () => {
      mockGetPageUrl.mockResolvedValue('https://example.invalid/page.jpg');
      const result = await PageService.raw.url({ seriesId: 'series-1', chapterId: 'chapter-1', pageIndex: 3 });
      expect(mockGetPageUrl).toHaveBeenCalledWith('series-1', 'chapter-1', 3);
      expect(result).toBe('https://example.invalid/page.jpg');
    });
  });

  describe('bound', () => {
    it('pre-fills seriesId/chapterId/pageIndex on get', async () => {
      mockGetPageDigest.mockResolvedValue({ isSuccess: true });
      const page = PageService.bound({ seriesId: 'series-1', chapterId: 'chapter-1', pageIndex: 3 });
      await page.get();
      expect(mockGetPageDigest).toHaveBeenCalledWith('series-1', 'chapter-1', 3);
    });

    it('pre-fills seriesId/chapterId/pageIndex on raw.dimensions/raw.url', async () => {
      mockGetPageDimensions.mockResolvedValue({ width: 800, height: 1200 });
      mockGetPageUrl.mockResolvedValue('https://example.invalid/page.jpg');
      const page = PageService.bound({ seriesId: 'series-1', chapterId: 'chapter-1', pageIndex: 3 });
      await page.raw.dimensions();
      await page.raw.url();
      expect(mockGetPageDimensions).toHaveBeenCalledWith('series-1', 'chapter-1', 3);
      expect(mockGetPageUrl).toHaveBeenCalledWith('series-1', 'chapter-1', 3);
    });

    it('lets a caller override a fixed field for one call', async () => {
      mockGetPageDigest.mockResolvedValue({ isSuccess: true });
      const page = PageService.bound({ seriesId: 'series-1', chapterId: 'chapter-1', pageIndex: 3 });
      await page.get({ pageIndex: 4 });
      expect(mockGetPageDigest).toHaveBeenCalledWith('series-1', 'chapter-1', 4);
    });

    it('does not expose a nested bound of its own', () => {
      const page = PageService.bound({ seriesId: 'series-1', chapterId: 'chapter-1', pageIndex: 3 });
      expect('bound' in page).toBe(false);
    });
  });
});
