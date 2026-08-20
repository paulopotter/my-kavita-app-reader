import { act, renderHook, waitFor } from '@testing-library/react-native';
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
const mockFetchImmersiveModePref = jest.fn().mockResolvedValue(false);
const mockSetImmersiveMode = jest.fn().mockResolvedValue(undefined);
const mockFetchPageAspectRatios = jest.fn().mockResolvedValue([]);
const mockFetchSeriesName = jest.fn().mockResolvedValue('');

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
  fetchImmersiveModePref: (...args: unknown[]) => mockFetchImmersiveModePref(...args),
  setImmersiveMode: (...args: unknown[]) => mockSetImmersiveMode(...args),
  fetchPageAspectRatios: (...args: unknown[]) => mockFetchPageAspectRatios(...args),
  fetchSeriesName: (...args: unknown[]) => mockFetchSeriesName(...args),
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
  mockFetchImmersiveModePref.mockResolvedValue(false);
  mockSetImmersiveMode.mockResolvedValue(undefined);
  mockGetCachedChapters.mockResolvedValue([]);
  activeUrlChangedListener = null;
  netInfoListener = null;
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
    act(() => {
      result.current.dispatch({ type: 'SET_CURRENT_PAGE', page: 0, scrollFraction: 1, chapterFraction: 0.98 });
    });

    await waitFor(() => expect(mockMarkChapterRead).toHaveBeenCalledWith('s1', 'c1'));

    act(() => {
      jest.advanceTimersByTime(20_000);
    });
    expect(mockSaveServerProgress).not.toHaveBeenCalled();
  });
});

