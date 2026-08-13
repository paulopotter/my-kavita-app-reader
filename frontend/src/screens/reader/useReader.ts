import { useCallback, useEffect, useReducer, useRef } from 'react';
import { Chapter } from '../../shared/bridge/series';
import { isChapterEffectivelyRead, shouldUnmarkOnReread } from '../../shared/transforms/chapter';
import { currChapterOf, ViewerChapters } from '../../shared/transforms/page';
import {
  fetchLocalProgress,
  fetchServerReadProgress,
  markChapterRead,
  markChapterUnread,
  saveLocalProgress,
  saveServerProgress,
} from './ReaderService';

const LOCAL_SAVE_INTERVAL_MS = 2_000;
const SERVER_SYNC_INTERVAL_MS = 20_000;

export interface State {
  loading: boolean;
  error: string | null;
  viewer: ViewerChapters | null;
  overlayVisible: boolean;
  currentVisiblePage: number;
  scrollToPageRequest: number | null;
  scrollFraction: number;
  offline: boolean;
  isAdvancing: boolean;
}

export type Action =
  | { type: 'LOADING' }
  | { type: 'ERROR'; error: string }
  | { type: 'VIEWER_READY'; viewer: ViewerChapters; initialPage: number; initialScrollFraction: number }
  | { type: 'SET_VIEWER'; viewer: ViewerChapters; page: number; scrollFraction: number }
  | { type: 'SET_CURRENT_PAGE'; page: number; scrollFraction: number }
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
    if (!entry || entry.chapter.id !== chapterId) return entry;
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
      return {
        ...state,
        viewer: action.viewer,
        currentVisiblePage: action.page,
        scrollToPageRequest: action.page,
        scrollFraction: action.scrollFraction,
        isAdvancing: false,
      };
    case 'SET_CURRENT_PAGE':
      return { ...state, currentVisiblePage: action.page, scrollFraction: action.scrollFraction };
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
  offline: false,
  isAdvancing: false,
};

export function useReader(_seriesId: string, _chapterId: string) {
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
    if (sessionMarkedReadRef.current.has(chapter.id)) return;
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
    if (!viewer) return;
    const curr = currChapterOf(viewer);
    if (!wasReadOnOpenRef.current.has(curr.chapter.id)) {
      wasReadOnOpenRef.current.set(curr.chapter.id, isChapterEffectivelyRead(curr.chapter));
    }
  }, [state.viewer]);

  useEffect(() => {
    const viewer = state.viewer;
    if (!viewer) return undefined;
    const curr = currChapterOf(viewer);
    const chapterId = curr.chapter.id;
    const seriesId = curr.chapter.seriesId;

    localTimerRef.current = setInterval(() => {
      saveLocalProgress(chapterId, seriesId, currentPageRef.current, scrollFractionRef.current).catch(() => {});
    }, LOCAL_SAVE_INTERVAL_MS);

    syncTimerRef.current = setInterval(() => {
      const page = currentPageRef.current;
      const lastSynced = lastSyncedPageRef.current.get(chapterId);
      if (page === lastSynced) return;
      if (suppressServerSyncRef.current.has(chapterId)) return;
      saveServerProgress(chapterId, seriesId, page)
        .then(() => lastSyncedPageRef.current.set(chapterId, page))
        .catch(() => {});
    }, SERVER_SYNC_INTERVAL_MS);

    return () => {
      if (localTimerRef.current) clearInterval(localTimerRef.current);
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [state.viewer]);

  const lastProcessedPageChapterIdRef = useRef<string | null>(null);

  useEffect(() => {
    const viewer = state.viewer;
    if (!viewer) return;
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
    if (localTimerRef.current) clearInterval(localTimerRef.current);
    if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    const viewer = viewerRef.current;
    if (!viewer) return;
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

  const advanceToNextChapter = useCallback(async () => {
    const viewer = viewerRef.current;
    if (!viewer || !viewer.next || state.isAdvancing) return;
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
    if (!viewer || !viewer.prev || state.isAdvancing) return;
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

  const toggleOverlay = useCallback(() => dispatch({ type: 'TOGGLE_OVERLAY' }), []);

  const scrollToPage = useCallback((page: number) => dispatch({ type: 'SCROLL_TO_PAGE', page }), []);

  const handleScrollToPageHandled = useCallback(() => dispatch({ type: 'SCROLL_TO_PAGE_HANDLED' }), []);

  const setCurrentPage = useCallback(
    (page: number, scrollFraction: number) => dispatch({ type: 'SET_CURRENT_PAGE', page, scrollFraction }),
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
  };
}
