const mockGet = jest.fn();
const mockPut = jest.fn();
jest.mock('../../managers/preferences', () => ({
  PreferencesManager: {
    get: (...a: unknown[]) => mockGet(...a),
    put: (...a: unknown[]) => mockPut(...a),
  },
}));

import { DEFAULT_IMMERSIVE_MODE, DEFAULT_KEEP_SCREEN_ON, ReaderPrefs } from './reader-prefs.tool';

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue(null);
  mockPut.mockResolvedValue(undefined);
});

describe('ReaderPrefs', () => {
  it('getKeepScreenOn parses the stored "true"/"false" string', async () => {
    mockGet.mockResolvedValue({ value: 'false' });
    expect(await ReaderPrefs.getKeepScreenOn()).toBe(false);
    expect(mockGet).toHaveBeenCalledWith({ key: 'reader', variant: 'keepScreenOn' });
  });

  it('getKeepScreenOn falls back to the default when nothing is stored', async () => {
    mockGet.mockResolvedValue(null);
    expect(await ReaderPrefs.getKeepScreenOn()).toBe(DEFAULT_KEEP_SCREEN_ON);
  });

  it('getImmersiveMode falls back to the default when the read rejects', async () => {
    mockGet.mockRejectedValue(new Error('boom'));
    expect(await ReaderPrefs.getImmersiveMode()).toBe(DEFAULT_IMMERSIVE_MODE);
  });

  it('getImmersiveMode returns the stored value', async () => {
    mockGet.mockResolvedValue({ value: 'true' });
    expect(await ReaderPrefs.getImmersiveMode()).toBe(true);
    expect(mockGet).toHaveBeenCalledWith({ key: 'reader', variant: 'immersiveMode' });
  });

  it('setKeepScreenOn writes the boolean as a string under the readerPrefs domain', async () => {
    await ReaderPrefs.setKeepScreenOn(true);
    expect(mockPut).toHaveBeenCalledWith({
      key: 'reader',
      value: 'true',
      domain: 'readerPrefs',
      variant: 'keepScreenOn',
    });
  });

  it('setImmersiveMode writes under the immersiveMode variant', async () => {
    await ReaderPrefs.setImmersiveMode(false);
    expect(mockPut).toHaveBeenCalledWith({
      key: 'reader',
      value: 'false',
      domain: 'readerPrefs',
      variant: 'immersiveMode',
    });
  });

  it('setKeepScreenOn swallows a write rejection', async () => {
    mockPut.mockRejectedValue(new Error('boom'));
    await expect(ReaderPrefs.setKeepScreenOn(true)).resolves.toBeUndefined();
  });
});
