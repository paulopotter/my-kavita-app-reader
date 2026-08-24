import { ChapterService } from './chapters.services';

jest.mock('../../bridge/digest', () => ({
  DigestBridge: {
    getChapterDigest: jest.fn(),
  },
}));

jest.mock('../../bridge/server', () => ({
  ServerBridge: {
    getChapter: jest.fn(),
    getChapterProgress: jest.fn(),
    setChapterProgress: jest.fn(),
    setChapterRead: jest.fn(),
  },
}));

import { DigestBridge } from '../../bridge/digest';
import { ServerBridge } from '../../bridge/server';

const mockGetChapterDigest = DigestBridge.getChapterDigest as jest.Mock;
const mockGetChapter = ServerBridge.getChapter as jest.Mock;
const mockGetChapterProgress = ServerBridge.getChapterProgress as jest.Mock;
const mockSetChapterProgress = ServerBridge.setChapterProgress as jest.Mock;
const mockSetChapterRead = ServerBridge.setChapterRead as jest.Mock;

describe('ChapterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('calls DigestBridge.getChapterDigest with full=false', async () => {
      mockGetChapterDigest.mockResolvedValue({ isSuccess: true });
      await ChapterService.get({ seriesId: 'series-1', chapterId: 'chapter-1' });
      expect(mockGetChapterDigest).toHaveBeenCalledWith('series-1', 'chapter-1', false);
    });

    it('returns the ChapterDigest exactly as the bridge resolved it', async () => {
      const digest = { isSuccess: true, id: 'chapter-1', title: 'Ch. 1' };
      mockGetChapterDigest.mockResolvedValue(digest);
      const result = await ChapterService.get({ seriesId: 'series-1', chapterId: 'chapter-1' });
      expect(result).toBe(digest);
    });
  });

  describe('getFull', () => {
    it('calls DigestBridge.getChapterDigest with full=true', async () => {
      mockGetChapterDigest.mockResolvedValue({ isSuccess: true });
      await ChapterService.getFull({ seriesId: 'series-1', chapterId: 'chapter-1' });
      expect(mockGetChapterDigest).toHaveBeenCalledWith('series-1', 'chapter-1', true);
    });

    it('returns the ChapterDigest exactly as the bridge resolved it (failure)', async () => {
      const digest = { isSuccess: false, error: { message: 'not found' } };
      mockGetChapterDigest.mockResolvedValue(digest);
      const result = await ChapterService.getFull({ seriesId: 'series-1', chapterId: 'chapter-1' });
      expect(result).toBe(digest);
    });
  });

  describe('raw.get', () => {
    it('calls ServerBridge.getChapter and returns the raw PluginChapter', async () => {
      const chapter = { id: 'chapter-1', title: 'Ch. 1', pageCount: 20, pagesRead: 5, isSpecial: false };
      mockGetChapter.mockResolvedValue(chapter);
      const result = await ChapterService.raw.get({ seriesId: 'series-1', chapterId: 'chapter-1' });
      expect(mockGetChapter).toHaveBeenCalledWith('series-1', 'chapter-1');
      expect(result).toBe(chapter);
    });
  });

  describe('progress.get', () => {
    it('calls ServerBridge.getChapterProgress and returns the raw PluginProgress', async () => {
      const progress = { pageIndex: 5, updatedAtUtc: '2026-08-24T00:00:00Z' };
      mockGetChapterProgress.mockResolvedValue(progress);
      const result = await ChapterService.progress.get({ seriesId: 'series-1', chapterId: 'chapter-1' });
      expect(mockGetChapterProgress).toHaveBeenCalledWith('series-1', 'chapter-1');
      expect(result).toBe(progress);
    });

    it('returns null when the bridge resolves null', async () => {
      mockGetChapterProgress.mockResolvedValue(null);
      const result = await ChapterService.progress.get({ seriesId: 'series-1', chapterId: 'chapter-1' });
      expect(result).toBeNull();
    });
  });

  describe('progress.set', () => {
    it('calls ServerBridge.setChapterProgress with the given pageIndex', async () => {
      mockSetChapterProgress.mockResolvedValue(undefined);
      await ChapterService.progress.set({ seriesId: 'series-1', chapterId: 'chapter-1', pageIndex: 7 });
      expect(mockSetChapterProgress).toHaveBeenCalledWith('series-1', 'chapter-1', 7);
    });
  });

  describe('status.set', () => {
    it('calls ServerBridge.setChapterRead with the given isRead', async () => {
      mockSetChapterRead.mockResolvedValue(undefined);
      await ChapterService.status.set({ seriesId: 'series-1', chapterId: 'chapter-1', isRead: true });
      expect(mockSetChapterRead).toHaveBeenCalledWith('series-1', 'chapter-1', true);
    });
  });

  describe('read', () => {
    it('calls ServerBridge.setChapterRead with isRead=true', async () => {
      mockSetChapterRead.mockResolvedValue(undefined);
      await ChapterService.read({ seriesId: 'series-1', chapterId: 'chapter-1' });
      expect(mockSetChapterRead).toHaveBeenCalledWith('series-1', 'chapter-1', true);
    });
  });

  describe('unread', () => {
    it('calls ServerBridge.setChapterRead with isRead=false', async () => {
      mockSetChapterRead.mockResolvedValue(undefined);
      await ChapterService.unread({ seriesId: 'series-1', chapterId: 'chapter-1' });
      expect(mockSetChapterRead).toHaveBeenCalledWith('series-1', 'chapter-1', false);
    });
  });

  describe('bound', () => {
    it('pre-fills seriesId/chapterId on get/getFull', async () => {
      mockGetChapterDigest.mockResolvedValue({ isSuccess: true });
      const chapter = ChapterService.bound({ seriesId: 'series-1', chapterId: 'chapter-1' });
      await chapter.get();
      await chapter.getFull();
      expect(mockGetChapterDigest).toHaveBeenNthCalledWith(1, 'series-1', 'chapter-1', false);
      expect(mockGetChapterDigest).toHaveBeenNthCalledWith(2, 'series-1', 'chapter-1', true);
    });

    it('pre-fills seriesId/chapterId on raw.get, progress.get/set and status.set', async () => {
      mockGetChapter.mockResolvedValue({});
      mockGetChapterProgress.mockResolvedValue(null);
      mockSetChapterProgress.mockResolvedValue(undefined);
      mockSetChapterRead.mockResolvedValue(undefined);
      const chapter = ChapterService.bound({ seriesId: 'series-1', chapterId: 'chapter-1' });
      await chapter.raw.get();
      await chapter.progress.get();
      await chapter.progress.set({ pageIndex: 3 });
      await chapter.status.set({ isRead: true });
      await chapter.read();
      await chapter.unread();
      expect(mockGetChapter).toHaveBeenCalledWith('series-1', 'chapter-1');
      expect(mockGetChapterProgress).toHaveBeenCalledWith('series-1', 'chapter-1');
      expect(mockSetChapterProgress).toHaveBeenCalledWith('series-1', 'chapter-1', 3);
      expect(mockSetChapterRead).toHaveBeenNthCalledWith(1, 'series-1', 'chapter-1', true);
      expect(mockSetChapterRead).toHaveBeenNthCalledWith(2, 'series-1', 'chapter-1', true);
      expect(mockSetChapterRead).toHaveBeenNthCalledWith(3, 'series-1', 'chapter-1', false);
    });

    it('lets a caller override a fixed field for one call', async () => {
      mockGetChapterDigest.mockResolvedValue({ isSuccess: true });
      const chapter = ChapterService.bound({ seriesId: 'series-1', chapterId: 'chapter-1' });
      await chapter.get({ chapterId: 'chapter-2' });
      expect(mockGetChapterDigest).toHaveBeenCalledWith('series-1', 'chapter-2', false);
    });

    it('does not expose a nested bound of its own', () => {
      const chapter = ChapterService.bound({ seriesId: 'series-1', chapterId: 'chapter-1' });
      expect('bound' in chapter).toBe(false);
    });
  });
});