describe('useReader — marcação como lido', () => {
  it('nao marca como lido so por abrir na ultima pagina, sem confirmacao real de scroll', async () => {
    // A pagina inicial (resolveInitialPage) pode nascer na ultima pagina do array (ex: abrir
    // via continue-reading), mas isso nao significa que o usuario de fato rolou ate o fim —
    // so o chapterFraction (reportado pelo scroll real via onVisiblePageChanged) confirma isso.
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

    expect(mockMarkChapterRead).not.toHaveBeenCalled();
  });

  it('marca como lido quando chapterFraction atinge o threshold de 98%', async () => {
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
    act(() => {
      result.current.dispatch({ type: 'SET_CURRENT_PAGE', page: 0, scrollFraction: 1, chapterFraction: 0.98 });
    });

    await waitFor(() => expect(mockMarkChapterRead).toHaveBeenCalledWith('s1', 'c1'));
    expect(mockMarkChapterRead).toHaveBeenCalledTimes(1);
  });

  it('nao marca como lido abaixo do threshold de 98%', async () => {
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
    act(() => {
      result.current.dispatch({ type: 'SET_CURRENT_PAGE', page: 0, scrollFraction: 1, chapterFraction: 0.5 });
    });

    expect(mockMarkChapterRead).not.toHaveBeenCalled();
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
    act(() => {
      result.current.dispatch({ type: 'SET_CURRENT_PAGE', page: 0, scrollFraction: 1, chapterFraction: 0.98 });
    });
    await waitFor(() => expect(mockMarkChapterRead).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.dispatch({ type: 'SET_CURRENT_PAGE', page: 0, scrollFraction: 1, chapterFraction: 1 });
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
    act(() => {
      result.current.dispatch({ type: 'SET_CURRENT_PAGE', page: 0, scrollFraction: 1, chapterFraction: 0.98 });
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

  it('avancar para o proximo capitulo nao reemite scrollToPageRequest', async () => {
    // advanceToNextChapter é disparado pelo scroll natural do usuário (a lista nativa já está
    // posicionada onde ele rolou) — reemitir scrollToPageRequest aqui forçava um salto
    // programático de volta para a página 0 do novo capítulo, cancelando a continuidade visual
    // do scroll (bug real: "a imagem pula pro topo" ao cruzar para o próximo capítulo).
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
    act(() => {
      result.current.handleScrollToPageHandled();
    });
    expect(result.current.scrollToPageRequest).toBeNull();

    await act(async () => {
      await result.current.advanceToNextChapter();
    });

    expect(result.current.scrollToPageRequest).toBeNull();
  });

  it('avancar manualmente (seta do overlay) recarrega o proximo capitulo do zero e reemite scrollToPageRequest', async () => {
    // Bug real: apertar a seta "próximo capítulo" no overlay trocava o estado (título, capítulo
    // atual) mas a lista nativa nunca era instruída a rolar — a tela ficava fisicamente parada no
    // capítulo anterior, e o overlay/scroll infinito quebravam. goToNextChapterManual agora
    // recarrega o capítulo do zero via loadInitialViewer (mesmo caminho da abertura da tela),
    // que reconstrói prev/curr/next atomicamente e reemite scrollToPageRequest corretamente.
    const chapters = [
      makeChapter({ id: 'c1', number: '1' }),
      makeChapter({ id: 'c2', number: '2' }),
      makeChapter({ id: 'c3', number: '3' }),
    ];
    mockGetCachedChapters.mockResolvedValue(chapters);
    mockFetchPageUrls.mockImplementation(async (chapterId: string) => [`${chapterId}-p0`]);
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.viewer?.curr.chapter.id).toBe('c1'));
    await waitFor(() => expect(result.current.viewer?.next?.chapter.id).toBe('c2'));

    await act(async () => {
      await result.current.goToNextChapterManual();
    });

    await waitFor(() => expect(result.current.viewer?.curr.chapter.id).toBe('c2'));
    expect(result.current.scrollToPageRequest).toBe(0);
  });

  it('avancar manualmente ignora "continuar de onde parei" salvo no proximo capitulo — sempre vai para a primeira pagina', async () => {
    // Bug real: a seta ia para a página salva de "continue lendo" daquele capítulo (via
    // resolveInitialPage/fetchLocalProgress/fetchServerReadProgress) em vez de sempre ir para a
    // primeira página — deixando o overlay/progress bar "avançados" mesmo o usuário nunca tendo
    // rolado o novo capítulo.
    const chapters = [
      makeChapter({ id: 'c1', number: '1' }),
      makeChapter({ id: 'c2', number: '2', pageCount: 13 }),
    ];
    mockGetCachedChapters.mockResolvedValue(chapters);
    mockFetchPageUrls.mockImplementation(async (chapterId: string) => Array.from({ length: 13 }, (_, i) => `${chapterId}-p${i}`));
    mockFetchLocalProgress.mockImplementation(async (chapterId: string) =>
      chapterId === 'c2' ? { page: 11, scrollFraction: 0 } : null,
    );
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.viewer?.next?.chapter.id).toBe('c2'));

    await act(async () => {
      await result.current.goToNextChapterManual();
    });

    await waitFor(() => expect(result.current.viewer?.curr.chapter.id).toBe('c2'));
    expect(result.current.currentVisiblePage).toBe(0);
    expect(result.current.scrollToPageRequest).toBe(0);
    expect(result.current.chapterFraction).toBe(0);
  });

  it('retroceder manualmente ignora "continuar de onde parei" salvo no capitulo anterior — sempre vai para a primeira pagina', async () => {
    const chapters = [
      makeChapter({ id: 'c1', number: '1', pageCount: 5 }),
      makeChapter({ id: 'c2', number: '2' }),
    ];
    mockGetCachedChapters.mockResolvedValue(chapters);
    mockFetchPageUrls.mockImplementation(async (chapterId: string) => Array.from({ length: 5 }, (_, i) => `${chapterId}-p${i}`));
    mockFetchLocalProgress.mockImplementation(async (chapterId: string) =>
      chapterId === 'c1' ? { page: 4, scrollFraction: 0 } : null,
    );
    const { result } = renderHook(() => useReader('s1', 'c2'));
    await waitFor(() => expect(result.current.viewer?.prev?.chapter.id).toBe('c1'));

    await act(async () => {
      await result.current.goToPrevChapterManual();
    });

    await waitFor(() => expect(result.current.viewer?.curr.chapter.id).toBe('c1'));
    expect(result.current.currentVisiblePage).toBe(0);
    expect(result.current.scrollToPageRequest).toBe(0);
  });

  it('avancar manualmente reseta chapterFraction — nao fica preso no valor do capitulo anterior', async () => {
    // Bug real relatado após o fix anterior: a seta trocava de capítulo corretamente, mas o
    // overlay/progress bar continuavam mostrando o progresso do capítulo ANTERIOR (chapterFraction
    // só é atualizado pelo Kotlin no próximo onVisiblePageChanged real, que pode demorar ou nunca
    // chegar se o topo do novo capítulo já está visível sem novo scroll).
    const chapters = [
      makeChapter({ id: 'c1', number: '1' }),
      makeChapter({ id: 'c2', number: '2' }),
    ];
    mockGetCachedChapters.mockResolvedValue(chapters);
    mockFetchPageUrls.mockImplementation(async (chapterId: string) => [`${chapterId}-p0`, `${chapterId}-p1`]);
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.viewer?.next?.chapter.id).toBe('c2'));
    act(() => {
      result.current.dispatch({ type: 'SET_CURRENT_PAGE', page: 1, scrollFraction: 0.95, chapterFraction: 0.97 });
    });
    expect(result.current.chapterFraction).toBe(0.97);

    await act(async () => {
      await result.current.goToNextChapterManual();
    });

    await waitFor(() => expect(result.current.viewer?.curr.chapter.id).toBe('c2'));
    expect(result.current.chapterFraction).toBeLessThan(0.97);
  });

  it('retroceder manualmente (seta do overlay) recarrega o capitulo anterior do zero e reemite scrollToPageRequest', async () => {
    const chapters = [
      makeChapter({ id: 'c1', number: '1' }),
      makeChapter({ id: 'c2', number: '2' }),
      makeChapter({ id: 'c3', number: '3' }),
    ];
    mockGetCachedChapters.mockResolvedValue(chapters);
    mockFetchPageUrls.mockImplementation(async (chapterId: string) => [`${chapterId}-p0`]);
    const { result } = renderHook(() => useReader('s1', 'c2'));
    await waitFor(() => expect(result.current.viewer?.curr.chapter.id).toBe('c2'));
    await waitFor(() => expect(result.current.viewer?.prev?.chapter.id).toBe('c1'));

    await act(async () => {
      await result.current.goToPrevChapterManual();
    });

    await waitFor(() => expect(result.current.viewer?.curr.chapter.id).toBe('c1'));
    expect(result.current.scrollToPageRequest).toBe(0);
  });

  it('avancar manualmente nao marca o capitulo atual como lido se nao atingiu 98% do progresso', async () => {
    const chapters = [
      makeChapter({ id: 'c1', number: '1' }),
      makeChapter({ id: 'c2', number: '2' }),
    ];
    mockGetCachedChapters.mockResolvedValue(chapters);
    mockFetchPageUrls.mockImplementation(async (chapterId: string) => [`${chapterId}-p0`]);
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.viewer?.next?.chapter.id).toBe('c2'));

    await act(async () => {
      await result.current.goToNextChapterManual();
    });

    await waitFor(() => expect(result.current.viewer?.curr.chapter.id).toBe('c2'));
    expect(mockMarkChapterRead).not.toHaveBeenCalled();
  });

  it('avancar manualmente marca o capitulo atual como lido quando ja atingiu 98% do progresso', async () => {
    const chapters = [
      makeChapter({ id: 'c1', number: '1' }),
      makeChapter({ id: 'c2', number: '2' }),
    ];
    mockGetCachedChapters.mockResolvedValue(chapters);
    mockFetchPageUrls.mockImplementation(async (chapterId: string) => [`${chapterId}-p0`]);
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.viewer?.next?.chapter.id).toBe('c2'));
    act(() => {
      result.current.dispatch({ type: 'SET_CURRENT_PAGE', page: 0, scrollFraction: 1, chapterFraction: 0.99 });
    });

    await act(async () => {
      await result.current.goToNextChapterManual();
    });

    expect(mockMarkChapterRead).toHaveBeenCalledWith('s1', 'c1');
    await waitFor(() => expect(result.current.viewer?.curr.chapter.id).toBe('c2'));
  });

  it('retroceder manualmente nao marca o capitulo atual como lido', async () => {
    const chapters = [
      makeChapter({ id: 'c1', number: '1' }),
      makeChapter({ id: 'c2', number: '2' }),
    ];
    mockGetCachedChapters.mockResolvedValue(chapters);
    mockFetchPageUrls.mockImplementation(async (chapterId: string) => [`${chapterId}-p0`]);
    const { result } = renderHook(() => useReader('s1', 'c2'));
    await waitFor(() => expect(result.current.viewer?.prev?.chapter.id).toBe('c1'));

    await act(async () => {
      await result.current.goToPrevChapterManual();
    });

    expect(mockMarkChapterRead).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.viewer?.curr.chapter.id).toBe('c1'));
  });

  it('retroceder via scroll natural reflete a posicao real reportada (nao trava em 0)', async () => {
    // Bug real: ao rolar para cima e entrar no capitulo anterior, o usuario ja esta fisicamente
    // na ultima pagina dele — retreatToPrevChapter hardcoded para page:0/scrollFraction:0
    // ignorava a posicao real do evento onVisiblePageChanged que disparou a troca, deixando o
    // overlay (nome do capitulo/bolinhas) e a barra de progresso presos mostrando o inicio do
    // capitulo, já que nenhum novo evento de scroll chegaria (o usuario não se moveu mais).
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
        initialPage: 0,
        initialScrollFraction: 0,
      });
    });

    await act(async () => {
      await result.current.retreatToPrevChapter(4, 0.9, 0.95);
    });

    expect(result.current.viewer?.curr.chapter.id).toBe('c0');
    expect(result.current.currentVisiblePage).toBe(4);
    expect(result.current.scrollFraction).toBe(0.9);
    expect(result.current.chapterFraction).toBe(0.95);
  });

  it('avancar via scroll natural reflete a posicao real reportada (nao trava em 0)', async () => {
    const curr = makeChapter({ id: 'c1', pageCount: 5 });
    const next = makeChapter({ id: 'c2', pageCount: 5 });
    const { result } = renderHook(() => useReader('s1', 'c1'));

    act(() => {
      result.current.dispatch({
        type: 'VIEWER_READY',
        viewer: {
          prev: null,
          curr: { chapter: curr, pages: ['a', 'b', 'c', 'd', 'e'] },
          next: { chapter: next, pages: ['a', 'b', 'c', 'd', 'e'] },
        },
        initialPage: 4,
        initialScrollFraction: 1,
      });
    });

    await act(async () => {
      await result.current.advanceToNextChapter(1, 0.3, 0.25);
    });

    expect(result.current.viewer?.curr.chapter.id).toBe('c2');
    expect(result.current.currentVisiblePage).toBe(1);
    expect(result.current.scrollFraction).toBe(0.3);
    expect(result.current.chapterFraction).toBe(0.25);
  });

  it('avancar busca o novo next (nao deixa a seta seguinte presa em null)', async () => {
    // Bug real: avancar de c1 para c2 deixava o novo next como null (nunca buscava c3), o que
    // travava a seta de "proximo capitulo" mesmo havendo mais capitulos na serie — reportado ao
    // navegar em cadeia (ex: cap 67 -> 66 -> deveria continuar ate 65, mas a seta ficava presa).
    const chapters = [
      makeChapter({ id: 'c1', number: '1' }),
      makeChapter({ id: 'c2', number: '2' }),
      makeChapter({ id: 'c3', number: '3' }),
    ];
    mockGetCachedChapters.mockResolvedValue(chapters);
    mockFetchPageUrls.mockImplementation(async (chapterId: string) => [`${chapterId}-p0`]);

    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.viewer?.next?.chapter.id).toBe('c2'));

    await act(async () => {
      await result.current.advanceToNextChapter();
    });

    expect(result.current.viewer?.curr.chapter.id).toBe('c2');
    await waitFor(() => expect(result.current.viewer?.next?.chapter.id).toBe('c3'));
  });

  it('retroceder busca o novo prev (nao deixa a seta anterior presa em null)', async () => {
    const chapters = [
      makeChapter({ id: 'c1', number: '1' }),
      makeChapter({ id: 'c2', number: '2' }),
      makeChapter({ id: 'c3', number: '3' }),
    ];
    mockGetCachedChapters.mockResolvedValue(chapters);
    mockFetchPageUrls.mockImplementation(async (chapterId: string) => [`${chapterId}-p0`]);

    const { result } = renderHook(() => useReader('s1', 'c3'));
    await waitFor(() => expect(result.current.viewer?.prev?.chapter.id).toBe('c2'));

    await act(async () => {
      await result.current.retreatToPrevChapter();
    });

    expect(result.current.viewer?.curr.chapter.id).toBe('c2');
    await waitFor(() => expect(result.current.viewer?.prev?.chapter.id).toBe('c1'));
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

  it('ativa modo imersivo ao montar quando a preferencia e true', async () => {
    mockFetchImmersiveModePref.mockResolvedValue(true);

    renderHook(() => useReader('s1', 'c1'));

    await waitFor(() => expect(mockSetImmersiveMode).toHaveBeenCalledWith(true));
  });

  it('nao ativa modo imersivo ao montar quando a preferencia e false', async () => {
    mockFetchImmersiveModePref.mockResolvedValue(false);

    renderHook(() => useReader('s1', 'c1'));

    await waitFor(() => expect(mockFetchImmersiveModePref).toHaveBeenCalled());
    expect(mockSetImmersiveMode).not.toHaveBeenCalledWith(true);
  });

  it('desativa modo imersivo ao desmontar independente da preferencia', async () => {
    mockFetchImmersiveModePref.mockResolvedValue(true);
    const { unmount } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(mockSetImmersiveMode).toHaveBeenCalledWith(true));

    unmount();

    expect(mockSetImmersiveMode).toHaveBeenCalledWith(false);
  });

  it('offline reflete o estado emitido pelo NetInfo', () => {
    const { result } = renderHook(() => useReader('s1', 'c1'));
    expect(result.current.offline).toBe(false);

    act(() => netInfoListener?.({ isConnected: false }));
    expect(result.current.offline).toBe(true);

    act(() => netInfoListener?.({ isConnected: true }));
    expect(result.current.offline).toBe(false);
  });

  it('overscroll no topo do capitulo atual dispara retreatToPrevChapter (recarrega do zero)', async () => {
    const chapters = [
      makeChapter({ id: 'c0', number: '0' }),
      makeChapter({ id: 'c1', number: '1' }),
    ];
    mockGetCachedChapters.mockResolvedValue(chapters);
    mockFetchPageUrls.mockImplementation(async (chapterId: string) => [`${chapterId}-p0`]);
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.viewer?.prev?.chapter.id).toBe('c0'));

    await act(async () => {
      result.current.handleScroll(-200, true);
    });

    await waitFor(() => expect(result.current.viewer?.curr.chapter.id).toBe('c0'));
  });

  it('overscroll nao dispara quando o primeiro item nao e o header do capitulo atual', async () => {
    const chapters = [
      makeChapter({ id: 'c0', number: '0' }),
      makeChapter({ id: 'c1', number: '1' }),
    ];
    mockGetCachedChapters.mockResolvedValue(chapters);
    mockFetchPageUrls.mockImplementation(async (chapterId: string) => [`${chapterId}-p0`]);
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.viewer?.prev?.chapter.id).toBe('c0'));

    act(() => result.current.handleScroll(-200, false));

    expect(result.current.viewer?.curr.chapter.id).toBe('c1');
  });

  it('overscroll rearma somente apos handleScrollEndDrag com offset nao-negativo', async () => {
    const chapters = [
      makeChapter({ id: 'c0', number: '0' }),
      makeChapter({ id: 'c1', number: '1' }),
      makeChapter({ id: 'c2', number: '2' }),
    ];
    mockGetCachedChapters.mockResolvedValue(chapters);
    mockFetchPageUrls.mockImplementation(async (chapterId: string) => [`${chapterId}-p0`]);
    const { result } = renderHook(() => useReader('s1', 'c1'));
    await waitFor(() => expect(result.current.viewer?.prev?.chapter.id).toBe('c0'));

    await act(async () => {
      result.current.handleScroll(-200, true);
    });
    await waitFor(() => expect(result.current.viewer?.curr.chapter.id).toBe('c0'));

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

  it('inserir o vizinho prev nao reemite scrollToPageRequest', async () => {
    // A lista nativa (Kotlin) identifica páginas por chapterId+pageIndex, não por índice
    // absoluto — diferente da antiga FlashList, inserir o bloco do capítulo anterior não
    // desloca nem invalida a posição de leitura atual. Reemitir scrollToPageRequest aqui
    // causava um bug real: a lista pulava de volta para o topo do capítulo atual toda vez
    // que o vizinho prev terminava de carregar, cancelando o scroll natural do usuário.
    const chapters = [
      makeCachedChapter({ id: 'c40', number: '40' }),
      makeCachedChapter({ id: 'c41', number: '41' }),
    ];
    mockGetCachedChapters.mockResolvedValue(chapters);

    let resolveC40PageUrls: (urls: string[]) => void = () => {};
    mockFetchPageUrls.mockImplementation(async (chapterId: string) => {
      if (chapterId === 'c40') {
        return new Promise<string[]>(resolve => {
          resolveC40PageUrls = resolve;
        });
      }
      return [`${chapterId}-p0`, `${chapterId}-p1`];
    });

    const { result } = renderHook(() => useReader('s1', 'c41'));

    await waitFor(() => expect(result.current.viewer?.curr.chapter.id).toBe('c41'));

    // Simula a ReaderScreen consumindo o pedido de scroll inicial (scrollToIndex + handled),
    // antes da resposta assíncrona do vizinho prev (c40) chegar.
    act(() => {
      result.current.handleScrollToPageHandled();
    });
    expect(result.current.scrollToPageRequest).toBeNull();

    await act(async () => {
      resolveC40PageUrls(['c40-p0', 'c40-p1']);
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.viewer?.prev?.chapter.id).toBe('c40'));
    expect(result.current.scrollToPageRequest).toBeNull();
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

  it('resposta tardia de um capitulo antigo nao sobrescreve o capitulo mais recente', async () => {
    // Reproduz o bug real: abrir o capitulo 41 e, antes da carga terminar, a navegacao
    // trocar (ou uma carga anterior do 40 ainda estar em voo) — se o 40 responder DEPOIS
    // do 41, sem guard o estado final ficaria mostrando o 40 mesmo tendo aberto o 41.
    const chapters = [
      makeCachedChapter({ id: 'c40', number: '40' }),
      makeCachedChapter({ id: 'c41', number: '41' }),
    ];
    mockGetCachedChapters.mockResolvedValue(chapters);

    let resolveC40PageUrls: (urls: string[]) => void = () => {};
    mockFetchPageUrls.mockImplementation(async (chapterId: string) => {
      if (chapterId === 'c40') {
        return new Promise<string[]>(resolve => {
          resolveC40PageUrls = resolve;
        });
      }
      return [`${chapterId}-p0`];
    });

    const { result, rerender } = renderHook(({ chapterId }) => useReader('s1', chapterId), {
      initialProps: { chapterId: 'c40' },
    });

    rerender({ chapterId: 'c41' });

    await waitFor(() => expect(result.current.viewer?.curr.chapter.id).toBe('c41'));

    await act(async () => {
      resolveC40PageUrls(['c40-p0']);
      await Promise.resolve();
    });

    // A resposta tardia do c40 precisa ser descartada — o viewer deve continuar no c41.
    expect(result.current.viewer?.curr.chapter.id).toBe('c41');
  });
});
