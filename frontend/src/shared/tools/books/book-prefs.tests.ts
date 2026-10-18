import { BOOK_FONT_SCALES, BookPrefs, DEFAULT_BOOK_APPEARANCE, DEFAULT_BOOK_FONT_SCALE } from './book-prefs.tool';

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

describe('BookPrefs.appearance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const store = (values: Record<string, string>) =>
    mockGet.mockImplementation(({ variant }: { variant: string }) =>
      Promise.resolve(variant in values ? { value: values[variant] } : null),
    );

  it('is the defaults when nothing is stored', async () => {
    store({});
    await expect(BookPrefs.appearance.get()).resolves.toEqual(DEFAULT_BOOK_APPEARANCE);
  });

  it('reads every stored preference', async () => {
    store({ theme: 'sepia', fontScale: '1.3', fontFamily: 'sans', lineSpacing: '1.8', margin: 'wide', justify: 'true' });
    await expect(BookPrefs.appearance.get()).resolves.toEqual({
      theme: 'sepia',
      fontScale: 1.3,
      fontFamily: 'sans',
      lineSpacing: 1.8,
      margin: 'wide',
      justify: true,
    });
  });

  it('keeps the default of any preference whose stored value is not valid', async () => {
    store({ theme: 'solarized', fontScale: '0', fontFamily: 'comic', lineSpacing: '1.7', margin: 'huge', justify: 'maybe' });
    await expect(BookPrefs.appearance.get()).resolves.toEqual(DEFAULT_BOOK_APPEARANCE);
  });

  it('falls back to the defaults when the store fails', async () => {
    mockGet.mockRejectedValue(new Error('db'));
    await expect(BookPrefs.appearance.get()).resolves.toEqual(DEFAULT_BOOK_APPEARANCE);
  });

  it('writes one preference under its own variant', async () => {
    mockPut.mockResolvedValue(undefined);
    await BookPrefs.appearance.set({ key: 'theme', value: 'black' });
    await BookPrefs.appearance.set({ key: 'justify', value: true });
    await BookPrefs.appearance.set({ key: 'lineSpacing', value: 2 });

    expect(mockPut).toHaveBeenNthCalledWith(1, { key: 'bookReader', value: 'black', domain: 'bookReaderPrefs', variant: 'theme' });
    expect(mockPut).toHaveBeenNthCalledWith(2, { key: 'bookReader', value: 'true', domain: 'bookReaderPrefs', variant: 'justify' });
    expect(mockPut).toHaveBeenNthCalledWith(3, { key: 'bookReader', value: '2', domain: 'bookReaderPrefs', variant: 'lineSpacing' });
  });

  it('defaults to a calm book: serif, 1.6 line height, medium margins, not justified', () => {
    expect(DEFAULT_BOOK_APPEARANCE).toMatchObject({ theme: 'app', fontFamily: 'serif', lineSpacing: 1.6, margin: 'medium', justify: false });
  });
});

describe('BookPrefs.mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is infinite unless the reader chose paged', async () => {
    mockGet.mockResolvedValueOnce(null);
    await expect(BookPrefs.mode.get()).resolves.toBe('infinite');
    mockGet.mockResolvedValueOnce({ value: 'paged' });
    await expect(BookPrefs.mode.get()).resolves.toBe('paged');
    mockGet.mockResolvedValueOnce({ value: 'weird' });
    await expect(BookPrefs.mode.get()).resolves.toBe('infinite');
    mockGet.mockRejectedValueOnce(new Error('db'));
    await expect(BookPrefs.mode.get()).resolves.toBe('infinite');
  });

  it('writes under its own variant', async () => {
    mockPut.mockResolvedValue(undefined);
    await BookPrefs.mode.set('paged');
    expect(mockPut).toHaveBeenCalledWith({ key: 'bookReader', value: 'paged', domain: 'bookReaderPrefs', variant: 'mode' });
  });
});

