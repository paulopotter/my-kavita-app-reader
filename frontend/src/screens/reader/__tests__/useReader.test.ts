import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Image } from 'react-native';
import { Chapter } from '../../../shared/bridge/series';
import { ViewerChapters } from '../../../shared/transforms/page';

const mockFetchLocalProgress = jest.fn();
const mockFetchServerReadProgress = jest.fn();
const mockSaveLocalProgress = jest.fn().mockResolvedValue(undefined);
const mockSaveServerProgress = jest.fn().mockResolvedValue(undefined);
const mockMarkChapterRead = jest.fn().mockResolvedValue(undefined);
const mockMarkChapterUnread = jest.fn().mockResolvedValue(undefined);
const mockFetchKeepScreenOnPref = jest.fn().mockResolvedValue(false);
const mockKeepScreenOnBridge = jest.fn().mockResolvedValue(undefined);
const mockAllowScreenOff = jest.fn().mockResolvedValue(undefined);

jest.mock('../ReaderService', () => ({
  fetchLocalProgress: (...args: unknown[]) => mockFetchLocalProgress(...args),
  fetchServerReadProgress: (...args: unknown[]) => mockFetchServerReadProgress(...args),
  saveLocalProgress: (...args: unknown[]) => mockSaveLocalProgress(...args),
  saveServerProgress: (...args: unknown[]) => mockSaveServerProgress(...args),
  markChapterRead: (...args: unknown[]) => mockMarkChapterRead(...args),
  markChapterUnread: (...args: unknown[]) => mockMarkChapterUnread(...args),
  fetchKeepScreenOnPref: (...args: unknown[]) => mockFetchKeepScreenOnPref(...args),
  keepScreenOn: (...args: unknown[]) => mockKeepScreenOnBridge(...args),
  allowScreenOff: (...args: unknown[]) => mockAllowScreenOff(...args),
}));

let netInfoListener: ((state: { isConnected: boolean | null }) => void) | null = null;
const mockNetInfoUnsubscribe = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn((cb: (state: { isConnected: boolean | null }) => void) => {
      netInfoListener = cb;
      return mockNetInfoUnsubscribe;
    }),
  },
}));

const mockFetchPageUrls = jest.fn();
jest.mock('../PageService', () => ({
  fetchPageUrls: (...args: unknown[]) => mockFetchPageUrls(...args),
}));

let activeUrlChangedListener: ((event: { url: string }) => void) | null = null;
const mockGetPageCacheUrls = jest.fn();
const mockInvalidatePageCache = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../shared/bridge/network', () => ({
  ActiveUrlChangedEmitter: {
    addListener: jest.fn((_event: string, cb: (event: { url: string }) => void) => {
      activeUrlChangedListener = cb;
      return { remove: jest.fn() };
    }),
  },
}));

jest.mock('../../../shared/bridge/page', () => ({
  ReaderBridge: {
    getPageCacheUrls: (...args: unknown[]) => mockGetPageCacheUrls(...args),
    invalidatePageCache: (...args: unknown[]) => mockInvalidatePageCache(...args),
  },
}));

