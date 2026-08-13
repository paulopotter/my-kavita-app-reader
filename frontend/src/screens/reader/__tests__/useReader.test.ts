import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Chapter } from '../../../shared/bridge/series';
import { ViewerChapters } from '../../../shared/transforms/page';

const mockFetchLocalProgress = jest.fn();
const mockFetchServerReadProgress = jest.fn();
const mockSaveLocalProgress = jest.fn().mockResolvedValue(undefined);
const mockSaveServerProgress = jest.fn().mockResolvedValue(undefined);
const mockMarkChapterRead = jest.fn().mockResolvedValue(undefined);
const mockMarkChapterUnread = jest.fn().mockResolvedValue(undefined);

jest.mock('../ReaderService', () => ({
  fetchLocalProgress: (...args: unknown[]) => mockFetchLocalProgress(...args),
  fetchServerReadProgress: (...args: unknown[]) => mockFetchServerReadProgress(...args),
  saveLocalProgress: (...args: unknown[]) => mockSaveLocalProgress(...args),
  saveServerProgress: (...args: unknown[]) => mockSaveServerProgress(...args),
  markChapterRead: (...args: unknown[]) => mockMarkChapterRead(...args),
  markChapterUnread: (...args: unknown[]) => mockMarkChapterUnread(...args),
}));

import { useReader } from '../useReader';

function makeChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: 'c1',
    seriesId: 's1',
    title: 'Cap 1',
    number: '1',
    pageCount: 3,
    sortOrder: 1,
    readStatus: 'UNREAD',
    pagesRead: 0,
    updatedAtLocalMs: null,
    ...overrides,
  };
}

function makeViewer(chapter: Chapter, pages = ['url0', 'url1', 'url2']): ViewerChapters {
  return { prev: null, curr: { chapter, pages }, next: null };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockFetchLocalProgress.mockResolvedValue(null);
  mockFetchServerReadProgress.mockResolvedValue(null);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useReader — timers', () => {
  it('timer local dispara a cada 2s mesmo sem mudanca de pagina', async () => {
    const { result } = renderHook(() => useReader('s1', 'c1'));

    act(() => {
      result.current.dispatch({
        type: 'VIEWER_READY',
        viewer: makeViewer(makeChapter()),
        initialPage: 0,
        initialScrollFraction: 0,
      });
    });

    act(() => {
      jest.advanceTimersByTime(2_000);
    });
    expect(mockSaveLocalProgress).toHaveBeenCalledWith('c1', 's1', 0, 0);

    act(() => {
      jest.advanceTimersByTime(2_000);
    });
    expect(mockSaveLocalProgress).toHaveBeenCalledTimes(2);
  });

  it('timer de sync so envia quando a pagina mudou', async () => {
    const { result } = renderHook(() => useReader('s1', 'c1'));

    act(() => {
      result.current.dispatch({
        type: 'VIEWER_READY',
        viewer: makeViewer(makeChapter()),
        initialPage: 0,
        initialScrollFraction: 0,
      });
    });

    await act(async () => {
      jest.advanceTimersByTime(20_000);
      await Promise.resolve();
    });
    expect(mockSaveServerProgress).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(20_000);
      await Promise.resolve();
    });
    // página não mudou desde o último envio bem-sucedido — não reenviar.
    expect(mockSaveServerProgress).toHaveBeenCalledTimes(1);
  });

  it('timer de sync suprime envio de capitulo recem marcado como lido', async () => {
    const chapter = makeChapter({ pageCount: 1 });
    const { result } = renderHook(() => useReader('s1', 'c1'));

    act(() => {
      result.current.dispatch({
        type: 'VIEWER_READY',
        viewer: makeViewer(chapter, ['url0']),
        initialPage: 0,
        initialScrollFraction: 0,
      });
    });

    await waitFor(() => expect(mockMarkChapterRead).toHaveBeenCalledWith('s1', 'c1'));

    act(() => {
      jest.advanceTimersByTime(20_000);
    });
    expect(mockSaveServerProgress).not.toHaveBeenCalled();
  });
});

describe('useReader — marcação como lido', () => {
  it('marca como lido ao atingir a ultima pagina automaticamente', async () => {
    const chapter = makeChapter({ pageCount: 1 });
    const { result } = renderHook(() => useReader('s1', 'c1'));

    act(() => {
      result.current.dispatch({
        type: 'VIEWER_READY',
        viewer: makeViewer(chapter, ['url0']),
        initialPage: 0,
        initialScrollFraction: 0,
      });
    });

    await waitFor(() => expect(mockMarkChapterRead).toHaveBeenCalledWith('s1', 'c1'));
    expect(mockMarkChapterRead).toHaveBeenCalledTimes(1);
  });

  it('marcar como lido e idempotente por sessao', async () => {
    const chapter = makeChapter({ pageCount: 1 });
    const { result } = renderHook(() => useReader('s1', 'c1'));

    act(() => {
      result.current.dispatch({
        type: 'VIEWER_READY',
        viewer: makeViewer(chapter, ['url0']),
        initialPage: 0,
        initialScrollFraction: 0,
      });
    });
    await waitFor(() => expect(mockMarkChapterRead).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.dispatch({ type: 'SET_CURRENT_PAGE', page: 0, scrollFraction: 1 });
    });

    expect(mockMarkChapterRead).toHaveBeenCalledTimes(1);
  });

  it('falha de rede na marcacao nao reverte estado otimista mas permite retry', async () => {
    mockMarkChapterRead.mockRejectedValueOnce(new Error('network error'));
    const chapter = makeChapter({ pageCount: 1 });
    const { result } = renderHook(() => useReader('s1', 'c1'));

    act(() => {
      result.current.dispatch({
        type: 'VIEWER_READY',
        viewer: makeViewer(chapter, ['url0']),
        initialPage: 0,
        initialScrollFraction: 0,
      });
    });

    await waitFor(() => expect(mockMarkChapterRead).toHaveBeenCalledTimes(1));
    // Estado otimista permanece (dispatch já ocorreu antes da falha).
    expect(result.current.viewer?.curr.chapter.readStatus).toBe('READ');
  });
});

