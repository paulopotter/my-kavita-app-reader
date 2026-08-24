import { SerialService, SerialsService } from './serials.services';

jest.mock('../../bridge/digest', () => ({
  DigestBridge: {
    getSeriesDigest: jest.fn(),
  },
}));

jest.mock('../../bridge/server', () => ({
  ServerBridge: {
    listSerials: jest.fn(),
    setChaptersRead: jest.fn(),
    getSerial: jest.fn(),
    listChapters: jest.fn(),
  },
}));

import { DigestBridge } from '../../bridge/digest';
import { ServerBridge } from '../../bridge/server';

const mockGetSeriesDigest = DigestBridge.getSeriesDigest as jest.Mock;
const mockListSerials = ServerBridge.listSerials as jest.Mock;
const mockSetChaptersRead = ServerBridge.setChaptersRead as jest.Mock;
const mockGetSerial = ServerBridge.getSerial as jest.Mock;
const mockListChapters = ServerBridge.listChapters as jest.Mock;

describe('SerialsService.list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the raw PluginSerial[] exactly as ServerBridge resolved it', async () => {
    const serials = [{ id: 'series-1', name: 'Some Series', pagesRead: 0, totalPages: 10, genres: [], tags: [] }];
    mockListSerials.mockResolvedValue(serials);
    const result = await SerialsService.list();
    expect(mockListSerials).toHaveBeenCalledWith();
    expect(result).toBe(serials);
  });
});

describe('SerialService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('calls DigestBridge.getSeriesDigest with full=false', async () => {
      mockGetSeriesDigest.mockResolvedValue({ isSuccess: true });
      await SerialService.get({ seriesId: 'series-1' });
      expect(mockGetSeriesDigest).toHaveBeenCalledWith('series-1', false);
    });

    it('returns the SeriesDigest exactly as the bridge resolved it', async () => {
      const digest = { isSuccess: true, id: 'series-1', name: 'Some Series' };
      mockGetSeriesDigest.mockResolvedValue(digest);
      const result = await SerialService.get({ seriesId: 'series-1' });
      expect(result).toBe(digest);
    });
  });

  describe('getFull', () => {
    it('calls DigestBridge.getSeriesDigest with full=true', async () => {
      mockGetSeriesDigest.mockResolvedValue({ isSuccess: true });
      await SerialService.getFull({ seriesId: 'series-1' });
      expect(mockGetSeriesDigest).toHaveBeenCalledWith('series-1', true);
    });

    it('returns the SeriesDigest exactly as the bridge resolved it (failure)', async () => {
      const digest = { isSuccess: false, error: { message: 'not found' } };
      mockGetSeriesDigest.mockResolvedValue(digest);
      const result = await SerialService.getFull({ seriesId: 'series-1' });
      expect(result).toBe(digest);
    });
  });

  describe('raw.get', () => {
    it('calls ServerBridge.getSerial and returns the raw PluginSerial', async () => {
      const serial = { id: 'series-1', name: 'Some Series', pagesRead: 0, totalPages: 10, genres: [], tags: [] };
      mockGetSerial.mockResolvedValue(serial);
      const result = await SerialService.raw.get({ seriesId: 'series-1' });
      expect(mockGetSerial).toHaveBeenCalledWith('series-1');
      expect(result).toBe(serial);
    });
  });

  describe('raw.chapters.list', () => {
    it('calls ServerBridge.listChapters and returns the raw PluginChapter[]', async () => {
      const chapters = [{ id: 'ch-1', title: 'Ch. 1', pageCount: 20, pagesRead: 5, isSpecial: false }];
      mockListChapters.mockResolvedValue(chapters);
      const result = await SerialService.raw.chapters.list({ seriesId: 'series-1' });
      expect(mockListChapters).toHaveBeenCalledWith('series-1');
      expect(result).toBe(chapters);
    });
  });

  describe('chapters.status.set', () => {
    it('calls ServerBridge.setChaptersRead with the given isRead', async () => {
      mockSetChaptersRead.mockResolvedValue(undefined);
      await SerialService.chapters.status.set({ seriesId: 'series-1', chapterIds: ['ch-1', 'ch-2'], isRead: true });
      expect(mockSetChaptersRead).toHaveBeenCalledWith('series-1', true, ['ch-1', 'ch-2']);
    });
  });

  describe('chapters.read', () => {
    it('calls ServerBridge.setChaptersRead with isRead=true', async () => {
      mockSetChaptersRead.mockResolvedValue(undefined);
      await SerialService.chapters.read({ seriesId: 'series-1', chapterIds: ['ch-1', 'ch-2'] });
      expect(mockSetChaptersRead).toHaveBeenCalledWith('series-1', true, ['ch-1', 'ch-2']);
    });
  });

  describe('chapters.unread', () => {
    it('calls ServerBridge.setChaptersRead with isRead=false', async () => {
      mockSetChaptersRead.mockResolvedValue(undefined);
      await SerialService.chapters.unread({ seriesId: 'series-1', chapterIds: ['ch-1', 'ch-2'] });
      expect(mockSetChaptersRead).toHaveBeenCalledWith('series-1', false, ['ch-1', 'ch-2']);
    });
  });

  describe('bound', () => {
    it('pre-fills seriesId on get/getFull', async () => {
      mockGetSeriesDigest.mockResolvedValue({ isSuccess: true });
      const serial = SerialService.bound({ seriesId: 'series-1' });
      await serial.get();
      await serial.getFull();
      expect(mockGetSeriesDigest).toHaveBeenNthCalledWith(1, 'series-1', false);
      expect(mockGetSeriesDigest).toHaveBeenNthCalledWith(2, 'series-1', true);
    });

    it('pre-fills seriesId on nested chapters.status.set/read/unread', async () => {
      mockSetChaptersRead.mockResolvedValue(undefined);
      const serial = SerialService.bound({ seriesId: 'series-1' });
      await serial.chapters.status.set({ chapterIds: ['ch-1'], isRead: true });
      await serial.chapters.read({ chapterIds: ['ch-2'] });
      await serial.chapters.unread({ chapterIds: ['ch-3'] });
      expect(mockSetChaptersRead).toHaveBeenNthCalledWith(1, 'series-1', true, ['ch-1']);
      expect(mockSetChaptersRead).toHaveBeenNthCalledWith(2, 'series-1', true, ['ch-2']);
      expect(mockSetChaptersRead).toHaveBeenNthCalledWith(3, 'series-1', false, ['ch-3']);
    });

    it('pre-fills seriesId on nested raw.get/raw.chapters.list', async () => {
      mockGetSerial.mockResolvedValue({});
      mockListChapters.mockResolvedValue([]);
      const serial = SerialService.bound({ seriesId: 'series-1' });
      await serial.raw.get();
      await serial.raw.chapters.list();
      expect(mockGetSerial).toHaveBeenCalledWith('series-1');
      expect(mockListChapters).toHaveBeenCalledWith('series-1');
    });

    it('lets a caller override a fixed field for one call', async () => {
      mockGetSeriesDigest.mockResolvedValue({ isSuccess: true });
      const serial = SerialService.bound({ seriesId: 'series-1' });
      await serial.get({ seriesId: 'series-2' });
      expect(mockGetSeriesDigest).toHaveBeenCalledWith('series-2', false);
    });

    it('does not expose a nested bound of its own', () => {
      const serial = SerialService.bound({ seriesId: 'series-1' });
      expect('bound' in serial).toBe(false);
    });
  });
});
