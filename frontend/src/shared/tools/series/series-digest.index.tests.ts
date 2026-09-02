jest.mock('../../managers/store', () => {
  const set = jest.fn().mockResolvedValue(undefined);
  const get = jest.fn().mockResolvedValue(null);
  return {
    Store: { for: jest.fn(() => ({ get, set })) },
    __mock: { get, set },
  };
});

import { EventBus } from '../../managers/events';
import { SerieEvents, serieDigestResolvedPayload } from './serie.events';
import { registerSeriesDigestIndexListener, SeriesDigestIndex } from './series-digest.index';
import type { SerialDigestSuccess, ServerActiveInfo } from '../../bridge/digest';

const storeMock = require('../../managers/store').__mock as { get: jest.Mock; set: jest.Mock };

const server: ServerActiveInfo = {
  groupId: 'g1', groupName: 'g', providerId: 'kavita', urlId: 'u1',
  url: 'https://x.invalid', timeoutMs: 5000, priority: 0,
};

function digest(overrides: Partial<SerialDigestSuccess> = {}): SerialDigestSuccess {
  return {
    isSuccess: true,
    id: 's1',
    name: 'S',
    coverImage: { url: '', hasFetchedDimensions: false, resolvedAtEpochMs: 0, server, cache: null },
    resolvedAtEpochMs: 1,
    server,
    cache: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('serieDigestResolvedPayload', () => {
  it('projects only the Library-relevant fields', () => {
    const d = digest({
      chapters: { total: 10, readCount: 4, list: [] },
      metadata: { genres: [], tags: [], publicationStatus: 'ONGOING' } as SerialDigestSuccess['metadata'],
    });
    expect(serieDigestResolvedPayload(d)).toEqual({
      seriesId: 's1',
      readChapters: 4,
      totalChapters: 10,
      publicationStatus: 'ONGOING',
    });
  });

  it('leaves counts/status undefined when the digest carries no chapters/metadata', () => {
    expect(serieDigestResolvedPayload(digest())).toEqual({
      seriesId: 's1',
      readChapters: undefined,
      totalChapters: undefined,
      publicationStatus: undefined,
    });
  });
});

describe('SeriesDigestIndex listener', () => {
  it('writes the payload to the store on SerieEvents.digestResolved', () => {
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

  it('SeriesDigestIndex.get delegates to the store', async () => {
    storeMock.get.mockResolvedValueOnce({ readChapters: 1, totalChapters: 3, updatedAtEpochMs: 5 });
    const entry = await SeriesDigestIndex.get('s1');
    expect(storeMock.get).toHaveBeenCalledWith('s1');
    expect(entry).toEqual({ readChapters: 1, totalChapters: 3, updatedAtEpochMs: 5 });
  });

  it('registerSeriesDigestIndexListener is idempotent — a second call does not add a handler', () => {
    // Already registered once at module import. Call again, then emit once: still exactly one write.
    registerSeriesDigestIndexListener();
    registerSeriesDigestIndexListener();
    EventBus.emit(SerieEvents.digestResolved, { seriesId: 'sX', readChapters: 1, totalChapters: 2 });
    expect(storeMock.set).toHaveBeenCalledTimes(1);
  });
});