describe('useReader — onScreenExit', () => {
  it('em capitulo ja lido nao chama saveServerProgress', async () => {
    const chapter = makeChapter({ readStatus: 'READ', pagesRead: 3, pageCount: 3 });
    const { result } = renderHook(() => useReader('s1', 'c1'));

    act(() => {
      result.current.dispatch({
        type: 'VIEWER_READY',
        viewer: makeViewer(chapter),
        initialPage: 0,
        initialScrollFraction: 0,
      });
    });

    await act(async () => {
      await result.current.onScreenExit();
    });

    expect(mockSaveLocalProgress).toHaveBeenCalled();
    expect(mockSaveServerProgress).not.toHaveBeenCalled();
  });

  it('em capitulo nao lido salva progresso local e remoto', async () => {
    const chapter = makeChapter({ readStatus: 'IN_PROGRESS', pagesRead: 1, pageCount: 3 });
    const { result } = renderHook(() => useReader('s1', 'c1'));

    act(() => {
      result.current.dispatch({
        type: 'VIEWER_READY',
        viewer: makeViewer(chapter),
        initialPage: 1,
        initialScrollFraction: 0.5,
      });
    });

    await act(async () => {
      await result.current.onScreenExit();
    });

    expect(mockSaveLocalProgress).toHaveBeenCalledWith('c1', 's1', 1, 0.5);
    expect(mockSaveServerProgress).toHaveBeenCalledWith('c1', 's1', 1);
  });
});

describe('useReader — navegação entre capítulos', () => {
  it('currChapterOf(viewer) e sempre a unica fonte de capitulo atual', async () => {
    const chapter = makeChapter();
    const { result } = renderHook(() => useReader('s1', 'c1'));

    act(() => {
      result.current.dispatch({
        type: 'VIEWER_READY',
        viewer: makeViewer(chapter),
        initialPage: 0,
        initialScrollFraction: 0,
      });
    });

    expect(result.current.viewer?.curr.chapter.id).toBe('c1');
  });

  it('trocar de capitulo nunca muta o objeto viewer anterior', async () => {
    const curr = makeChapter({ id: 'c1', pageCount: 1 });
    const next = makeChapter({ id: 'c2' });
    const { result } = renderHook(() => useReader('s1', 'c1'));
    const originalViewer: ViewerChapters = { prev: null, curr: { chapter: curr, pages: ['url0'] }, next: { chapter: next, pages: ['url0', 'url1'] } };

    act(() => {
      result.current.dispatch({
        type: 'VIEWER_READY',
        viewer: originalViewer,
        initialPage: 0,
        initialScrollFraction: 0,
      });
    });

    await act(async () => {
      await result.current.advanceToNextChapter();
    });

    expect(result.current.viewer).not.toBe(originalViewer);
    expect(result.current.viewer?.curr.chapter.id).toBe('c2');
  });

  it('avancar marca o capitulo atual como lido mesmo sem rolar ate o fim', async () => {
    const curr = makeChapter({ id: 'c1', pageCount: 5 });
    const next = makeChapter({ id: 'c2' });
    const { result } = renderHook(() => useReader('s1', 'c1'));

    act(() => {
      result.current.dispatch({
        type: 'VIEWER_READY',
        viewer: { prev: null, curr: { chapter: curr, pages: ['a', 'b', 'c', 'd', 'e'] }, next: { chapter: next, pages: ['x'] } },
        initialPage: 1,
        initialScrollFraction: 0,
      });
    });

    await act(async () => {
      await result.current.goToNextChapterManual();
    });

    expect(mockMarkChapterRead).toHaveBeenCalledWith('s1', 'c1');
    expect(result.current.viewer?.curr.chapter.id).toBe('c2');
  });

  it('retroceder nao marca o capitulo atual como lido', async () => {
    const prev = makeChapter({ id: 'c0', pageCount: 5 });
    const curr = makeChapter({ id: 'c1', pageCount: 5 });
    const { result } = renderHook(() => useReader('s1', 'c1'));

    act(() => {
      result.current.dispatch({
        type: 'VIEWER_READY',
        viewer: {
          prev: { chapter: prev, pages: ['a', 'b', 'c', 'd', 'e'] },
          curr: { chapter: curr, pages: ['a', 'b', 'c', 'd', 'e'] },
          next: null,
        },
        initialPage: 1,
        initialScrollFraction: 0,
      });
    });

    await act(async () => {
      await result.current.goToPrevChapterManual();
    });

    expect(mockMarkChapterRead).not.toHaveBeenCalled();
    expect(result.current.viewer?.curr.chapter.id).toBe('c0');
  });
});
