import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../../../shared/i18n', () => ({
  useStrings: () => require('../../../shared/i18n/strings').getStrings('en'),
}));

const mockInfo = jest.fn();
const mockPage = jest.fn();
jest.mock('../../../shared/services/books', () => ({
  BookService: {
    info: (...a: unknown[]) => mockInfo(...a),
    page: (...a: unknown[]) => mockPage(...a),
  },
}));

const mockSerialGet = jest.fn();
jest.mock('../../../shared/services/serials', () => ({
  SerialService: { get: (...a: unknown[]) => mockSerialGet(...a) },
}));

const mockProgressSet = jest.fn();
jest.mock('../../../shared/services/chapters', () => ({
  ChapterService: { progress: { set: (...a: unknown[]) => mockProgressSet(...a) } },
}));

const mockStoreGet = jest.fn();
const mockStoreSet = jest.fn();
jest.mock('../../../shared/managers/store', () => ({
  ReadingProgressManager: {
    get: (...a: unknown[]) => mockStoreGet(...a),
    set: (...a: unknown[]) => mockStoreSet(...a),
  },
}));

const mockFontGet = jest.fn();
const mockFontSet = jest.fn();
jest.mock('../../../shared/tools/books', () => {
  const actual = jest.requireActual('../../../shared/tools/books');
  return {
    ...actual,
    BookPrefs: {
      fontScale: {
        get: (...a: unknown[]) => mockFontGet(...a),
        set: (...a: unknown[]) => mockFontSet(...a),
        step: actual.BookPrefs.fontScale.step,
      },
    },
  };
});

const mockMarkRead = jest.fn();
jest.mock('../../../shared/tools/chapters', () => {
  const actual = jest.requireActual('../../../shared/tools/chapters/chapters-order.tool');
  return {
    ...actual,
    ChapterTool: {
      mark: { read: (...a: unknown[]) => mockMarkRead(...a) },
      format: { title: (c: { title: string }) => `T:${c.title}` },
    },
  };
});

import { useBookReader } from './book-reader.hooks';

function chapter(id: string, number: number, readStatus: 'READ' | 'UNREAD' = 'UNREAD') {
  return { isSuccess: true, id, seriesId: 's1', number, decimalNumber: number, title: `Cap ${number}`, readStatus };
}

const series = { isSuccess: true, chapters: { list: [chapter('c1', 1, 'READ'), chapter('c2', 2), chapter('c3', 3)] } };

function setup(chapterId = 'c2') {
  return renderHook(() => useBookReader({ seriesId: 's1', chapterId, seriesName: 'Leveling' }));
}

