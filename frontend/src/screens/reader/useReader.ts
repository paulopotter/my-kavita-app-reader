import { useCallback, useEffect, useReducer, useRef } from 'react';
import { Image, PixelRatio, StatusBar } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { ActiveUrlChangedEmitter, ActiveUrlChangedEvent } from '../../shared/bridge/network';
import { ReaderBridge } from '../../shared/bridge/page';
import { Chapter, SeriesBridge } from '../../shared/bridge/series';
import {
  chapterNumberComparator,
  isChapterEffectivelyRead,
  resolveInitialPage,
  shouldUnmarkOnReread,
} from '../../shared/transforms/chapter';
import { ChapterWithPages, currChapterOf, isNearChapterEdge, pagePreloadOrder, ViewerChapters } from '../../shared/transforms/page';
import { fetchPageUrls } from './PageService';
import {
  allowScreenOff,
  fetchKeepScreenOnPref,
  fetchLocalProgress,
  fetchPageAspectRatios,
  fetchServerReadProgress,
  keepScreenOn as keepScreenOnBridge,
  markChapterRead,
  markChapterUnread,
  saveLocalProgress,
  saveServerProgress,
} from './ReaderService';

const LOCAL_SAVE_INTERVAL_MS = 2_000;
const SERVER_SYNC_INTERVAL_MS = 20_000;
const PRELOAD_WINDOW_RADIUS = 3;
const MAX_CONCURRENT_PREFETCH = 3;
const CHAPTER_EDGE_THRESHOLD = 5;
const OVERSCROLL_TRIGGER_DP = 72;

function urlHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export interface State {
  loading: boolean;
  error: string | null;
  viewer: ViewerChapters | null;
  overlayVisible: boolean;
  currentVisiblePage: number;
  scrollToPageRequest: number | null;
  scrollFraction: number;
  // Fração contínua do capítulo inteiro (não só da página atual) — só para a barra de progresso
  // visual, nunca persistida (saveLocalProgress/saveServerProgress continuam usando scrollFraction,
  // a fração dentro da página, que é o que já era salvo antes deste campo existir).
  chapterFraction: number;
  offline: boolean;
  isAdvancing: boolean;
}

export type Action =
  | { type: 'LOADING' }
  | { type: 'ERROR'; error: string }
  | { type: 'VIEWER_READY'; viewer: ViewerChapters; initialPage: number; initialScrollFraction: number }
  | { type: 'SET_VIEWER'; viewer: ViewerChapters; page: number; scrollFraction: number }
  | { type: 'UPDATE_VIEWER'; viewer: ViewerChapters }
  | { type: 'INSERT_PREV_NEIGHBOR'; viewer: ViewerChapters }
  | { type: 'SET_CURRENT_PAGE'; page: number; scrollFraction: number; chapterFraction: number }
  | { type: 'SCROLL_TO_PAGE'; page: number }
  | { type: 'SCROLL_TO_PAGE_HANDLED' }
  | { type: 'TOGGLE_OVERLAY' }
  | { type: 'SET_OFFLINE'; offline: boolean }
  | { type: 'OPTIMISTIC_MARK_READ'; chapterId: string }
  | { type: 'OPTIMISTIC_MARK_UNREAD'; chapterId: string }
  | { type: 'SET_ADVANCING'; isAdvancing: boolean };

