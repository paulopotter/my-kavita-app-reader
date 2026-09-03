jest.mock('./store.manager', () => {
  const set = jest.fn().mockResolvedValue(undefined);
  const get = jest.fn().mockResolvedValue(null);
  return {
    Store: { for: jest.fn(() => ({ get, set })) },
    __mock: { get, set },
  };
});

import { EventBus } from '../events';
import { SerieEvents } from '../../tools/series/serie.events';
import { registerSeriesDigestIndexListener, SeriesDigestIndex } from './series-digest.store';

const storeMock = require('./store.manager').__mock as { get: jest.Mock; set: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SeriesDigestIndex', () => {
  it('get delegates to the bound store domain', async () => {
    storeMock.get.mockResolvedValueOnce({ readChapters: 1, totalChapters: 3, updatedAtEpochMs: 5 });
    const entry = await SeriesDigestIndex.get('s1');
    expect(storeMock.get).toHaveBeenCalledWith('s1');
    expect(entry).toEqual({ readChapters: 1, totalChapters: 3, updatedAtEpochMs: 5 });
  });

  it('set delegates to the bound store domain', async () => {
    await SeriesDigestIndex.set('s2', { readChapters: 4, totalChapters: 10, publicationStatus: 'ONGOING' });
    expect(storeMock.set).toHaveBeenCalledWith('s2', {
      readChapters: 4,
      totalChapters: 10,
      publicationStatus: 'ONGOING',
    });
  });
});

describe('registerSeriesDigestIndexListener', () => {
  it('is NOT an import side effect — nothing is subscribed until it is called', () => {
    EventBus.emit(SerieEvents.digestResolved, { seriesId: 's0', readChapters: 1, totalChapters: 2 });
    expect(storeMock.set).not.toHaveBeenCalled();
  });

  it('after calling it, a resolved digest is written to the store', () => {
    registerSeriesDigestIndexListener();
    EventBus.emit(SerieEvents.digestResolved, {
      seriesId: 's9',
      readChapters: 2,
      totalChapters: 7,
      publicationStatus: 'COMPLETED',
    });
    expect(storeMock.set).toHaveBeenCalledWith('s9', {
      readChapters: 2,
      totalChapters: 7,
      publicationStatus: 'COMPLETED',
    });
  });

  it('is idempotent — a second call does not add a second handler', () => {
    registerSeriesDigestIndexListener();
    registerSeriesDigestIndexListener();
    EventBus.emit(SerieEvents.digestResolved, { seriesId: 'sX', readChapters: 1, totalChapters: 2 });
    expect(storeMock.set).toHaveBeenCalledTimes(1);
  });
});