describe('useBookReader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInfo.mockResolvedValue({ title: 'Capítulo 2', pageCount: 1 });
    mockPage.mockResolvedValue('<p>texto</p>');
    mockSerialGet.mockResolvedValue(series);
    mockStoreGet.mockResolvedValue(null);
    mockStoreSet.mockResolvedValue(undefined);
    mockProgressSet.mockResolvedValue(undefined);
    mockFontGet.mockResolvedValue(1);
    mockFontSet.mockResolvedValue(undefined);
  });

  describe('opening a chapter', () => {
    it('loads the book info and the first page, then is ready', async () => {
      const { result } = setup();
      expect(result.current.status).toBe('loading');

      await waitFor(() => expect(result.current.status).toBe('ready'));

      expect(mockInfo).toHaveBeenCalledWith({ chapterId: 'c2' });
      expect(mockPage).toHaveBeenCalledWith({ chapterId: 'c2', page: 0 });
      expect(result.current.html).toBe('<p>texto</p>');
      expect(result.current.pageCount).toBe(1);
      expect(result.current.restoreFraction).toBe(0);
    });

    it('resumes where the reader left: the saved page and position', async () => {
      mockInfo.mockResolvedValue({ title: 'x', pageCount: 4 });
      mockStoreGet.mockResolvedValue({ seriesId: 's1', page: 2, scrollFraction: 0.4, updatedAtEpochMs: 1 });

      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));

      expect(mockPage).toHaveBeenCalledWith({ chapterId: 'c2', page: 2 });
      expect(result.current.pageIndex).toBe(2);
      expect(result.current.restoreFraction).toBe(0.4);
    });

    it('starts at the top when the saved page no longer exists in the book', async () => {
      mockInfo.mockResolvedValue({ title: 'x', pageCount: 2 });
      mockStoreGet.mockResolvedValue({ seriesId: 's1', page: 9, scrollFraction: 0.9, updatedAtEpochMs: 1 });

      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));

      expect(result.current.pageIndex).toBe(0);
      expect(result.current.restoreFraction).toBe(0);
    });

    it('treats a book that reports no pages as one page', async () => {
      mockInfo.mockResolvedValue({ title: null, pageCount: 0 });
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));
      expect(result.current.pageCount).toBe(1);
    });

    it('goes to the error state when the server fails, and retry loads again', async () => {
      mockPage.mockRejectedValueOnce(new Error('boom'));
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('error'));

      act(() => result.current.retry());
      await waitFor(() => expect(result.current.status).toBe('ready'));
      expect(mockPage).toHaveBeenCalledTimes(2);
    });

    it('still opens when the saved position cannot be read', async () => {
      mockStoreGet.mockRejectedValue(new Error('store'));
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));
    });
  });

  describe('series order', () => {
    it('knows the title and the neighbours of the chapter', async () => {
      const { result } = setup('c2');
      await waitFor(() => expect(result.current.chapterTitle).toBe('T:Cap 2'));

      expect(result.current.hasPrevChapter).toBe(true);
      expect(result.current.hasNextChapter).toBe(true);
      expect(result.current.seriesName).toBe('Leveling');
    });

    it('has no previous chapter at the start and no next at the end', async () => {
      const first = setup('c1');
      await waitFor(() => expect(first.result.current.chapterTitle).toBe('T:Cap 1'));
      expect(first.result.current.hasPrevChapter).toBe(false);

      const last = setup('c3');
      await waitFor(() => expect(last.result.current.chapterTitle).toBe('T:Cap 3'));
      expect(last.result.current.hasNextChapter).toBe(false);
    });

    it('keeps working when the order cannot be loaded', async () => {
      mockSerialGet.mockRejectedValue(new Error('x'));
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));
      expect(result.current.hasNextChapter).toBe(false);
    });
  });

  describe('moving around', () => {
    it('goes to the next chapter from its start', async () => {
      mockStoreGet.mockResolvedValue({ seriesId: 's1', page: 1, scrollFraction: 0.8, updatedAtEpochMs: 1 });
      mockInfo.mockResolvedValue({ title: 'x', pageCount: 3 });
      const { result } = setup('c2');
      await waitFor(() => expect(result.current.hasNextChapter).toBe(true));
      await waitFor(() => expect(result.current.status).toBe('ready'));

      act(() => result.current.goToNextChapter());
      await waitFor(() => expect(result.current.chapterId).toBe('c3'));
      await waitFor(() => expect(result.current.status).toBe('ready'));

      // Opened at the start, ignoring the position saved for it.
      expect(mockPage).toHaveBeenLastCalledWith({ chapterId: 'c3', page: 0 });
      expect(result.current.restoreFraction).toBe(0);
    });

    it('goes to the previous chapter', async () => {
      const { result } = setup('c2');
      await waitFor(() => expect(result.current.hasPrevChapter).toBe(true));

      act(() => result.current.goToPrevChapter());
      await waitFor(() => expect(result.current.chapterId).toBe('c1'));
    });

    it('ignores a chapter move when there is no neighbour', async () => {
      const { result } = setup('c3');
      await waitFor(() => expect(result.current.status).toBe('ready'));
      act(() => result.current.goToNextChapter());
      expect(result.current.chapterId).toBe('c3');
    });

    it('turns pages inside a multi-page book and saves the page to the server', async () => {
      mockInfo.mockResolvedValue({ title: 'x', pageCount: 3 });
      mockPage.mockImplementation(({ page }: { page: number }) => Promise.resolve(`<p>página ${page}</p>`));
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));
      expect(result.current.hasNextPage).toBe(true);
      expect(result.current.hasPrevPage).toBe(false);
      expect(result.current.pageIndicator).toBe('Page 1 of 3');

      act(() => result.current.nextPage());
      await waitFor(() => expect(result.current.pageIndex).toBe(1));
      expect(result.current.html).toBe('<p>página 1</p>');
      expect(mockProgressSet).toHaveBeenCalledWith({ seriesId: 's1', chapterId: 'c2', pageIndex: 1 });

      act(() => result.current.prevPage());
      await waitFor(() => expect(result.current.pageIndex).toBe(0));
    });

    it('does not turn past the first or the last page', async () => {
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));
      mockPage.mockClear();

      act(() => result.current.nextPage());
      act(() => result.current.prevPage());

      expect(mockPage).not.toHaveBeenCalled();
      expect(result.current.pageIndicator).toBeUndefined();
    });

    it('reports an error when a page cannot be fetched', async () => {
      mockInfo.mockResolvedValue({ title: 'x', pageCount: 2 });
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));
      mockPage.mockRejectedValueOnce(new Error('x'));

      act(() => result.current.nextPage());
      await waitFor(() => expect(result.current.status).toBe('error'));
    });
  });

  describe('what the page reports', () => {
    it('toggles the bars on a tap', async () => {
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));
      expect(result.current.overlayVisible).toBe(true);

      act(() => result.current.handleMessage('{"type":"tap"}'));
      expect(result.current.overlayVisible).toBe(false);
      act(() => result.current.handleMessage('{"type":"tap"}'));
      expect(result.current.overlayVisible).toBe(true);
    });

    it('ignores a message that is not one of ours', async () => {
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));
      act(() => result.current.handleMessage('garbage'));
      expect(mockStoreSet).not.toHaveBeenCalled();
      expect(result.current.overlayVisible).toBe(true);
    });

    it('saves the position as the reader scrolls', async () => {
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));

      act(() => result.current.handleMessage('{"type":"progress","fraction":0.5}'));

      expect(mockStoreSet).toHaveBeenCalledWith('c2', { seriesId: 's1', page: 0, scrollFraction: 0.5 });
      expect(mockMarkRead).not.toHaveBeenCalled();
    });

    it('marks the chapter read once, when the end of the last page is reached', async () => {
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));
      await waitFor(() => expect(result.current.chapterTitle).toBe('T:Cap 2'));

      act(() => result.current.handleMessage('{"type":"progress","fraction":0.99}'));
      act(() => result.current.handleMessage('{"type":"progress","fraction":1}'));

      expect(mockMarkRead).toHaveBeenCalledTimes(1);
      expect(mockMarkRead).toHaveBeenCalledWith({ seriesId: 's1', chapterId: 'c2', prevStatus: 'UNREAD' });
    });

    it('does not mark a chapter that was already read', async () => {
      mockInfo.mockResolvedValue({ title: 'x', pageCount: 1 });
      const { result } = setup('c1');
      await waitFor(() => expect(result.current.chapterTitle).toBe('T:Cap 1'));

      act(() => result.current.handleMessage('{"type":"progress","fraction":1}'));

      expect(mockMarkRead).not.toHaveBeenCalled();
    });

    it('does not mark the chapter read at the end of a page that is not the last', async () => {
      mockInfo.mockResolvedValue({ title: 'x', pageCount: 3 });
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));

      act(() => result.current.handleMessage('{"type":"progress","fraction":1}'));

      expect(mockMarkRead).not.toHaveBeenCalled();
    });
  });

  describe('text size', () => {
    it('starts at the saved size', async () => {
      mockFontGet.mockResolvedValue(1.3);
      const { result } = setup();
      await waitFor(() => expect(result.current.fontScale).toBe(1.3));
    });

    it('steps the size, saves it and keeps the reader where they are', async () => {
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));
      act(() => result.current.handleMessage('{"type":"progress","fraction":0.6}'));

      act(() => result.current.changeFontScale('larger'));

      expect(result.current.fontScale).toBe(1.15);
      expect(result.current.restoreFraction).toBe(0.6);
      expect(mockFontSet).toHaveBeenCalledWith(1.15);
    });

    it('does nothing at the smallest size', async () => {
      mockFontGet.mockResolvedValue(0.85);
      const { result } = setup();
      await waitFor(() => expect(result.current.fontScale).toBe(0.85));

      act(() => result.current.changeFontScale('smaller'));

      expect(mockFontSet).not.toHaveBeenCalled();
    });
  });
});
