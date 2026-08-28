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

jest.mock('../../bridge/external', () => ({
  ExternalMetadataBridge: {
    matchSync: jest.fn(),
    matchSyncByGroup: jest.fn(),
    matchSyncByServerId: jest.fn(),
    matchSyncByServerUrl: jest.fn(),
    matchesSync: jest.fn(),
    matchesSyncByGroup: jest.fn(),
    matchesSyncByServerId: jest.fn(),
    matchesSyncByServerUrl: jest.fn(),
  },
}));

import { DigestBridge } from '../../bridge/digest';
import { ExternalMetadataBridge } from '../../bridge/external';
import { ServerBridge } from '../../bridge/server';

const mockGetSeriesDigest = DigestBridge.getSeriesDigest as jest.Mock;
const mockListSerials = ServerBridge.listSerials as jest.Mock;
const mockSetChaptersRead = ServerBridge.setChaptersRead as jest.Mock;
const mockGetSerial = ServerBridge.getSerial as jest.Mock;
const mockListChapters = ServerBridge.listChapters as jest.Mock;
const mockMatchSync = ExternalMetadataBridge.matchSync as jest.Mock;
const mockMatchSyncByGroup = ExternalMetadataBridge.matchSyncByGroup as jest.Mock;
const mockMatchSyncByServerId = ExternalMetadataBridge.matchSyncByServerId as jest.Mock;
const mockMatchSyncByServerUrl = ExternalMetadataBridge.matchSyncByServerUrl as jest.Mock;
const mockMatchesSync = ExternalMetadataBridge.matchesSync as jest.Mock;
const mockMatchesSyncByGroup = ExternalMetadataBridge.matchesSyncByGroup as jest.Mock;
const mockMatchesSyncByServerId = ExternalMetadataBridge.matchesSyncByServerId as jest.Mock;
const mockMatchesSyncByServerUrl = ExternalMetadataBridge.matchesSyncByServerUrl as jest.Mock;

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

describe('SerialsService.externalDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sync calls ExternalMetadataBridge.matchesSync with positional id/name arrays', async () => {
    const matches = [{ seriesId: 's1', status: 'ongoing', hasErrors: false }, null];
    mockMatchesSync.mockResolvedValue(matches);
    const result = await SerialsService.externalDetails.sync({
      series: [
        { seriesId: 's1', seriesName: 'Series 1' },
        { seriesId: 's2', seriesName: 'Series 2' },
      ],
    });
    expect(mockMatchesSync).toHaveBeenCalledWith(['s1', 's2'], ['Series 1', 'Series 2']);
    expect(result).toBe(matches);
  });
});

