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

const mockAppearanceGet = jest.fn();
const mockAppearanceSet = jest.fn();
const mockModeGet = jest.fn();
const mockModeSet = jest.fn();
jest.mock('../../../shared/tools/books', () => {
  const actual = jest.requireActual('../../../shared/tools/books');
  return {
    ...actual,
    BookPrefs: {
      fontScale: { step: actual.BookPrefs.fontScale.step },
      appearance: {
        get: (...a: unknown[]) => mockAppearanceGet(...a),
        set: (...a: unknown[]) => mockAppearanceSet(...a),
      },
      mode: {
        get: (...a: unknown[]) => mockModeGet(...a),
        set: (...a: unknown[]) => mockModeSet(...a),
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

import { DEFAULT_BOOK_APPEARANCE } from '../../../shared/tools/books/book-prefs.tool';
import { useBookReader } from './book-reader.hooks';

function chapter(id: string, number: number, readStatus: 'READ' | 'UNREAD' = 'UNREAD') {
  return { isSuccess: true, id, seriesId: 's1', number, decimalNumber: number, title: `Cap ${number}`, readStatus };
}

const series = { isSuccess: true, chapters: { list: [chapter('c1', 1, 'READ'), chapter('c2', 2), chapter('c3', 3)] } };

function setup(chapterId = 'c2', inject?: (script: string) => void) {
  return renderHook(() => useBookReader({ seriesId: 's1', chapterId, seriesName: 'Leveling', inject }));
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
    mockAppearanceGet.mockResolvedValue({ ...DEFAULT_BOOK_APPEARANCE });
    mockAppearanceSet.mockResolvedValue(undefined);
    // The existing tests exercise the paged mode; the infinite one has its own describe below.
    mockModeGet.mockResolvedValue('paged');
    mockModeSet.mockResolvedValue(undefined);
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

  describe('series name', () => {
    it('uses the name the route carried', async () => {
      mockSerialGet.mockResolvedValue({ ...series, name: 'From the server' });
      const { result } = setup();
      await waitFor(() => expect(result.current.hasNextChapter).toBe(true));
      expect(result.current.seriesName).toBe('Leveling');
    });

    it('asks the series for it when the route did not carry one', async () => {
      mockSerialGet.mockResolvedValue({ ...series, name: 'From the server' });
      const { result } = renderHook(() => useBookReader({ seriesId: 's1', chapterId: 'c2' }));
      await waitFor(() => expect(result.current.seriesName).toBe('From the server'));
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
      // Closed on open, like the image reader: the page first, the controls on a tap.
      expect(result.current.overlayVisible).toBe(false);

      act(() => result.current.handleMessage('{"type":"tap"}'));
      expect(result.current.overlayVisible).toBe(true);
      act(() => result.current.handleMessage('{"type":"tap"}'));
      expect(result.current.overlayVisible).toBe(false);
    });

    it('ignores a message that is not one of ours', async () => {
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));
      act(() => result.current.handleMessage('garbage'));
      expect(mockStoreSet).not.toHaveBeenCalled();
      expect(result.current.overlayVisible).toBe(false);
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

  describe('progress', () => {
    it('is the position inside a single-page chapter', async () => {
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));
      expect(result.current.chapterFraction).toBe(0);

      act(() => result.current.handleMessage('{"type":"progress","fraction":0.4}'));

      expect(result.current.chapterFraction).toBeCloseTo(0.4);
    });

    it('counts the pages already behind the reader in a multi-page chapter', async () => {
      mockInfo.mockResolvedValue({ title: 'x', pageCount: 4 });
      mockStoreGet.mockResolvedValue({ seriesId: 's1', page: 2, scrollFraction: 0.5, updatedAtEpochMs: 1 });
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));

      // Two pages done and half of the third, out of four.
      expect(result.current.chapterFraction).toBeCloseTo(0.625);
    });

    it('is capped at 1', async () => {
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));
      act(() => result.current.handleMessage('{"type":"progress","fraction":1}'));
      expect(result.current.chapterFraction).toBe(1);
    });

    it('restarts at the top of a page turned to', async () => {
      mockInfo.mockResolvedValue({ title: 'x', pageCount: 2 });
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));
      act(() => result.current.handleMessage('{"type":"progress","fraction":0.9}'));

      act(() => result.current.nextPage());
      await waitFor(() => expect(result.current.pageIndex).toBe(1));

      expect(result.current.chapterFraction).toBeCloseTo(0.5);
    });
  });

  describe('appearance', () => {
    it('starts at the saved look', async () => {
      mockAppearanceGet.mockResolvedValue({ ...DEFAULT_BOOK_APPEARANCE, theme: 'sepia', fontScale: 1.3 });
      const { result } = setup();
      await waitFor(() => expect(result.current.appearance.theme).toBe('sepia'));
      expect(result.current.appearance.fontScale).toBe(1.3);
    });

    it('keeps the defaults when the saved look cannot be read', async () => {
      mockAppearanceGet.mockRejectedValue(new Error('x'));
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));
      expect(result.current.appearance).toEqual(DEFAULT_BOOK_APPEARANCE);
    });

    it('changes one preference, saves it, and keeps the reader where they are', async () => {
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));
      act(() => result.current.handleMessage('{"type":"progress","fraction":0.6}'));

      act(() => result.current.updateAppearance('theme', 'black'));

      expect(result.current.appearance.theme).toBe('black');
      expect(result.current.appearance.fontFamily).toBe('serif');
      expect(result.current.restoreFraction).toBe(0.6);
      expect(mockAppearanceSet).toHaveBeenCalledWith({ key: 'theme', value: 'black' });
    });

    it('survives a failed save', async () => {
      mockAppearanceSet.mockRejectedValue(new Error('x'));
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));
      act(() => result.current.updateAppearance('justify', true));
      expect(result.current.appearance.justify).toBe(true);
    });
  });

  describe('text size', () => {
    it('steps the size through the same save', async () => {
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));
      act(() => result.current.handleMessage('{"type":"progress","fraction":0.6}'));

      act(() => result.current.changeFontScale('larger'));

      expect(result.current.appearance.fontScale).toBe(1.15);
      expect(result.current.restoreFraction).toBe(0.6);
      expect(mockAppearanceSet).toHaveBeenCalledWith({ key: 'fontScale', value: 1.15 });
    });

    it('does nothing at the smallest size', async () => {
      mockAppearanceGet.mockResolvedValue({ ...DEFAULT_BOOK_APPEARANCE, fontScale: 0.85 });
      const { result } = setup();
      await waitFor(() => expect(result.current.appearance.fontScale).toBe(0.85));

      act(() => result.current.changeFontScale('smaller'));

      expect(mockAppearanceSet).not.toHaveBeenCalled();
    });
  });

  describe('the saved look and mode', () => {
    it('waits for them before loading, so the page is not drawn twice', async () => {
      let release: (value: unknown) => void = () => {};
      mockAppearanceGet.mockReturnValue(new Promise(resolve => (release = resolve)));
      const { result } = setup();

      await act(async () => {
        await Promise.resolve();
      });
      expect(mockInfo).not.toHaveBeenCalled();
      expect(result.current.status).toBe('loading');

      await act(async () => release({ ...DEFAULT_BOOK_APPEARANCE, theme: 'night' }));
      await waitFor(() => expect(result.current.status).toBe('ready'));
      expect(result.current.appearance.theme).toBe('night');
    });

    it('opens with the defaults when they cannot be read, and in the infinite mode', async () => {
      mockAppearanceGet.mockRejectedValue(new Error('x'));
      mockModeGet.mockRejectedValue(new Error('x'));
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('ready'));
      expect(result.current.appearance).toEqual(DEFAULT_BOOK_APPEARANCE);
      expect(result.current.mode).toBe('infinite');
    });
  });
});

