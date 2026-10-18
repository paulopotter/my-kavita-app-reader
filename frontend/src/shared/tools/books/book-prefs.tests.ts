import { BOOK_FONT_SCALES, BookPrefs, DEFAULT_BOOK_FONT_SCALE } from './book-prefs.tool';

jest.mock('../../managers/preferences', () => ({
  PreferencesManager: {
    get: jest.fn(),
    put: jest.fn(),
  },
}));

import { PreferencesManager } from '../../managers/preferences';

const mockGet = PreferencesManager.get as jest.Mock;
const mockPut = PreferencesManager.put as jest.Mock;

describe('BookPrefs.fontScale', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads the stored size', async () => {
    mockGet.mockResolvedValue({ value: '1.3' });
    await expect(BookPrefs.fontScale.get()).resolves.toBe(1.3);
    expect(mockGet).toHaveBeenCalledWith({ key: 'bookReader', variant: 'fontScale' });
  });

  it('falls back to the default when nothing is stored, the value is junk, or the read fails', async () => {
    mockGet.mockResolvedValueOnce(null);
    await expect(BookPrefs.fontScale.get()).resolves.toBe(DEFAULT_BOOK_FONT_SCALE);
    mockGet.mockResolvedValueOnce({ value: 'abc' });
    await expect(BookPrefs.fontScale.get()).resolves.toBe(DEFAULT_BOOK_FONT_SCALE);
    mockGet.mockResolvedValueOnce({ value: '-2' });
    await expect(BookPrefs.fontScale.get()).resolves.toBe(DEFAULT_BOOK_FONT_SCALE);
    mockGet.mockRejectedValueOnce(new Error('db'));
    await expect(BookPrefs.fontScale.get()).resolves.toBe(DEFAULT_BOOK_FONT_SCALE);
  });

  it('writes under its own key, domain and variant, and swallows a failed write', async () => {
    mockPut.mockResolvedValueOnce(undefined);
    await BookPrefs.fontScale.set(1.15);
    expect(mockPut).toHaveBeenCalledWith({ key: 'bookReader', value: '1.15', domain: 'bookReaderPrefs', variant: 'fontScale' });

    mockPut.mockRejectedValueOnce(new Error('db'));
    await expect(BookPrefs.fontScale.set(1)).resolves.toBeUndefined();
  });

  it('steps through the sizes and stops at both ends', () => {
    expect(BookPrefs.fontScale.step(1, 'larger')).toBe(1.15);
    expect(BookPrefs.fontScale.step(1, 'smaller')).toBe(0.85);
    expect(BookPrefs.fontScale.step(BOOK_FONT_SCALES[0], 'smaller')).toBe(BOOK_FONT_SCALES[0]);
    expect(BookPrefs.fontScale.step(BOOK_FONT_SCALES[BOOK_FONT_SCALES.length - 1], 'larger')).toBe(
      BOOK_FONT_SCALES[BOOK_FONT_SCALES.length - 1],
    );
  });

  it('snaps a value that is not a step to the nearest one before stepping', () => {
    expect(BookPrefs.fontScale.step(1.1, 'larger')).toBe(1.3);
    expect(BookPrefs.fontScale.step(9, 'smaller')).toBe(1.5);
  });
});
