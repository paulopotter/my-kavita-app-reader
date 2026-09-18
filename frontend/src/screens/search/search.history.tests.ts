jest.mock('../../shared/managers/preferences', () => ({
  PreferencesManager: { get: jest.fn(), put: jest.fn() },
}));

import { SearchHistory, HISTORY_LIMIT } from './search.history';
import { PreferencesManager } from '../../shared/managers/preferences';
import type { SearchHistoryItem } from './search.types';

const mockGet = PreferencesManager.get as jest.Mock;
const mockPut = PreferencesManager.put as jest.Mock;

function item(over: Partial<SearchHistoryItem> = {}): SearchHistoryItem {
  return { seriesId: 's1', name: 'One Piece', coverUrl: 'c1', openedAtEpochMs: 1_000, ...over };
}

// What the bridge would have stored for a given list.
function stored(items: SearchHistoryItem[]) {
  return { key: 'items', value: JSON.stringify(items), domain: 'searchHistory', variant: '' };
}

// The list as it was written by the last put() call.
function written(): SearchHistoryItem[] {
  return JSON.parse(mockPut.mock.calls[mockPut.mock.calls.length - 1][0].value);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPut.mockResolvedValue(undefined);
});

describe('SearchHistory.list', () => {
  it('parses the stored list', async () => {
    mockGet.mockResolvedValue(stored([item({ seriesId: 'a' }), item({ seriesId: 'b' })]));
    expect((await SearchHistory.list()).map(i => i.seriesId)).toEqual(['a', 'b']);
  });

  it('empty when nothing was ever stored', async () => {
    mockGet.mockResolvedValue(null);
    expect(await SearchHistory.list()).toEqual([]);
  });

  it('empty when the read fails — never an error the screen has to render', async () => {
    mockGet.mockRejectedValue(new Error('bridge down'));
    expect(await SearchHistory.list()).toEqual([]);
  });

  it('empty on malformed JSON instead of throwing', async () => {
    mockGet.mockResolvedValue({ key: 'items', value: '{not json', domain: 'searchHistory', variant: '' });
    expect(await SearchHistory.list()).toEqual([]);
  });

  it('empty when the stored JSON is not an array', async () => {
    mockGet.mockResolvedValue({ key: 'items', value: '{"a":1}', domain: 'searchHistory', variant: '' });
    expect(await SearchHistory.list()).toEqual([]);
  });

  it('drops entries that are not history rows', async () => {
    mockGet.mockResolvedValue({
      key: 'items',
      value: JSON.stringify([item({ seriesId: 'good' }), { nope: true }, null, 'string']),
      domain: 'searchHistory',
      variant: '',
    });
    expect((await SearchHistory.list()).map(i => i.seriesId)).toEqual(['good']);
  });
});

describe('SearchHistory.put', () => {
  it('prepends the newest item', async () => {
    mockGet.mockResolvedValue(stored([item({ seriesId: 'old' })]));
    await SearchHistory.put({ item: item({ seriesId: 'new' }) });
    expect(written().map(i => i.seriesId)).toEqual(['new', 'old']);
  });

  it('MOVES an already-present id to the top instead of duplicating it', async () => {
    mockGet.mockResolvedValue(stored([item({ seriesId: 'a' }), item({ seriesId: 'b' }), item({ seriesId: 'c' })]));
    await SearchHistory.put({ item: item({ seriesId: 'c', openedAtEpochMs: 9_999 }) });
    const out = written();
    expect(out.map(i => i.seriesId)).toEqual(['c', 'a', 'b']);
    expect(out).toHaveLength(3);
    expect(out[0].openedAtEpochMs).toBe(9_999);
  });

  it(`caps the list at ${HISTORY_LIMIT}, dropping the oldest`, async () => {
    const full = Array.from({ length: HISTORY_LIMIT }, (_, i) => item({ seriesId: `s${i}` }));
    mockGet.mockResolvedValue(stored(full));
    await SearchHistory.put({ item: item({ seriesId: 'newest' }) });
    const out = written();
    expect(out).toHaveLength(HISTORY_LIMIT);
    expect(out[0].seriesId).toBe('newest');
    // s9 was the oldest of the ten and is the one that fell off.
    expect(out.map(i => i.seriesId)).not.toContain(`s${HISTORY_LIMIT - 1}`);
  });

  it('writes to the searchHistory preference domain', async () => {
    mockGet.mockResolvedValue(null);
    await SearchHistory.put({ item: item() });
    expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({ key: 'items', domain: 'searchHistory' }));
  });
});

describe('SearchHistory.delete', () => {
  it('removes just that id', async () => {
    mockGet.mockResolvedValue(stored([item({ seriesId: 'a' }), item({ seriesId: 'b' })]));
    await SearchHistory.delete({ seriesId: 'a' });
    expect(written().map(i => i.seriesId)).toEqual(['b']);
  });

  it('an unknown id leaves the list as it was', async () => {
    mockGet.mockResolvedValue(stored([item({ seriesId: 'a' })]));
    await SearchHistory.delete({ seriesId: 'nope' });
    expect(written().map(i => i.seriesId)).toEqual(['a']);
  });
});

describe('SearchHistory.clear', () => {
  it('writes an empty list', async () => {
    await SearchHistory.clear();
    expect(written()).toEqual([]);
  });
});