describe('useBookReader — infinite mode', () => {
  const inject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockModeGet.mockResolvedValue('infinite');
    mockModeSet.mockResolvedValue(undefined);
    mockInfo.mockResolvedValue({ title: 'x', pageCount: 1 });
    mockPage.mockImplementation(({ chapterId, page }: { chapterId: string; page: number }) => Promise.resolve(`<p>${chapterId}/${page}</p>`));
    mockSerialGet.mockResolvedValue(series);
    mockStoreGet.mockResolvedValue(null);
    mockStoreSet.mockResolvedValue(undefined);
    mockProgressSet.mockResolvedValue(undefined);
    mockAppearanceGet.mockResolvedValue({ ...DEFAULT_BOOK_APPEARANCE });
    mockAppearanceSet.mockResolvedValue(undefined);
  });

  async function ready(chapterId = 'c1') {
    const hook = setup(chapterId, inject);
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    await waitFor(() => expect(hook.result.current.hasNextChapter || chapterId === 'c3').toBe(true));
    return hook;
  }

  const injected = () => inject.mock.calls.map(call => call[0] as string);
  const send = (hook: { result: { current: { handleMessage: (raw: string) => void } } }, message: object) =>
    act(() => {
      hook.result.current.handleMessage(JSON.stringify(message));
    });

  it('is the infinite mode, with the loaded chapter as the first section', async () => {
    const { result } = await ready('c2');
    expect(result.current.infinite).toBe(true);
    expect(result.current.firstSection).toEqual({ chapterId: 'c2', page: 0 });
  });

  it('turns no pages by hand', async () => {
    mockInfo.mockResolvedValue({ title: 'x', pageCount: 3 });
    const { result } = await ready('c2');
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.hasPrevPage).toBe(false);
  });

  describe('appending', () => {
    it('adds the next chapter when the page asks for it', async () => {
      const hook = await ready('c1');

      send(hook, { type: 'needNext' });
      await waitFor(() => expect(inject).toHaveBeenCalledTimes(1));

      expect(injected()[0]).toBe('window.__appendSection({"chapterId":"c2","page":0,"html":"<p>c2/0</p>"}); true;');
      expect(mockInfo).toHaveBeenCalledWith({ chapterId: 'c2' });
    });

    it('adds the next PAGE first when the chapter has more', async () => {
      mockInfo.mockResolvedValue({ title: 'x', pageCount: 3 });
      const hook = await ready('c1');

      send(hook, { type: 'needNext' });
      await waitFor(() => expect(inject).toHaveBeenCalledTimes(1));

      expect(injected()[0]).toContain('"chapterId":"c1","page":1');
    });

    it('keeps going, one section after another', async () => {
      const hook = await ready('c1');

      send(hook, { type: 'needNext' });
      await waitFor(() => expect(inject).toHaveBeenCalledTimes(1));
      send(hook, { type: 'needNext' });
      await waitFor(() => expect(inject).toHaveBeenCalledTimes(2));

      expect(injected()[1]).toContain('"chapterId":"c3"');
    });

    it('says there is no more when the series has run out', async () => {
      const hook = await ready('c3');

      send(hook, { type: 'needNext' });
      await waitFor(() => expect(inject).toHaveBeenCalledTimes(1));

      expect(injected()[0]).toBe('window.__noMore(); true;');
    });

    it('tells the page to ask again when the fetch fails', async () => {
      const hook = await ready('c1');
      mockPage.mockRejectedValueOnce(new Error('x'));

      send(hook, { type: 'needNext' });
      await waitFor(() => expect(inject).toHaveBeenCalledTimes(1));

      expect(injected()[0]).toBe('window.__needNextFailed(); true;');
    });

    it('does not mistake "the order is not here yet" for "the series ended"', async () => {
      let release: (value: unknown) => void = () => {};
      mockSerialGet.mockReturnValue(new Promise(resolve => (release = resolve)));
      const hook = setup('c1', inject);
      await waitFor(() => expect(hook.result.current.status).toBe('ready'));

      send(hook, { type: 'needNext' });
      await waitFor(() => expect(inject).toHaveBeenCalledTimes(1));
      expect(injected()[0]).toBe('window.__needNextFailed(); true;');

      release(series);
    });

    it('fetches once when asked twice before the first answer', async () => {
      let finish: (html: string) => void = () => {};
      const hook = await ready('c1');
      mockPage.mockReturnValueOnce(new Promise(resolve => (finish = resolve)));

      send(hook, { type: 'needNext' });
      send(hook, { type: 'needNext' });
      await act(async () => finish('<p>late</p>'));
      await waitFor(() => expect(inject).toHaveBeenCalledTimes(1));
    });

    it('escapes whatever the page contains so it cannot end the snippet', async () => {
      mockPage.mockImplementation(({ chapterId }: { chapterId: string }) =>
        Promise.resolve(chapterId === 'c2' ? '</script>"; alert(1); //' : '<p>x</p>'),
      );
      const hook = await ready('c1');

      send(hook, { type: 'needNext' });
      await waitFor(() => expect(inject).toHaveBeenCalledTimes(1));

      expect(injected()[0]).toContain('"html":"</script>\\"; alert(1); //"');
    });

    it('does nothing without a way to run a snippet in the page', async () => {
      const hook = setup('c1', undefined);
      await waitFor(() => expect(hook.result.current.status).toBe('ready'));
      send(hook, { type: 'needNext' });
      expect(mockInfo).toHaveBeenCalledTimes(1);
    });
  });

  describe('where the reader is', () => {
    it('follows the section in view: chapter, title, progress and neighbours', async () => {
      const hook = await ready('c1');
      send(hook, { type: 'needNext' });
      await waitFor(() => expect(inject).toHaveBeenCalledTimes(1));

      send(hook, { type: 'progress', fraction: 0.4, chapterId: 'c2', page: 0 });

      await waitFor(() => expect(hook.result.current.chapterId).toBe('c2'));
      expect(hook.result.current.chapterTitle).toBe('T:Cap 2');
      expect(hook.result.current.chapterFraction).toBeCloseTo(0.4);
      expect(hook.result.current.hasPrevChapter).toBe(true);
      expect(hook.result.current.hasNextChapter).toBe(true);
    });

    it('saves the progress of the chapter in view, not of the one that was opened', async () => {
      const hook = await ready('c1');
      send(hook, { type: 'needNext' });
      await waitFor(() => expect(inject).toHaveBeenCalledTimes(1));

      send(hook, { type: 'progress', fraction: 0.4, chapterId: 'c2', page: 0 });

      expect(mockStoreSet).toHaveBeenCalledWith('c2', { seriesId: 's1', page: 0, scrollFraction: 0.4 });
      expect(mockProgressSet).toHaveBeenCalledWith({ seriesId: 's1', chapterId: 'c2', pageIndex: 0 });
    });

    it('shows the page indicator of the section in view', async () => {
      mockInfo.mockImplementation(({ chapterId }: { chapterId: string }) => Promise.resolve({ title: 'x', pageCount: chapterId === 'c2' ? 4 : 1 }));
      const hook = await ready('c1');
      send(hook, { type: 'needNext' });
      await waitFor(() => expect(inject).toHaveBeenCalledTimes(1));

      send(hook, { type: 'progress', fraction: 0.1, chapterId: 'c2', page: 0 });

      await waitFor(() => expect(hook.result.current.pageIndicator).toBe('Page 1 of 4'));
    });
  });

  describe('marking chapters read', () => {
    it('marks a chapter read once the reader is past its end', async () => {
      const hook = await ready('c2');

      send(hook, { type: 'passed', chapterId: 'c2', page: 0 });
      send(hook, { type: 'passed', chapterId: 'c2', page: 0 });

      expect(mockMarkRead).toHaveBeenCalledTimes(1);
      expect(mockMarkRead).toHaveBeenCalledWith({ seriesId: 's1', chapterId: 'c2', prevStatus: 'UNREAD' });
    });

    it('does not mark a chapter whose last page has not been passed', async () => {
      mockInfo.mockResolvedValue({ title: 'x', pageCount: 3 });
      const hook = await ready('c2');

      send(hook, { type: 'passed', chapterId: 'c2', page: 0 });

      expect(mockMarkRead).not.toHaveBeenCalled();
    });

    it('marks it when the end of the last page is reached while still in it', async () => {
      const hook = await ready('c2');

      send(hook, { type: 'progress', fraction: 0.99, chapterId: 'c2', page: 0 });

      expect(mockMarkRead).toHaveBeenCalledWith({ seriesId: 's1', chapterId: 'c2', prevStatus: 'UNREAD' });
    });

    it('does not re-mark a chapter that was already read', async () => {
      const hook = await ready('c1');

      send(hook, { type: 'passed', chapterId: 'c1', page: 0 });

      expect(mockMarkRead).not.toHaveBeenCalled();
    });
  });

  describe('changing how it reads', () => {
    it('keeps the place when the mode changes, and remembers the choice', async () => {
      const hook = await ready('c1');
      send(hook, { type: 'needNext' });
      await waitFor(() => expect(inject).toHaveBeenCalledTimes(1));
      send(hook, { type: 'progress', fraction: 0.5, chapterId: 'c2', page: 0 });
      await waitFor(() => expect(hook.result.current.chapterId).toBe('c2'));
      mockPage.mockClear();

      act(() => hook.result.current.changeMode('paged'));

      expect(hook.result.current.mode).toBe('paged');
      expect(mockModeSet).toHaveBeenCalledWith('paged');
      await waitFor(() => expect(mockPage).toHaveBeenCalledWith({ chapterId: 'c2', page: 0 }));
      await waitFor(() => expect(hook.result.current.restoreFraction).toBe(0.5));
      expect(hook.result.current.firstSection).toEqual({ chapterId: 'c2', page: 0 });
    });

    it('keeps the neighbours and the progress when a paged book is switched to the infinite mode', async () => {
      mockModeGet.mockResolvedValue('paged');
      const hook = await ready('c2');
      send(hook, { type: 'progress', fraction: 0.4 });

      act(() => hook.result.current.changeMode('infinite'));
      expect(hook.result.current.overlayVisible).toBe(false);
      await waitFor(() => expect(hook.result.current.infinite).toBe(true));
      await waitFor(() => expect(hook.result.current.status).toBe('ready'));
      send(hook, { type: 'progress', fraction: 0.1, chapterId: 'c2', page: 0 });

      expect(hook.result.current.chapterId).toBe('c2');
      expect(hook.result.current.hasPrevChapter).toBe(true);
      expect(hook.result.current.hasNextChapter).toBe(true);
      expect(hook.result.current.chapterFraction).toBeCloseTo(0.1);
      expect(hook.result.current.firstSection).toEqual({ chapterId: 'c2', page: 0 });
    });

    it('ignores choosing the mode it is already in', async () => {
      const hook = await ready('c1');
      act(() => hook.result.current.changeMode('infinite'));
      expect(mockModeSet).not.toHaveBeenCalled();
    });

    it('reopens at the section in view when the look changes after the page has grown', async () => {
      const hook = await ready('c1');
      send(hook, { type: 'needNext' });
      await waitFor(() => expect(inject).toHaveBeenCalledTimes(1));
      send(hook, { type: 'progress', fraction: 0.7, chapterId: 'c2', page: 0 });
      await waitFor(() => expect(hook.result.current.chapterId).toBe('c2'));
      mockPage.mockClear();

      act(() => hook.result.current.updateAppearance('theme', 'sepia'));

      await waitFor(() => expect(mockPage).toHaveBeenCalledWith({ chapterId: 'c2', page: 0 }));
      await waitFor(() => expect(hook.result.current.restoreFraction).toBe(0.7));
    });

    it('just rebuilds when nothing has been appended', async () => {
      const hook = await ready('c1');
      send(hook, { type: 'progress', fraction: 0.3, chapterId: 'c1', page: 0 });
      mockPage.mockClear();

      act(() => hook.result.current.updateAppearance('justify', true));

      expect(hook.result.current.restoreFraction).toBe(0.3);
      expect(mockPage).not.toHaveBeenCalled();
    });
  });
});