function updateChapterReadStatusInViewer(
  viewer: ViewerChapters,
  chapterId: string,
  readStatus: Chapter['readStatus'],
): ViewerChapters {
  const applyTo = (entry: ViewerChapters['curr'] | null) => {
    if (!entry || entry.chapter.id !== chapterId) {return entry;}
    return {
      ...entry,
      chapter: {
        ...entry.chapter,
        readStatus,
        pagesRead: readStatus === 'READ' ? entry.chapter.pageCount : 0,
      },
    };
  };
  return {
    prev: applyTo(viewer.prev),
    curr: applyTo(viewer.curr) ?? viewer.curr,
    next: applyTo(viewer.next),
  };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null };
    case 'ERROR':
      return { ...state, loading: false, error: action.error };
    case 'VIEWER_READY':
      return {
        ...state,
        loading: false,
        error: null,
        viewer: action.viewer,
        currentVisiblePage: action.initialPage,
        scrollToPageRequest: action.initialPage,
        scrollFraction: action.initialScrollFraction,
      };
    case 'SET_VIEWER':
      // Usado por advanceToNextChapter/retreatToPrevChapter — troca de capítulo por scroll
      // natural do usuário, nunca deve reemitir scrollToPageRequest: a lista nativa (Kotlin)
      // já está posicionada onde o usuário rolou, identificando páginas por chapterId+pageIndex
      // (não índice absoluto), então não há nada para "reajustar" aqui — forçar um scroll
      // programático nesse momento é o que causava o salto pro topo do capítulo/página 0.
      return {
        ...state,
        viewer: action.viewer,
        currentVisiblePage: action.page,
        scrollFraction: action.scrollFraction,
        isAdvancing: false,
      };
    case 'UPDATE_VIEWER':
      return { ...state, viewer: action.viewer };
    case 'INSERT_PREV_NEIGHBOR':
      // Diferente da antiga FlashList por índice absoluto, a lista nativa (Kotlin) identifica
      // páginas por chapterId+pageIndex — inserir o bloco anterior não desloca nem invalida a
      // posição de leitura atual, então não há necessidade de reemitir scrollToPageRequest.
      return { ...state, viewer: action.viewer };
    case 'SET_CURRENT_PAGE':
      return {
        ...state,
        currentVisiblePage: action.page,
        scrollFraction: action.scrollFraction,
        chapterFraction: action.chapterFraction,
      };
    case 'SCROLL_TO_PAGE':
      return { ...state, currentVisiblePage: action.page, scrollToPageRequest: action.page };
    case 'SCROLL_TO_PAGE_HANDLED':
      return { ...state, scrollToPageRequest: null };
    case 'TOGGLE_OVERLAY':
      return { ...state, overlayVisible: !state.overlayVisible };
    case 'SET_OFFLINE':
      return { ...state, offline: action.offline };
    case 'OPTIMISTIC_MARK_READ':
      return state.viewer
        ? { ...state, viewer: updateChapterReadStatusInViewer(state.viewer, action.chapterId, 'READ') }
        : state;
    case 'OPTIMISTIC_MARK_UNREAD':
      return state.viewer
        ? { ...state, viewer: updateChapterReadStatusInViewer(state.viewer, action.chapterId, 'UNREAD') }
        : state;
    case 'SET_ADVANCING':
      return { ...state, isAdvancing: action.isAdvancing };
  }
}

export const initial: State = {
  loading: true,
  error: null,
  viewer: null,
  overlayVisible: false,
  currentVisiblePage: 0,
  scrollToPageRequest: null,
  scrollFraction: 0,
  chapterFraction: 0,
  offline: false,
  isAdvancing: false,
};

