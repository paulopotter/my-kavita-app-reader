const mockGet = jest.fn();
const mockPut = jest.fn();
jest.mock('../../managers/preferences', () => ({
  PreferencesManager: {
    get: (...a: unknown[]) => mockGet(...a),
    put: (...a: unknown[]) => mockPut(...a),
  },
}));

import { AdultFilterPrefs } from './adult-filter-prefs.tool';

const stored = (map: Record<string, string>) =>
  mockGet.mockImplementation(({ variant }: { variant: string }) =>
    Promise.resolve(variant in map ? { value: map[variant] } : null),
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue(null);
  mockPut.mockResolvedValue(undefined);
});

describe('AdultFilterPrefs', () => {
  it('categories round-trip as a JSON list and default to empty', async () => {
    expect(await AdultFilterPrefs.getCategories()).toEqual([]);
    stored({ categories: '["Hentai","Gore"]' });
    expect(await AdultFilterPrefs.getCategories()).toEqual(['Hentai', 'Gore']);
    await AdultFilterPrefs.setCategories(['Hentai']);
    expect(mockPut).toHaveBeenCalledWith({
      key: 'adultFilter',
      value: '["Hentai"]',
      domain: 'adultFilterPrefs',
      variant: 'categories',
    });
  });

  it('ignores a corrupt or non-list stored value', async () => {
    stored({ categories: 'not json' });
    expect(await AdultFilterPrefs.getCategories()).toEqual([]);
    stored({ categories: '{"a":1}' });
    expect(await AdultFilterPrefs.getCategories()).toEqual([]);
    stored({ categories: '["ok",3]' });
    expect(await AdultFilterPrefs.getCategories()).toEqual(['ok']);
  });

  it('mode defaults to hidden, accepts a known value and rejects an unknown one', async () => {
    expect(await AdultFilterPrefs.getMode()).toBe('hidden');
    stored({ mode: 'blur' });
    expect(await AdultFilterPrefs.getMode()).toBe('blur');
    stored({ mode: 'weird' });
    expect(await AdultFilterPrefs.getMode()).toBe('hidden');
    await AdultFilterPrefs.setMode('blur');
    expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({ variant: 'mode', value: 'blur' }));
    stored({ mode: 'adultOnly' }); // a value saved by an earlier build falls back to the default
    expect(await AdultFilterPrefs.getMode()).toBe('hidden');
    stored({ mode: 'normal' });
    expect(await AdultFilterPrefs.getMode()).toBe('hidden');
  });

  it('unblur defaults to false', async () => {
    expect(await AdultFilterPrefs.getUnblur()).toBe(false);
    stored({ unblur: 'true' });
    expect(await AdultFilterPrefs.getUnblur()).toBe(true);
    await AdultFilterPrefs.setUnblur(true);
    expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({ variant: 'unblur', value: 'true' }));
  });

  it('the classification persists both id sets and reads them back as sets', async () => {
    await AdultFilterPrefs.setClassification({ adultIds: new Set(['1']), knownIds: new Set(['1', '2']) });
    expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({ variant: 'adultIds', value: '["1"]' }));
    expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({ variant: 'knownIds', value: '["1","2"]' }));
    stored({ adultIds: '["1"]', knownIds: '["1","2"]' });
    const c = await AdultFilterPrefs.getClassification();
    expect([...c.adultIds]).toEqual(['1']);
    expect([...c.knownIds]).toEqual(['1', '2']);
  });

  it('swallows read and write failures', async () => {
    mockGet.mockRejectedValue(new Error('boom'));
    mockPut.mockRejectedValue(new Error('boom'));
    expect(await AdultFilterPrefs.getCategories()).toEqual([]);
    await expect(AdultFilterPrefs.setMode('blur')).resolves.toBeUndefined();
  });
});
