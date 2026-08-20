import { useCallback, useEffect, useReducer, useRef } from 'react';
import { PixelRatio } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { ActiveUrlChangedEmitter, ActiveUrlChangedEvent } from '../../shared/bridge/network';
import { ReaderBridge } from '../../shared/bridge/page';
import { Chapter, SeriesBridge } from '../../shared/bridge/series';
import {
  chapterNumberComparator,
  isChapterEffectivelyRead,
  READ_THRESHOLD_FRACTION,
  resolveInitialPage,
  shouldUnmarkOnReread,
} from '../../shared/transforms/chapter';
import { ChapterWithPages, currChapterOf, ViewerChapters } from '../../shared/transforms/page';
import { fetchPageUrls } from './PageService';
import {
  allowScreenOff,
  fetchImmersiveModePref,
  fetchKeepScreenOnPref,
  fetchLocalProgress,
  fetchPageAspectRatios,
  fetchServerReadProgress,
  fetchSeriesName,
  keepScreenOn as keepScreenOnBridge,
  markChapterRead,
  markChapterUnread,
  saveLocalProgress,
  saveServerProgress,
  setImmersiveMode,
} from './ReaderService';

const LOCAL_SAVE_INTERVAL_MS = 2_000;
const SERVER_SYNC_INTERVAL_MS = 20_000;
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
  seriesName: string;
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
  | { type: 'VIEWER_READY'; viewer: ViewerChapters; initialPage: number; initialScrollFraction: number; initialChapterFraction?: number }
  | { type: 'SET_VIEWER'; viewer: ViewerChapters; page: number; scrollFraction: number; chapterFraction: number }
  | { type: 'UPDATE_VIEWER'; viewer: ViewerChapters }
  | { type: 'INSERT_PREV_NEIGHBOR'; viewer: ViewerChapters }
  | { type: 'SET_CURRENT_PAGE'; page: number; scrollFraction: number; chapterFraction: number }
  | { type: 'SCROLL_TO_PAGE'; page: number }
  | { type: 'SCROLL_TO_PAGE_HANDLED' }
  | { type: 'SERIES_NAME_LOADED'; seriesName: string }
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
        // Aproximação por página/pageCount (o Kotlin ainda não mediu a altura real das páginas
        // deste capítulo) — evita que o overlay/progress bar fiquem presos mostrando o valor do
        // capítulo anterior até o primeiro onVisiblePageChanged real chegar; é corrigida no
        // primeiro evento de scroll assim que a lista nativa mede o layout.
        chapterFraction: action.initialChapterFraction ?? 0,
      };
    case 'SET_VIEWER':
      // Usado só por advanceToNextChapter/retreatToPrevChapter reagindo a scroll NATURAL do
      // usuário (via onVisiblePageChanged) — nunca reemite scrollToPageRequest: a lista nativa
      // (Kotlin) já está posicionada onde o usuário rolou, identificando páginas por
      // chapterId+pageIndex (não índice absoluto), então não há nada para "reajustar" — forçar um
      // scroll programático nesse momento é o que causava o salto pro topo do capítulo/página 0.
      // Navegação MANUAL (setas do overlay) não passa mais por aqui — ver goToNextChapterManual/
      // goToPrevChapterManual, que recarregam o capítulo do zero via loadInitialViewer (mesmo
      // caminho testado da abertura inicial da tela), evitando as races deste reducer incremental.
      return {
        ...state,
        viewer: action.viewer,
        currentVisiblePage: action.page,
        scrollFraction: action.scrollFraction,
        chapterFraction: action.chapterFraction,
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
    case 'SERIES_NAME_LOADED':
      return { ...state, seriesName: action.seriesName };
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
  seriesName: '',
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

  // Lista de capítulos da série ordenada por número, preenchida em loadInitialViewer — permite
  // que advanceToNextChapter/retreatToPrevChapter descubram o novo vizinho que ficou faltando
  // após deslizar o trio (ex: ao retroceder do 67 pro 66, o novo prev é o 65, não null) sem
  // precisar rebuscar a lista inteira a cada troca de capítulo.
  const orderedChaptersRef = useRef<Chapter[]>([]);

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
    if (curr.pages.length > 0 && state.chapterFraction >= READ_THRESHOLD_FRACTION) {
      markAsReadIfNeeded(curr.chapter, curr.chapter.seriesId);
    }
  }, [state.viewer, state.currentVisiblePage, state.chapterFraction, markAsReadIfNeeded, unmarkIfRereading]);

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

  // Chamado logo após advanceToNextChapter/retreatToPrevChapter deslizarem o trio — o lado que
  // ficou null (o novo next ao avançar, o novo prev ao retroceder) precisa ser buscado de novo
  // usando orderedChaptersRef, senão a seta correspondente fica presa desabilitada mesmo
  // havendo mais capítulos naquela direção (ex: sair do 67 pro 66 deixava prev=null, sem nunca
  // buscar o 65, mesmo ele existindo).
  const loadMissingNeighbor = useCallback(
    (side: 'prev' | 'next', currentChapterId: string) => {
      const chapters = orderedChaptersRef.current;
      const currIndex = chapters.findIndex(c => c.id === currentChapterId);
      if (currIndex === -1) {return;}
      const neighbor = side === 'prev' ? chapters[currIndex - 1] : chapters[currIndex + 1];
      loadNeighbor(side, neighbor ?? null);
    },
    [loadNeighbor],
  );

  const latestRequestedChapterIdRef = useRef<string | null>(null);

  const loadInitialViewer = useCallback(
    async (targetChapterId: string, startAtBeginning = false) => {
      console.log(`[Reader] loadInitialViewer start targetChapterId=${targetChapterId} seriesId=${seriesId} startAtBeginning=${startAtBeginning}`);
      latestRequestedChapterIdRef.current = targetChapterId;
      dispatch({ type: 'LOADING' });
      try {
        const unsortedChapters = await SeriesBridge.getCachedChapters(seriesId);
        // getCachedChapters não garante ordem por número — o cache local é ordenado por
        // rowid/inserção, não pela sequência de leitura. Vizinhos prev/next só fazem sentido
        // calculados sobre a lista ordenada por número de capítulo.
        const chapters = [...unsortedChapters].sort(chapterNumberComparator);
        orderedChaptersRef.current = chapters;
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

        // Navegação manual (setas do overlay/overscroll) sempre vai para a primeira página do
        // capítulo, ignorando "continuar de onde parei" — só a abertura inicial da tela (vinda da
        // listagem de capítulos) deve respeitar progresso salvo. Pular fetchLocalProgress/
        // fetchServerReadProgress nesse caso também evita uma leitura desnecessária.
        const [currPages, currAspectRatios, currLocal, currServer] = await Promise.all([
          fetchPageUrls(curr.id, curr.pageCount),
          fetchPageAspectRatios(curr.id, curr.pageCount),
          startAtBeginning ? Promise.resolve(null) : fetchLocalProgress(curr.id),
          startAtBeginning ? Promise.resolve(null) : fetchServerReadProgress(curr.id),
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
        const initialProgress = startAtBeginning ? { page: 0, scrollFraction: 0 } : resolveInitialPage(curr, currLocal, currServer);
        console.log(
          `[Reader] VIEWER_READY chapterId=${curr.id} pages=${currPages.length} initialPage=${initialProgress.page} scrollFraction=${initialProgress.scrollFraction}`,
        );
        const viewer: ViewerChapters = {
          prev: null,
          curr: { chapter: curr, pages: currPages, pageAspectRatios: currAspectRatios },
          next: null,
        };
        // Aproximação só para não mostrar o valor do capítulo ANTERIOR no overlay/progress bar
        // até o Kotlin medir o layout real e reportar o primeiro onVisiblePageChanged — nunca
        // deve por si só cruzar READ_THRESHOLD_FRACTION (98%), ou reabrir um capítulo de poucas
        // páginas dispararia mark-read antes do usuário ter de fato lido nada dele.
        const initialChapterFraction = currPages.length > 1
          ? Math.min(0.9, (initialProgress.page + initialProgress.scrollFraction) / (currPages.length - 1))
          : 0;
        dispatch({
          type: 'VIEWER_READY',
          viewer,
          initialPage: initialProgress.page,
          initialScrollFraction: initialProgress.scrollFraction,
          initialChapterFraction,
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

  useEffect(() => {
    let cancelled = false;
    fetchSeriesName(seriesId)
      .then(name => {
        if (!cancelled) {dispatch({ type: 'SERIES_NAME_LOADED', seriesName: name });}
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [seriesId]);

  // page/scrollFraction/chapterFraction: posição real reportada pelo onVisiblePageChanged que
  // disparou esta troca de trio (scroll natural do usuário, que já está fisicamente rolado até
  // essa página do novo capítulo) — nunca reajustar para 0 nesse caso, ou o overlay/barra de
  // progresso ficam presos mostrando a posição do capítulo anterior até o próximo evento de
  // scroll chegar (o que pode nunca acontecer, já que o usuário não se moveu mais). Este caminho
  // só é usado por scroll NATURAL (onVisiblePageChanged/overscroll) — navegação manual pelas
  // setas do overlay usa goToNextChapterManual/goToPrevChapterManual (abaixo), que recarrega o
  // capítulo do zero via loadInitialViewer, não este reducer incremental.
  const advanceToNextChapter = useCallback(
    async (page = 0, scrollFraction = 0, chapterFraction = 0) => {
      const viewer = viewerRef.current;
      if (!viewer || !viewer.next || state.isAdvancing) {return;}
      dispatch({ type: 'SET_ADVANCING', isAdvancing: true });
      const curr = currChapterOf(viewer);
      saveLocalProgress(curr.chapter.id, curr.chapter.seriesId, currentPageRef.current, scrollFractionRef.current).catch(
        () => {},
      );
      if (state.chapterFraction >= READ_THRESHOLD_FRACTION) {
        await markAsReadIfNeeded(curr.chapter, curr.chapter.seriesId);
      }
      const nextViewer: ViewerChapters = { prev: viewer.curr, curr: viewer.next, next: null };
      dispatch({ type: 'SET_VIEWER', viewer: nextViewer, page, scrollFraction, chapterFraction });
      loadMissingNeighbor('next', nextViewer.curr.chapter.id);
    },
    [markAsReadIfNeeded, state.isAdvancing, state.chapterFraction, loadMissingNeighbor],
  );

  const retreatToPrevChapter = useCallback(
    async (page = 0, scrollFraction = 0, chapterFraction = 0) => {
      const viewer = viewerRef.current;
      if (!viewer || !viewer.prev || state.isAdvancing) {return;}
      dispatch({ type: 'SET_ADVANCING', isAdvancing: true });
      const prevViewer: ViewerChapters = { prev: null, curr: viewer.prev, next: viewer.curr };
      dispatch({ type: 'SET_VIEWER', viewer: prevViewer, page, scrollFraction, chapterFraction });
      loadMissingNeighbor('prev', prevViewer.curr.chapter.id);
    },
    [state.isAdvancing, loadMissingNeighbor],
  );

  // Navegação manual (setas do overlay): recarrega o capítulo vizinho do zero pelo mesmo caminho
  // usado para abrir a tela (loadInitialViewer) — reconstrói prev/curr/next atomicamente a partir
  // de orderedChaptersRef e dispatcha VIEWER_READY, que já seta scrollToPageRequest corretamente.
  // Evita a classe de bugs do reducer incremental (SET_VIEWER): overlay/progress bar presos no
  // capítulo antigo, scroll físico nunca disparado, cliques perdidos por causa de
  // loadMissingNeighbor ainda em voo.
  const goToNextChapterManual = useCallback(async () => {
    const viewer = viewerRef.current;
    if (!viewer?.next) {return;}
    const curr = currChapterOf(viewer);
    saveLocalProgress(curr.chapter.id, curr.chapter.seriesId, currentPageRef.current, scrollFractionRef.current).catch(
      () => {},
    );
    if (state.chapterFraction >= READ_THRESHOLD_FRACTION) {
      await markAsReadIfNeeded(curr.chapter, curr.chapter.seriesId);
    }
    // startAtBeginning=true: seta sempre vai para a primeira página do capítulo, ignorando
    // "continuar de onde parei" daquele capítulo (só a abertura inicial da tela respeita isso).
    await loadInitialViewer(viewer.next.chapter.id, true);
  }, [loadInitialViewer, markAsReadIfNeeded, state.chapterFraction]);

  const goToPrevChapterManual = useCallback(async () => {
    const viewer = viewerRef.current;
    if (!viewer?.prev) {return;}
    const curr = currChapterOf(viewer);
    saveLocalProgress(curr.chapter.id, curr.chapter.seriesId, currentPageRef.current, scrollFractionRef.current).catch(
      () => {},
    );
    if (state.chapterFraction >= READ_THRESHOLD_FRACTION) {
      await markAsReadIfNeeded(curr.chapter, curr.chapter.seriesId);
    }
    await loadInitialViewer(viewer.prev.chapter.id, true);
  }, [loadInitialViewer, markAsReadIfNeeded, state.chapterFraction]);

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

  // ── Modo imersivo (esconde status bar + nav bar, sticky) ─────────────────
  useEffect(() => {
    let cancelled = false;
    fetchImmersiveModePref()
      .then(enabled => {
        if (!cancelled && enabled) {setImmersiveMode(true).catch(() => {});}
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      setImmersiveMode(false).catch(() => {});
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
        // Overscroll é o usuário puxando além do topo do capítulo atual — ele nunca chegou a
        // rolar fisicamente para dentro do capítulo anterior (diferente do scroll natural
        // cruzando a fronteira), então precisa do mesmo caminho "recarrega do zero" que a
        // navegação manual usa (ver goToPrevChapterManual).
        goToPrevChapterManual();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overscrollTriggerPx, goToPrevChapterManual],
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