export function useReader(seriesId: string, chapterId: string) {
  const [state, dispatch] = useReducer(reducer, initial);

  const viewerRef = useRef<ViewerChapters | null>(null);
  viewerRef.current = state.viewer;
  const currentPageRef = useRef(0);
  currentPageRef.current = state.currentVisiblePage;
  const scrollFractionRef = useRef(0);
  scrollFractionRef.current = state.scrollFraction;

  const lastSyncedPageRef = useRef<Map<string, number>>(new Map());
  const suppressServerSyncRef = useRef<Set<string>>(new Set());
  const sessionMarkedReadRef = useRef<Set<string>>(new Set());
  const sessionUnmarkedRef = useRef<Set<string>>(new Set());
  const wasReadOnOpenRef = useRef<Map<string, boolean>>(new Map());

  const localTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const markAsReadIfNeeded = useCallback(async (chapter: Chapter, seriesId: string) => {
    if (sessionMarkedReadRef.current.has(chapter.id)) {return;}
    sessionMarkedReadRef.current.add(chapter.id);
    suppressServerSyncRef.current.add(chapter.id);
    dispatch({ type: 'OPTIMISTIC_MARK_READ', chapterId: chapter.id });
    try {
      await markChapterRead(seriesId, chapter.id);
    } catch {
      sessionMarkedReadRef.current.delete(chapter.id);
    }
  }, []);

  const unmarkIfRereading = useCallback(
    async (chapter: Chapter, seriesId: string, currentPage: number, totalPages: number) => {
      const wasReadOnOpen = wasReadOnOpenRef.current.get(chapter.id) ?? false;
      if (
        !shouldUnmarkOnReread(wasReadOnOpen, currentPage, totalPages, sessionUnmarkedRef.current.has(chapter.id))
      ) {
        return;
      }
      sessionUnmarkedRef.current.add(chapter.id);
      dispatch({ type: 'OPTIMISTIC_MARK_UNREAD', chapterId: chapter.id });
      try {
        await markChapterUnread(seriesId, chapter.id);
      } catch {
        sessionUnmarkedRef.current.delete(chapter.id);
      }
    },
    [],
  );

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) {return;}
    const curr = currChapterOf(viewer);
    if (!wasReadOnOpenRef.current.has(curr.chapter.id)) {
      wasReadOnOpenRef.current.set(curr.chapter.id, isChapterEffectivelyRead(curr.chapter));
    }
  }, [state.viewer]);

  useEffect(() => {
    const viewer = state.viewer;
    if (!viewer) {return undefined;}
    const curr = currChapterOf(viewer);
    const chapterId = curr.chapter.id;
    const seriesId = curr.chapter.seriesId;

    localTimerRef.current = setInterval(() => {
      saveLocalProgress(chapterId, seriesId, currentPageRef.current, scrollFractionRef.current).catch(() => {});
    }, LOCAL_SAVE_INTERVAL_MS);

    syncTimerRef.current = setInterval(() => {
      const page = currentPageRef.current;
      const lastSynced = lastSyncedPageRef.current.get(chapterId);
      if (page === lastSynced) {return;}
      if (suppressServerSyncRef.current.has(chapterId)) {return;}
      saveServerProgress(chapterId, seriesId, page)
        .then(() => lastSyncedPageRef.current.set(chapterId, page))
        .catch(() => {});
    }, SERVER_SYNC_INTERVAL_MS);

    return () => {
      if (localTimerRef.current) {clearInterval(localTimerRef.current);}
      if (syncTimerRef.current) {clearInterval(syncTimerRef.current);}
    };
  }, [state.viewer]);

  const lastProcessedPageChapterIdRef = useRef<string | null>(null);

  useEffect(() => {
    const viewer = state.viewer;
    if (!viewer) {return;}
    const curr = currChapterOf(viewer);
    // Desmarcação por releitura só reage a mudança de página vinda de interação real do
    // usuário — a página inicial (de resolveInitialPage) nunca dispara desmarcação sozinha,
    // senão reabrir um capítulo lido do início já o desmarcaria antes de qualquer scroll.
    const isFirstRenderOfChapter = lastProcessedPageChapterIdRef.current !== curr.chapter.id;
    lastProcessedPageChapterIdRef.current = curr.chapter.id;
    if (!isFirstRenderOfChapter) {
      unmarkIfRereading(curr.chapter, curr.chapter.seriesId, state.currentVisiblePage, curr.pages.length);
    }
    if (state.currentVisiblePage >= curr.pages.length - 1 && curr.pages.length > 0) {
      markAsReadIfNeeded(curr.chapter, curr.chapter.seriesId);
    }
  }, [state.viewer, state.currentVisiblePage, markAsReadIfNeeded, unmarkIfRereading]);

  const onScreenExit = useCallback(async () => {
    if (localTimerRef.current) {clearInterval(localTimerRef.current);}
    if (syncTimerRef.current) {clearInterval(syncTimerRef.current);}
    const viewer = viewerRef.current;
    if (!viewer) {return;}
    const curr = currChapterOf(viewer);
    saveLocalProgress(curr.chapter.id, curr.chapter.seriesId, currentPageRef.current, scrollFractionRef.current).catch(
      () => {},
    );
    if (!isChapterEffectivelyRead(curr.chapter)) {
      saveServerProgress(curr.chapter.id, curr.chapter.seriesId, currentPageRef.current).catch(() => {});
    }
  }, []);

  const fetchInitialProgressForChapter = useCallback(async (chapter: Chapter) => {
    const [local, server] = await Promise.all([
      fetchLocalProgress(chapter.id),
      fetchServerReadProgress(chapter.id),
    ]);
    return { local, server };
  }, []);

  const loadNeighbor = useCallback(async (side: 'prev' | 'next', chapter: Chapter | null) => {
    if (!chapter) {return;}
    console.log(`[Reader] loadNeighbor(${side}) start chapterId=${chapter.id} number=${chapter.number}`);
    const [pages, pageAspectRatios] = await Promise.all([
      fetchPageUrls(chapter.id, chapter.pageCount),
      fetchPageAspectRatios(chapter.id, chapter.pageCount),
    ]);
    const entry: ChapterWithPages = { chapter, pages, pageAspectRatios };
    const current = viewerRef.current;
    if (!current) {
      console.log(`[Reader] loadNeighbor(${side}) aborted: viewerRef is null`);
      return;
    }
    if (side === 'prev') {
      console.log(`[Reader] INSERT_PREV_NEIGHBOR chapterId=${chapter.id} pages=${pages.length}`);
      dispatch({ type: 'INSERT_PREV_NEIGHBOR', viewer: { ...current, prev: entry } });
    } else {
      console.log(`[Reader] UPDATE_VIEWER(next) chapterId=${chapter.id} pages=${pages.length}`);
      dispatch({ type: 'UPDATE_VIEWER', viewer: { ...current, next: entry } });
    }
  }, []);

  const latestRequestedChapterIdRef = useRef<string | null>(null);

  const loadInitialViewer = useCallback(
    async (targetChapterId: string) => {
      console.log(`[Reader] loadInitialViewer start targetChapterId=${targetChapterId} seriesId=${seriesId}`);
      latestRequestedChapterIdRef.current = targetChapterId;
      dispatch({ type: 'LOADING' });
      try {
        const unsortedChapters = await SeriesBridge.getCachedChapters(seriesId);
        // getCachedChapters não garante ordem por número — o cache local é ordenado por
        // rowid/inserção, não pela sequência de leitura. Vizinhos prev/next só fazem sentido
        // calculados sobre a lista ordenada por número de capítulo.
        const chapters = [...unsortedChapters].sort(chapterNumberComparator);
        const currIndex = chapters.findIndex(c => c.id === targetChapterId);
        if (currIndex === -1) {
          console.log(`[Reader] loadInitialViewer: chapter not found in cached list (len=${chapters.length})`);
          if (latestRequestedChapterIdRef.current === targetChapterId) {
            dispatch({ type: 'ERROR', error: 'Chapter not found' });
          }
          return;
        }
        const curr = chapters[currIndex];
        const prevChapter = currIndex > 0 ? chapters[currIndex - 1] : null;
        const nextChapter = currIndex < chapters.length - 1 ? chapters[currIndex + 1] : null;
        console.log(
          `[Reader] resolved curr=${curr.id}(n=${curr.number}) prev=${prevChapter?.id ?? 'null'}(n=${prevChapter?.number ?? '-'}) next=${nextChapter?.id ?? 'null'}(n=${nextChapter?.number ?? '-'})`,
        );

        const [currPages, currAspectRatios, currLocal, currServer] = await Promise.all([
          fetchPageUrls(curr.id, curr.pageCount),
          fetchPageAspectRatios(curr.id, curr.pageCount),
          fetchLocalProgress(curr.id),
          fetchServerReadProgress(curr.id),
        ]);
        // Se outra navegação de capítulo começou enquanto isto carregava, esta resposta
        // chegou tarde — aplicá-la sobrescreveria o capítulo certo com um antigo. Só o
        // resultado da requisição mais recente pode virar o viewer.
        if (latestRequestedChapterIdRef.current !== targetChapterId) {
          console.log(
            `[Reader] loadInitialViewer stale, discarding: targetChapterId=${targetChapterId} latest=${latestRequestedChapterIdRef.current}`,
          );
          return;
        }
        const initialProgress = resolveInitialPage(curr, currLocal, currServer);
        console.log(
          `[Reader] VIEWER_READY chapterId=${curr.id} pages=${currPages.length} initialPage=${initialProgress.page} scrollFraction=${initialProgress.scrollFraction}`,
        );
        const viewer: ViewerChapters = {
          prev: null,
          curr: { chapter: curr, pages: currPages, pageAspectRatios: currAspectRatios },
          next: null,
        };
        dispatch({
          type: 'VIEWER_READY',
          viewer,
          initialPage: initialProgress.page,
          initialScrollFraction: initialProgress.scrollFraction,
        });
        loadNeighbor('prev', prevChapter);
        loadNeighbor('next', nextChapter);
      } catch (e: unknown) {
        if (latestRequestedChapterIdRef.current !== targetChapterId) {return;}
        const message = e instanceof Error ? e.message : 'Unknown error';
        console.log(`[Reader] loadInitialViewer error: ${message}`);
        dispatch({ type: 'ERROR', error: message });
      }
    },
    [seriesId, loadNeighbor],
  );

  useEffect(() => {
    loadInitialViewer(chapterId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  const advanceToNextChapter = useCallback(async () => {
    const viewer = viewerRef.current;
    if (!viewer || !viewer.next || state.isAdvancing) {return;}
    dispatch({ type: 'SET_ADVANCING', isAdvancing: true });
    const curr = currChapterOf(viewer);
    saveLocalProgress(curr.chapter.id, curr.chapter.seriesId, currentPageRef.current, scrollFractionRef.current).catch(
      () => {},
    );
    await markAsReadIfNeeded(curr.chapter, curr.chapter.seriesId);
    const nextViewer: ViewerChapters = { prev: viewer.curr, curr: viewer.next, next: null };
    dispatch({ type: 'SET_VIEWER', viewer: nextViewer, page: 0, scrollFraction: 0 });
  }, [markAsReadIfNeeded, state.isAdvancing]);

  const retreatToPrevChapter = useCallback(async () => {
    const viewer = viewerRef.current;
    if (!viewer || !viewer.prev || state.isAdvancing) {return;}
    dispatch({ type: 'SET_ADVANCING', isAdvancing: true });
    const prevViewer: ViewerChapters = { prev: null, curr: viewer.prev, next: viewer.curr };
    dispatch({ type: 'SET_VIEWER', viewer: prevViewer, page: 0, scrollFraction: 0 });
  }, [state.isAdvancing]);

  const goToNextChapterManual = useCallback(async () => {
    await advanceToNextChapter();
  }, [advanceToNextChapter]);

  const goToPrevChapterManual = useCallback(async () => {
    await retreatToPrevChapter();
  }, [retreatToPrevChapter]);

  // ── Pré-carregamento de páginas ──────────────────────────────────────────
  const desiredPrefetchUrlsRef = useRef<Set<string>>(new Set());
  const inFlightPrefetchCountRef = useRef(0);
  const prefetchQueueRef = useRef<string[]>([]);

  const pumpPrefetchQueue = useCallback(() => {
    while (inFlightPrefetchCountRef.current < MAX_CONCURRENT_PREFETCH && prefetchQueueRef.current.length > 0) {
      const url = prefetchQueueRef.current.shift();
      if (!url) {break;}
      if (!desiredPrefetchUrlsRef.current.has(url)) {continue;}
      inFlightPrefetchCountRef.current++;
      Image.prefetch(url)
        .catch(() => {})
        .then(() => {
          inFlightPrefetchCountRef.current--;
          pumpPrefetchQueue();
        });
    }
  }, []);

  const preloadPages = useCallback(
    (pages: string[], currentIndex: number) => {
      const order = pagePreloadOrder(currentIndex, PRELOAD_WINDOW_RADIUS, pages.length);
      const desiredUrls = order.map(i => pages[i]);
      desiredPrefetchUrlsRef.current = new Set(desiredUrls);
      prefetchQueueRef.current = desiredUrls;
      pumpPrefetchQueue();
    },
    [pumpPrefetchQueue],
  );

  useEffect(() => {
    const viewer = state.viewer;
    if (!viewer) {return;}
    const curr = currChapterOf(viewer);
    preloadPages(curr.pages, state.currentVisiblePage);
  }, [state.viewer, state.currentVisiblePage, preloadPages]);

  const neighborPreloadTriggeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const viewer = state.viewer;
    if (!viewer) {return;}
    const curr = currChapterOf(viewer);
    const nearEdge = isNearChapterEdge(state.currentVisiblePage, curr.pages.length, CHAPTER_EDGE_THRESHOLD);
    if (!nearEdge) {return;}
    const neighbor = viewer.next;
    if (!neighbor || neighborPreloadTriggeredRef.current.has(neighbor.chapter.id)) {return;}
    neighborPreloadTriggeredRef.current.add(neighbor.chapter.id);
    preloadPages(neighbor.pages, 0);
  }, [state.viewer, state.currentVisiblePage, preloadPages]);

  // ── Reação a activeUrlChanged ────────────────────────────────────────────
  useEffect(() => {
    const sub = ActiveUrlChangedEmitter.addListener('activeUrlChanged', async (event: ActiveUrlChangedEvent) => {
      const viewer = viewerRef.current;
      if (!viewer) {return;}
      const entries = [viewer.prev, viewer.curr, viewer.next].filter(
        (e): e is ViewerChapters['curr'] => e != null,
      );
      const newHost = urlHost(event.url);
      for (const entry of entries) {
        const cached = await ReaderBridge.getPageCacheUrls(entry.chapter.id);
        const firstUrl = cached[0]?.url;
        if (!firstUrl || urlHost(firstUrl) === newHost) {continue;}
        await ReaderBridge.invalidatePageCache(entry.chapter.id);
        const freshUrls = await fetchPageUrls(entry.chapter.id, entry.chapter.pageCount);
        const updateEntry = (e: ViewerChapters['curr'] | null): ViewerChapters['curr'] | null =>
          e && e.chapter.id === entry.chapter.id ? { ...e, pages: freshUrls } : e;
        const current = viewerRef.current;
        if (!current) {continue;}
        dispatch({
          type: 'UPDATE_VIEWER',
          viewer: {
            prev: updateEntry(current.prev),
            curr: updateEntry(current.curr) ?? current.curr,
            next: updateEntry(current.next),
          },
        });
      }
    });
    return () => sub.remove();
  }, []);

  // ── Tela cheia (status bar) ──────────────────────────────────────────────
  useEffect(() => {
    StatusBar.setHidden(true, 'fade');
    return () => StatusBar.setHidden(false, 'fade');
  }, []);

  // ── Keep screen on ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetchKeepScreenOnPref()
      .then(enabled => {
        if (!cancelled && enabled) {keepScreenOnBridge().catch(() => {});}
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      allowScreenOff().catch(() => {});
    };
  }, []);

  // ── Offline ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(netState => {
      dispatch({ type: 'SET_OFFLINE', offline: netState.isConnected === false });
    });
    return () => unsubscribe();
  }, []);

  // ── Overscroll no topo (dispara loadPreviousChapter equivalente) ─────────
  const overscrollArmedRef = useRef(true);
  const overscrollTriggerPx = PixelRatio.getPixelSizeForLayoutSize(OVERSCROLL_TRIGGER_DP);

  const handleScroll = useCallback(
    (contentOffsetY: number, isFirstItemChapterHeader: boolean) => {
      if (contentOffsetY < -overscrollTriggerPx && isFirstItemChapterHeader && overscrollArmedRef.current) {
        overscrollArmedRef.current = false;
        retreatToPrevChapter();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overscrollTriggerPx],
  );

  const handleScrollEndDrag = useCallback((contentOffsetY: number) => {
    if (contentOffsetY >= 0) {
      overscrollArmedRef.current = true;
    }
  }, []);

  const toggleOverlay = useCallback(() => dispatch({ type: 'TOGGLE_OVERLAY' }), []);

  const scrollToPage = useCallback((page: number) => dispatch({ type: 'SCROLL_TO_PAGE', page }), []);

  const handleScrollToPageHandled = useCallback(() => dispatch({ type: 'SCROLL_TO_PAGE_HANDLED' }), []);

  const setCurrentPage = useCallback(
    (page: number, scrollFraction: number, chapterFraction: number) =>
      dispatch({ type: 'SET_CURRENT_PAGE', page, scrollFraction, chapterFraction }),
    [],
  );

  return {
    ...state,
    dispatch,
    toggleOverlay,
    scrollToPage,
    handleScrollToPageHandled,
    setCurrentPage,
    onScreenExit,
    fetchInitialProgressForChapter,
    markAsReadIfNeeded,
    unmarkIfRereading,
    advanceToNextChapter,
    retreatToPrevChapter,
    goToNextChapterManual,
    goToPrevChapterManual,
    handleScroll,
    handleScrollEndDrag,
    loadInitialViewer,
  };
}