describe('SerialsService.raw.externalDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('syncByGroup calls ExternalMetadataBridge.matchesSyncByGroup', async () => {
    mockMatchesSyncByGroup.mockResolvedValue([]);
    await SerialsService.raw.externalDetails.syncByGroup({
      groupId: 'group-1',
      series: [{ seriesId: 's1', seriesName: 'Series 1' }],
    });
    expect(mockMatchesSyncByGroup).toHaveBeenCalledWith('group-1', ['s1'], ['Series 1']);
  });

  it('syncByServerId calls ExternalMetadataBridge.matchesSyncByServerId', async () => {
    mockMatchesSyncByServerId.mockResolvedValue([]);
    await SerialsService.raw.externalDetails.syncByServerId({
      kavitaServerGroupId: 'kavita-1',
      series: [{ seriesId: 's1', seriesName: 'Series 1' }],
    });
    expect(mockMatchesSyncByServerId).toHaveBeenCalledWith('kavita-1', ['s1'], ['Series 1']);
  });

  it('syncByServerUrl calls ExternalMetadataBridge.matchesSyncByServerUrl', async () => {
    mockMatchesSyncByServerUrl.mockResolvedValue([]);
    await SerialsService.raw.externalDetails.syncByServerUrl({
      kavitaUrl: 'http://kavita.local',
      series: [{ seriesId: 's1', seriesName: 'Series 1' }],
    });
    expect(mockMatchesSyncByServerUrl).toHaveBeenCalledWith('http://kavita.local', ['s1'], ['Series 1']);
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
      expect(mockGetSeriesDigest).toHaveBeenCalledWith('series-1', { full: false, force: undefined });
    });

    it('forwards force to DigestBridge.getSeriesDigest', async () => {
      mockGetSeriesDigest.mockResolvedValue({ isSuccess: true });
      await SerialService.get({ seriesId: 'series-1', force: true });
      expect(mockGetSeriesDigest).toHaveBeenCalledWith('series-1', { full: false, force: true });
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
      expect(mockGetSeriesDigest).toHaveBeenCalledWith('series-1', { full: true, force: undefined });
    });

    it('forwards force to DigestBridge.getSeriesDigest', async () => {
      mockGetSeriesDigest.mockResolvedValue({ isSuccess: true });
      await SerialService.getFull({ seriesId: 'series-1', force: true });
      expect(mockGetSeriesDigest).toHaveBeenCalledWith('series-1', { full: true, force: true });
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

  describe('raw.externalDetail', () => {
    it('syncByGroup calls ExternalMetadataBridge.matchSyncByGroup', async () => {
      const match = { seriesId: 'series-1', status: 'ongoing', hasErrors: false };
      mockMatchSyncByGroup.mockResolvedValue(match);
      const result = await SerialService.raw.externalDetail.syncByGroup({
        groupId: 'group-1',
        seriesId: 'series-1',
        seriesName: 'Some Series',
      });
      expect(mockMatchSyncByGroup).toHaveBeenCalledWith('group-1', 'series-1', 'Some Series');
      expect(result).toBe(match);
    });

    it('syncByServerId calls ExternalMetadataBridge.matchSyncByServerId', async () => {
      mockMatchSyncByServerId.mockResolvedValue(null);
      const result = await SerialService.raw.externalDetail.syncByServerId({
        kavitaServerGroupId: 'kavita-1',
        seriesId: 'series-1',
        seriesName: 'Some Series',
      });
      expect(mockMatchSyncByServerId).toHaveBeenCalledWith('kavita-1', 'series-1', 'Some Series');
      expect(result).toBeNull();
    });

    it('syncByServerUrl calls ExternalMetadataBridge.matchSyncByServerUrl', async () => {
      mockMatchSyncByServerUrl.mockResolvedValue(null);
      await SerialService.raw.externalDetail.syncByServerUrl({
        kavitaUrl: 'http://kavita.local',
        seriesId: 'series-1',
        seriesName: 'Some Series',
      });
      expect(mockMatchSyncByServerUrl).toHaveBeenCalledWith('http://kavita.local', 'series-1', 'Some Series');
    });
  });

  describe('externalDetail.sync', () => {
    it('calls ExternalMetadataBridge.matchSync with no hint', async () => {
      const match = { seriesId: 'series-1', status: 'ongoing', hasErrors: false };
      mockMatchSync.mockResolvedValue(match);
      const result = await SerialService.externalDetail.sync({ seriesId: 'series-1', seriesName: 'Some Series' });
      expect(mockMatchSync).toHaveBeenCalledWith('series-1', 'Some Series');
      expect(result).toBe(match);
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
      expect(mockGetSeriesDigest).toHaveBeenNthCalledWith(1, 'series-1', { full: false, force: undefined });
      expect(mockGetSeriesDigest).toHaveBeenNthCalledWith(2, 'series-1', { full: true, force: undefined });
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

    it('pre-fills seriesId on nested externalDetail.sync', async () => {
      mockMatchSync.mockResolvedValue(null);
      const serial = SerialService.bound({ seriesId: 'series-1' });
      await serial.externalDetail.sync({ seriesName: 'Some Series' });
      expect(mockMatchSync).toHaveBeenCalledWith('series-1', 'Some Series');
    });

    it('lets a caller override a fixed field for one call', async () => {
      mockGetSeriesDigest.mockResolvedValue({ isSuccess: true });
      const serial = SerialService.bound({ seriesId: 'series-1' });
      await serial.get({ seriesId: 'series-2' });
      expect(mockGetSeriesDigest).toHaveBeenCalledWith('series-2', { full: false, force: undefined });
    });

    it('does not expose a nested bound of its own', () => {
      const serial = SerialService.bound({ seriesId: 'series-1' });
      expect('bound' in serial).toBe(false);
    });
  });
});
