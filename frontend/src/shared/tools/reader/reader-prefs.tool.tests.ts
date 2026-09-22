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

  describe('getProgressColorOverride / setProgressColorOverride', () => {
    it('returns undefined when nothing is stored', async () => {
      mockGet.mockResolvedValue(null);
      expect(await ReaderPrefs.getProgressColorOverride()).toBeUndefined();
      expect(mockGet).toHaveBeenCalledWith({ key: 'reader', variant: 'progressColorOverride' });
    });

    it('returns the stored theme name', async () => {
      mockGet.mockResolvedValue({ value: 'crimson' });
      expect(await ReaderPrefs.getProgressColorOverride()).toBe('crimson');
    });

    it('treats an empty stored string as undefined (the clear-override sentinel)', async () => {
      mockGet.mockResolvedValue({ value: '' });
      expect(await ReaderPrefs.getProgressColorOverride()).toBeUndefined();
    });

    it('falls back to undefined when the read rejects', async () => {
      mockGet.mockRejectedValue(new Error('boom'));
      expect(await ReaderPrefs.getProgressColorOverride()).toBeUndefined();
    });

    it('setProgressColorOverride writes the theme name under its own variant', async () => {
      await ReaderPrefs.setProgressColorOverride('crimson');
      expect(mockPut).toHaveBeenCalledWith({
        key: 'reader',
        value: 'crimson',
        domain: 'readerPrefs',
        variant: 'progressColorOverride',
      });
    });

    it('setProgressColorOverride(undefined) writes an empty string to clear it', async () => {
      await ReaderPrefs.setProgressColorOverride(undefined);
      expect(mockPut).toHaveBeenCalledWith({
        key: 'reader',
        value: '',
        domain: 'readerPrefs',
        variant: 'progressColorOverride',
      });
    });
  });

  describe('getProgressBarPosition / setProgressBarPosition', () => {
    it('returns undefined when nothing is stored', async () => {
      mockGet.mockResolvedValue(null);
      expect(await ReaderPrefs.getProgressBarPosition()).toBeUndefined();
      expect(mockGet).toHaveBeenCalledWith({ key: 'reader', variant: 'progressBarPosition' });
    });

    it('returns the stored edge', async () => {
      mockGet.mockResolvedValue({ value: 'top' });
      expect(await ReaderPrefs.getProgressBarPosition()).toBe('top');
    });

    it('setProgressBarPosition writes the edge under its own variant', async () => {
      await ReaderPrefs.setProgressBarPosition('bottom');
      expect(mockPut).toHaveBeenCalledWith({
        key: 'reader',
        value: 'bottom',
        domain: 'readerPrefs',
        variant: 'progressBarPosition',
      });
    });

    it('setProgressBarPosition(undefined) writes an empty string to clear it', async () => {
      await ReaderPrefs.setProgressBarPosition(undefined);
      expect(mockPut).toHaveBeenCalledWith({
        key: 'reader',
        value: '',
        domain: 'readerPrefs',
        variant: 'progressBarPosition',
      });
    });
  });
});
