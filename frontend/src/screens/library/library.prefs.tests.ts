const mockGet = jest.fn();
const mockPut = jest.fn();
jest.mock('../../shared/managers/preferences', () => ({
  PreferencesManager: {
    get: (...a: unknown[]) => mockGet(...a),
    put: (...a: unknown[]) => mockPut(...a),
  },
}));

import { DEFAULT_SORT_MODE, DEFAULT_VIEW_MODE, LibraryPrefs } from './library.prefs';

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue(null);
  mockPut.mockResolvedValue(undefined);
});

describe('LibraryPrefs', () => {
  it('getViewMode returns the stored value', async () => {
    mockGet.mockResolvedValue({ value: 'LIST' });
    expect(await LibraryPrefs.getViewMode('library')).toBe('LIST');
    expect(mockGet).toHaveBeenCalledWith({ key: 'library', variant: 'viewMode' });
  });

  it('getViewMode falls back to the default when nothing is stored', async () => {
    mockGet.mockResolvedValue(null);
    expect(await LibraryPrefs.getViewMode('following')).toBe(DEFAULT_VIEW_MODE);
  });

  it('getViewMode falls back to the default when the read rejects', async () => {
    mockGet.mockRejectedValue(new Error('boom'));
    expect(await LibraryPrefs.getViewMode('library')).toBe(DEFAULT_VIEW_MODE);
  });

  it('getSortMode returns the stored value / falls back', async () => {
    mockGet.mockResolvedValue({ value: 'ALPHABETICAL' });
    expect(await LibraryPrefs.getSortMode('following')).toBe('ALPHABETICAL');
    mockGet.mockResolvedValue(null);
    expect(await LibraryPrefs.getSortMode('following')).toBe(DEFAULT_SORT_MODE);
  });

  it('setViewMode writes under the libraryLayout domain with the right variant/key', async () => {
    await LibraryPrefs.setViewMode('following', 'GRID');
    expect(mockPut).toHaveBeenCalledWith({
      key: 'following',
      value: 'GRID',
      domain: 'libraryLayout',
      variant: 'viewMode',
    });
  });

  it('setSortMode writes under the right variant', async () => {
    await LibraryPrefs.setSortMode('library', 'ALPHABETICAL');
    expect(mockPut).toHaveBeenCalledWith({
      key: 'library',
      value: 'ALPHABETICAL',
      domain: 'libraryLayout',
      variant: 'sortMode',
    });
  });

  it('setViewMode swallows a write rejection', async () => {
    mockPut.mockRejectedValue(new Error('boom'));
    await expect(LibraryPrefs.setViewMode('library', 'LIST')).resolves.toBeUndefined();
  });
});
