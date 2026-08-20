import { SeriesBridge } from '../../../shared/bridge/series';
import { ReaderChapterBridge, ScreenControlBridge } from '../../../shared/bridge/chapter';
import {
  allowScreenOff,
  fetchKeepScreenOnPref,
  fetchLocalProgress,
  fetchServerReadProgress,
  fetchSeriesName,
  keepScreenOn,
  markChapterRead,
  markChapterUnread,
  saveLocalProgress,
  saveServerProgress,
} from '../ReaderService';

jest.mock('../../../shared/bridge/chapter', () => ({
  ReaderChapterBridge: {
    getServerReadProgress: jest.fn(),
    getLocalProgress: jest.fn(),
    saveLocalProgress: jest.fn(),
    saveReadingProgress: jest.fn(),
  },
  ScreenControlBridge: {
    keepScreenOn: jest.fn(),
    allowScreenOff: jest.fn(),
    getKeepScreenOnDuringReading: jest.fn(),
  },
}));

jest.mock('../../../shared/bridge/series', () => ({
  SeriesBridge: {
    markChaptersRead: jest.fn(),
    markChaptersUnread: jest.fn(),
    getSeriesDetail: jest.fn(),
  },
}));

describe('ReaderService', () => {
  afterEach(() => jest.clearAllMocks());

  it('fetchServerReadProgress delega para ReaderChapterBridge.getServerReadProgress', async () => {
    (ReaderChapterBridge.getServerReadProgress as jest.Mock).mockResolvedValue(5);

    const result = await fetchServerReadProgress('c1');

    expect(ReaderChapterBridge.getServerReadProgress).toHaveBeenCalledWith('c1');
    expect(result).toBe(5);
  });

  it('fetchLocalProgress delega para ReaderChapterBridge.getLocalProgress', async () => {
    const local = { page: 3, scrollFraction: 0.5 };
    (ReaderChapterBridge.getLocalProgress as jest.Mock).mockResolvedValue(local);

    const result = await fetchLocalProgress('c1');

    expect(ReaderChapterBridge.getLocalProgress).toHaveBeenCalledWith('c1');
    expect(result).toBe(local);
  });

  it('saveLocalProgress delega com todos os argumentos', async () => {
    await saveLocalProgress('c1', 's1', 4, 0.75);

    expect(ReaderChapterBridge.saveLocalProgress).toHaveBeenCalledWith('c1', 's1', 4, 0.75);
  });

  it('saveServerProgress delega para saveReadingProgress reaproveitado', async () => {
    await saveServerProgress('c1', 's1', 4);

    expect(ReaderChapterBridge.saveReadingProgress).toHaveBeenCalledWith('c1', 's1', 4);
  });

  it('fetchKeepScreenOnPref delega para ScreenControlBridge.getKeepScreenOnDuringReading', async () => {
    (ScreenControlBridge.getKeepScreenOnDuringReading as jest.Mock).mockResolvedValue(true);

    const result = await fetchKeepScreenOnPref();

    expect(result).toBe(true);
  });

  it('keepScreenOn delega para ScreenControlBridge.keepScreenOn', async () => {
    await keepScreenOn();

    expect(ScreenControlBridge.keepScreenOn).toHaveBeenCalledTimes(1);
  });

  it('allowScreenOff delega para ScreenControlBridge.allowScreenOff', async () => {
    await allowScreenOff();

    expect(ScreenControlBridge.allowScreenOff).toHaveBeenCalledTimes(1);
  });

  it('markChapterRead delega para SeriesBridge.markChaptersRead com array de um item', async () => {
    await markChapterRead('s1', 'c1');

    expect(SeriesBridge.markChaptersRead).toHaveBeenCalledWith('s1', ['c1']);
  });

  it('markChapterUnread delega para SeriesBridge.markChaptersUnread com array de um item', async () => {
    await markChapterUnread('s1', 'c1');

    expect(SeriesBridge.markChaptersUnread).toHaveBeenCalledWith('s1', ['c1']);
  });

  it('fetchSeriesName retorna o name resolvido por SeriesBridge.getSeriesDetail', async () => {
    (SeriesBridge.getSeriesDetail as jest.Mock).mockResolvedValue({
      id: 's1',
      name: 'One Piece',
      coverImageUrl: 'http://example.com/cover.jpg',
    });

    const result = await fetchSeriesName('s1');

    expect(SeriesBridge.getSeriesDetail).toHaveBeenCalledWith('s1');
    expect(result).toBe('One Piece');
  });
});