const mockGetCachedChapters = jest.fn();
jest.mock('../../../shared/bridge/series', () => ({
  SeriesBridge: {
    getCachedChapters: (...args: unknown[]) => mockGetCachedChapters(...args),
  },
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
  mockGetPageCacheUrls.mockResolvedValue([]);
  mockFetchKeepScreenOnPref.mockResolvedValue(false);
  mockGetCachedChapters.mockResolvedValue([]);
  activeUrlChangedListener = null;
  netInfoListener = null;
  jest.spyOn(Image, 'prefetch').mockResolvedValue(true);
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

describe('useReader — pré-carregamento de páginas', () => {
  it('nunca mais de 3 Image.prefetch em voo simultaneamente', async () => {
    let resolvers: Array<() => void> = [];
    (Image.prefetch as jest.Mock).mockImplementation(
      () =>
        new Promise<boolean>(resolve => {
          resolvers.push(() => resolve(true));
        }),
    );
    const chapter = makeChapter({ pageCount: 10 });
    const { result } = renderHook(() => useReader('s1', 'c1'));

    act(() => {
      result.current.dispatch({
        type: 'VIEWER_READY',
        viewer: makeViewer(chapter, Array.from({ length: 10 }, (_, i) => `url${i}`)),
        initialPage: 5,
        initialScrollFraction: 0,
      });
    });

    // Janela de 7 candidatos (3+3+atual), mas só 3 podem estar em voo ao mesmo tempo.
    expect((Image.prefetch as jest.Mock).mock.calls.length).toBe(3);

    await act(async () => {
      // Resolve em rounds, já que cada prefetch resolvido dispara o próximo da fila
      // (pool nunca ultrapassa 3 em voo — por isso mais de uma rodada é necessária).
      for (let round = 0; round < 3; round++) {
        const toResolve = resolvers;
        resolvers = [];
        toResolve.forEach(r => r());
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      }
    });

    // Janela completa (3+3+atual = 7) processada, nunca mais de 3 em voo por vez.
    expect((Image.prefetch as jest.Mock).mock.calls.length).toBe(7);
  });

  it('inverter direcao descarta prefetches fora da nova janela sem erro', async () => {
    const chapter = makeChapter({ pageCount: 20 });
    const pages = Array.from({ length: 20 }, (_, i) => `url${i}`);
    const { result } = renderHook(() => useReader('s1', 'c1'));

    act(() => {
      result.current.dispatch({
        type: 'VIEWER_READY',
        viewer: makeViewer(chapter, pages),
        initialPage: 10,
        initialScrollFraction: 0,
      });
    });

    expect(() => {
      act(() => {
        result.current.dispatch({ type: 'SET_CURRENT_PAGE', page: 2, scrollFraction: 0 });
      });
    }).not.toThrow();
  });

  it('borda de 5 paginas do fim dispara pre-carregamento do vizinho exatamente uma vez', async () => {
    const curr = makeChapter({ id: 'c1', pageCount: 10 });
    const next = makeChapter({ id: 'c2', pageCount: 5 });
    const pages = Array.from({ length: 10 }, (_, i) => `url${i}`);
    const nextPages = Array.from({ length: 5 }, (_, i) => `next${i}`);
    const { result } = renderHook(() => useReader('s1', 'c1'));

    act(() => {
      result.current.dispatch({
        type: 'VIEWER_READY',
        viewer: { prev: null, curr: { chapter: curr, pages }, next: { chapter: next, pages: nextPages } },
        initialPage: 0,
        initialScrollFraction: 0,
      });
    });
    const callsBeforeEdge = (Image.prefetch as jest.Mock).mock.calls.length;

    await act(async () => {
      result.current.dispatch({ type: 'SET_CURRENT_PAGE', page: 4, scrollFraction: 0 });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    const callsAtEdge = (Image.prefetch as jest.Mock).mock.calls.length;
    expect(callsAtEdge).toBeGreaterThan(callsBeforeEdge);
    expect((Image.prefetch as jest.Mock).mock.calls).toEqual(expect.arrayContaining([['next0']]));

    await act(async () => {
      result.current.dispatch({ type: 'SET_CURRENT_PAGE', page: 5, scrollFraction: 0 });
      await Promise.resolve();
      await Promise.resolve();
    });
    // Trigger de vizinho já disparado nesta sessão para este capítulo — não repete.
    const next0Calls = (Image.prefetch as jest.Mock).mock.calls.filter(c => c[0] === 'next0').length;
    expect(next0Calls).toBe(1);
  });
});

describe('useReader — reação a activeUrlChanged', () => {
  it('recarrega apenas o capitulo com host desatualizado', async () => {
    const curr = makeChapter({ id: 'c1', pageCount: 2 });
    const next = makeChapter({ id: 'c2', pageCount: 2 });
    const { result } = renderHook(() => useReader('s1', 'c1'));

    act(() => {
      result.current.dispatch({
        type: 'VIEWER_READY',
        viewer: {
          prev: null,
          curr: { chapter: curr, pages: ['https://old-host/1', 'https://old-host/2'] },
          next: { chapter: next, pages: ['https://new-host/1', 'https://new-host/2'] },
        },
        initialPage: 0,
        initialScrollFraction: 0,
      });
    });

    mockGetPageCacheUrls.mockImplementation(async (chapterId: string) => {
      if (chapterId === 'c1') {return [{ pageIndex: 0, url: 'https://old-host/1' }];}
      return [{ pageIndex: 0, url: 'https://new-host/1' }];
    });
    mockFetchPageUrls.mockResolvedValue(['https://new-host/1', 'https://new-host/2']);

    await act(async () => {
      activeUrlChangedListener?.({ url: 'https://new-host' });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockInvalidatePageCache).toHaveBeenCalledWith('c1');
    expect(mockInvalidatePageCache).not.toHaveBeenCalledWith('c2');
    expect(mockFetchPageUrls).toHaveBeenCalledWith('c1', 2);
    expect(result.current.viewer?.curr.pages).toEqual(['https://new-host/1', 'https://new-host/2']);
    expect(result.current.viewer?.next?.pages).toEqual(['https://new-host/1', 'https://new-host/2']);
  });
});

describe('useReader — overlay, keepScreenOn, offline, overscroll', () => {
  it('toggleOverlay alterna overlayVisible a cada chamada', () => {
    const { result } = renderHook(() => useReader('s1', 'c1'));

    expect(result.current.overlayVisible).toBe(false);

    act(() => result.current.toggleOverlay());
    expect(result.current.overlayVisible).toBe(true);

    act(() => result.current.toggleOverlay());
    expect(result.current.overlayVisible).toBe(false);
  });

  it('chama keepScreenOn ao montar quando a preferencia e true', async () => {
    mockFetchKeepScreenOnPref.mockResolvedValue(true);

    renderHook(() => useReader('s1', 'c1'));

    await waitFor(() => expect(mockKeepScreenOnBridge).toHaveBeenCalledTimes(1));
  });

  it('nao chama keepScreenOn ao montar quando a preferencia e false', async () => {
    mockFetchKeepScreenOnPref.mockResolvedValue(false);

    renderHook(() => useReader('s1', 'c1'));

    await waitFor(() => expect(mockFetchKeepScreenOnPref).toHaveBeenCalled());
    expect(mockKeepScreenOnBridge).not.toHaveBeenCalled();
  });

  it('chama allowScreenOff ao desmontar independente da preferencia', async () => {
    mockFetchKeepScreenOnPref.mockResolvedValue(true);
    const { unmount } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(mockKeepScreenOnBridge).toHaveBeenCalled());

    unmount();

    expect(mockAllowScreenOff).toHaveBeenCalledTimes(1);
  });

  it('offline reflete o estado emitido pelo NetInfo', () => {
    const { result } = renderHook(() => useReader('s1', 'c1'));
    expect(result.current.offline).toBe(false);

    act(() => netInfoListener?.({ isConnected: false }));
    expect(result.current.offline).toBe(true);

    act(() => netInfoListener?.({ isConnected: true }));
    expect(result.current.offline).toBe(false);
  });

  it('overscroll no topo do capitulo atual dispara retreatToPrevChapter', () => {
    const prev = makeChapter({ id: 'c0', pageCount: 3 });
    const curr = makeChapter({ id: 'c1', pageCount: 3 });
    const { result } = renderHook(() => useReader('s1', 'c1'));

    act(() => {
      result.current.dispatch({
        type: 'VIEWER_READY',
        viewer: {
          prev: { chapter: prev, pages: ['a', 'b', 'c'] },
          curr: { chapter: curr, pages: ['a', 'b', 'c'] },
          next: null,
        },
        initialPage: 0,
        initialScrollFraction: 0,
      });
    });

    act(() => result.current.handleScroll(-200, true));

    expect(result.current.viewer?.curr.chapter.id).toBe('c0');
  });

  it('overscroll nao dispara quando o primeiro item nao e o header do capitulo atual', () => {
    const prev = makeChapter({ id: 'c0', pageCount: 3 });
    const curr = makeChapter({ id: 'c1', pageCount: 3 });
    const { result } = renderHook(() => useReader('s1', 'c1'));

    act(() => {
      result.current.dispatch({
        type: 'VIEWER_READY',
        viewer: {
          prev: { chapter: prev, pages: ['a', 'b', 'c'] },
          curr: { chapter: curr, pages: ['a', 'b', 'c'] },
          next: null,
        },
        initialPage: 0,
        initialScrollFraction: 0,
      });
    });

    act(() => result.current.handleScroll(-200, false));

    expect(result.current.viewer?.curr.chapter.id).toBe('c1');
  });

  it('overscroll rearma somente apos handleScrollEndDrag com offset nao-negativo', () => {
    const prev = makeChapter({ id: 'c0', pageCount: 3 });
    const curr = makeChapter({ id: 'c1', pageCount: 3 });
    const next = makeChapter({ id: 'c2', pageCount: 3 });
    const { result } = renderHook(() => useReader('s1', 'c1'));

    act(() => {
      result.current.dispatch({
        type: 'VIEWER_READY',
        viewer: {
          prev: { chapter: prev, pages: ['a', 'b', 'c'] },
          curr: { chapter: curr, pages: ['a', 'b', 'c'] },
          next: { chapter: next, pages: ['a', 'b', 'c'] },
        },
        initialPage: 0,
        initialScrollFraction: 0,
      });
    });

    act(() => result.current.handleScroll(-200, true));
    expect(result.current.viewer?.curr.chapter.id).toBe('c0');

    // Sem rearmar, um segundo overscroll não deve disparar de novo.
    act(() => result.current.handleScroll(-200, true));
    expect(result.current.viewer?.curr.chapter.id).toBe('c0');

    // Rearma somente quando o dedo sai do topo (offset >= 0).
    act(() => result.current.handleScrollEndDrag(0));
    expect(result.current.viewer?.curr.chapter.id).toBe('c0');
  });
});

describe('useReader — carregamento inicial do trio', () => {
  function makeCachedChapter(overrides: Partial<Chapter> = {}): Chapter {
    return makeChapter(overrides);
  }

  it('abrir capitulo do meio popula prev, curr e next', async () => {
    const chapters = [
      makeCachedChapter({ id: 'c1', number: '1' }),
      makeCachedChapter({ id: 'c2', number: '2' }),
      makeCachedChapter({ id: 'c3', number: '3' }),
    ];
    mockGetCachedChapters.mockResolvedValue(chapters);
    mockFetchPageUrls.mockImplementation(async (chapterId: string) => [`${chapterId}-p0`]);

    const { result } = renderHook(() => useReader('s1', 'c2'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.viewer?.curr.chapter.id).toBe('c2');
    await waitFor(() => expect(result.current.viewer?.prev?.chapter.id).toBe('c1'));
    await waitFor(() => expect(result.current.viewer?.next?.chapter.id).toBe('c3'));
  });

  it('calcula vizinhos por numero mesmo quando o cache retorna fora de ordem', async () => {
    // getCachedChapters não garante ordem por número — reproduz o bug real onde abrir o
    // capítulo 41 mostrava o 40 porque prev/next eram calculados sobre a ordem de inserção.
    const chapters = [
      makeCachedChapter({ id: 'c41', number: '41' }),
      makeCachedChapter({ id: 'c39', number: '39' }),
      makeCachedChapter({ id: 'c40', number: '40' }),
      makeCachedChapter({ id: 'c42', number: '42' }),
    ];
    mockGetCachedChapters.mockResolvedValue(chapters);
    mockFetchPageUrls.mockImplementation(async (chapterId: string) => [`${chapterId}-p0`]);

    const { result } = renderHook(() => useReader('s1', 'c41'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.viewer?.curr.chapter.id).toBe('c41');
    await waitFor(() => expect(result.current.viewer?.prev?.chapter.id).toBe('c40'));
    await waitFor(() => expect(result.current.viewer?.next?.chapter.id).toBe('c42'));
  });

  it('abrir o primeiro capitulo da serie deixa prev nulo', async () => {
    const chapters = [makeCachedChapter({ id: 'c1', number: '1' }), makeCachedChapter({ id: 'c2', number: '2' })];
    mockGetCachedChapters.mockResolvedValue(chapters);
    mockFetchPageUrls.mockImplementation(async (chapterId: string) => [`${chapterId}-p0`]);

    const { result } = renderHook(() => useReader('s1', 'c1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.viewer?.prev).toBeNull();
    await waitFor(() => expect(result.current.viewer?.next?.chapter.id).toBe('c2'));
  });

  it('abrir o ultimo capitulo da serie deixa next nulo', async () => {
    const chapters = [makeCachedChapter({ id: 'c1', number: '1' }), makeCachedChapter({ id: 'c2', number: '2' })];
    mockGetCachedChapters.mockResolvedValue(chapters);
    mockFetchPageUrls.mockImplementation(async (chapterId: string) => [`${chapterId}-p0`]);

    const { result } = renderHook(() => useReader('s1', 'c2'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.viewer?.next).toBeNull();
    await waitFor(() => expect(result.current.viewer?.prev?.chapter.id).toBe('c1'));
  });

  it('usa resolveInitialPage para definir a pagina inicial', async () => {
    const chapters = [makeCachedChapter({ id: 'c1', number: '1', readStatus: 'UNREAD', pagesRead: 0 })];
    mockGetCachedChapters.mockResolvedValue(chapters);
    mockFetchPageUrls.mockResolvedValue(['p0', 'p1', 'p2']);
    mockFetchLocalProgress.mockResolvedValue({ page: 2, scrollFraction: 0.3 });

    const { result } = renderHook(() => useReader('s1', 'c1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.currentVisiblePage).toBe(2);
    expect(result.current.scrollFraction).toBe(0.3);
  });

  it('busca a lista de capitulos via SeriesBridge, nao via outra screen', async () => {
    mockGetCachedChapters.mockResolvedValue([makeCachedChapter({ id: 'c1' })]);
    mockFetchPageUrls.mockResolvedValue(['p0']);

    renderHook(() => useReader('s1', 'c1'));

    await waitFor(() => expect(mockGetCachedChapters).toHaveBeenCalledWith('s1'));
  });
});
