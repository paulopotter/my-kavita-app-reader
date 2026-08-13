import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Chapter,
  ChapterSortMode,
  ChapterSortPrefs,
  SeriesDetail,
  SeriesFollowedEmitter,
  SeriesMetadata,
} from '../../shared/bridge/series';
import { sortChapters } from '../../shared/transforms/chapter';
import { computeContinueChapter } from '../../shared/transforms/series';
import {
  fetchCachedChapters,
  fetchChapters,
  fetchSeriesDetail,
  fetchSeriesMetadata,
  getChapterSortPrefs,
  getSeriesSortPrefs,
  markChaptersRead,
  markChaptersUnread,
  replaceCachedChapters,
  resetSeriesSortPrefs,
  setSeriesSortPrefs,
  toggleFollow as bridgeToggleFollow,
} from './SeriesDetailService';

const REFRESH_WINDOW_MS = 2 * 60 * 1000;
const LOCAL_UPDATE_TOLERANCE_MS = 30 * 1000;
const SORT_CYCLE: ChapterSortMode[] = ['ASCENDING', 'DESCENDING', 'AUTO_FIXED', 'AUTO_PROGRESS'];

export interface State {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  detail: SeriesDetail | null;
  metadata: SeriesMetadata | null;
  chapters: Chapter[];
  isFollowed: boolean;
  sortMode: ChapterSortMode;
  sortFixedThreshold?: number;
  sortProgressPercent: number;
  // true quando a série tem um override de sort próprio (salvo via modal),
  // que tem prioridade sobre a preferência global do app.
  hasSeriesSortOverride: boolean;
  selectionMode: boolean;
  selectedIds: Set<string>;
}

export type Action =
  | { type: 'LOADING' }
  | { type: 'REFRESHING' }
  | { type: 'ERROR'; error: string }
  | { type: 'CHAPTERS_LOADED'; chapters: Chapter[]; sortMode: ChapterSortMode; fixedThreshold?: number; progressPercent: number }
  | { type: 'DETAIL_LOADED'; detail: SeriesDetail }
  | { type: 'METADATA_LOADED'; metadata: SeriesMetadata }
  | { type: 'SORT_PREFS_LOADED'; mode: ChapterSortMode; fixedThreshold?: number; progressPercent: number; hasSeriesOverride: boolean }
  | { type: 'SET_FOLLOWED'; isFollowed: boolean }
  | { type: 'SET_SORT_MODE'; mode: ChapterSortMode }
  | { type: 'SET_SORT_PREFS'; mode: ChapterSortMode; fixedThreshold?: number; progressPercent: number; hasSeriesOverride: boolean }
  | { type: 'UPDATE_CHAPTERS_READ_STATUS'; ids: string[]; readStatus: Chapter['readStatus']; nowMs: number }
  | { type: 'LONG_PRESS'; chapterId: string }
  | { type: 'CLICK'; chapterId: string }
  | { type: 'SELECT_ALL' }
  | { type: 'INVERT_SELECTION' }
  | { type: 'EXIT_SELECTION' };

function applySort(chapters: Chapter[], mode: ChapterSortMode, fixedThreshold: number | undefined, progressPercent: number): Chapter[] {
  return sortChapters(chapters, mode, fixedThreshold, progressPercent);
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null };
    case 'REFRESHING':
      return { ...state, refreshing: true, error: null };
    case 'ERROR':
      return { ...state, loading: false, refreshing: false, error: action.error };
    case 'CHAPTERS_LOADED': {
      const sorted = applySort(action.chapters, action.sortMode, action.fixedThreshold, action.progressPercent);
      return { ...state, loading: false, refreshing: false, error: null, chapters: sorted };
    }
    case 'DETAIL_LOADED':
      return { ...state, detail: action.detail };
    case 'METADATA_LOADED':
      return { ...state, metadata: action.metadata };
    case 'SORT_PREFS_LOADED':
      return {
        ...state,
        sortMode: action.mode,
        sortFixedThreshold: action.fixedThreshold,
        sortProgressPercent: action.progressPercent,
        hasSeriesSortOverride: action.hasSeriesOverride,
        chapters: applySort(state.chapters, action.mode, action.fixedThreshold, action.progressPercent),
      };
    case 'SET_FOLLOWED':
      return { ...state, isFollowed: action.isFollowed };
    case 'SET_SORT_MODE':
      return {
        ...state,
        sortMode: action.mode,
        chapters: applySort(state.chapters, action.mode, state.sortFixedThreshold, state.sortProgressPercent),
      };
    case 'SET_SORT_PREFS':
      return {
        ...state,
        sortMode: action.mode,
        sortFixedThreshold: action.fixedThreshold,
        sortProgressPercent: action.progressPercent,
        hasSeriesSortOverride: action.hasSeriesOverride,
        chapters: applySort(state.chapters, action.mode, action.fixedThreshold, action.progressPercent),
      };
    case 'UPDATE_CHAPTERS_READ_STATUS': {
      const idSet = new Set(action.ids);
      const updated = state.chapters.map(c => {
        if (!idSet.has(c.id)) return c;
        return {
          ...c,
          readStatus: action.readStatus,
          pagesRead: action.readStatus === 'READ' ? c.pageCount : 0,
          updatedAtLocalMs: action.nowMs,
        };
      });
      return { ...state, chapters: applySort(updated, state.sortMode, state.sortFixedThreshold, state.sortProgressPercent) };
    }
    case 'LONG_PRESS':
      return { ...state, selectionMode: true, selectedIds: new Set([action.chapterId]) };
    case 'CLICK': {
      if (!state.selectionMode) return state;
      const next = new Set(state.selectedIds);
      if (next.has(action.chapterId)) next.delete(action.chapterId);
      else next.add(action.chapterId);
      return { ...state, selectedIds: next, selectionMode: next.size > 0 };
    }
    case 'SELECT_ALL':
      return { ...state, selectedIds: new Set(state.chapters.map(c => c.id)) };
    case 'INVERT_SELECTION': {
      const next = new Set(state.chapters.filter(c => !state.selectedIds.has(c.id)).map(c => c.id));
      return { ...state, selectedIds: next, selectionMode: next.size > 0 };
    }
    case 'EXIT_SELECTION':
      return { ...state, selectionMode: false, selectedIds: new Set() };
  }
}

export const initial: State = {
  loading: true,
  refreshing: false,
  error: null,
  detail: null,
  metadata: null,
  chapters: [],
  isFollowed: false,
  sortMode: 'ASCENDING',
  sortFixedThreshold: undefined,
  sortProgressPercent: 50,
  hasSeriesSortOverride: false,
  selectionMode: false,
  selectedIds: new Set(),
};

export function useSeriesDetail(seriesId: string) {
  const [state, dispatch] = useReducer(reducer, initial);
  const lastFetchMsRef = useRef(0);
  const chaptersRef = useRef<Chapter[]>([]);
  chaptersRef.current = state.chapters;
  const sortPrefsRef = useRef({ mode: state.sortMode, fixedThreshold: state.sortFixedThreshold, progressPercent: state.sortProgressPercent });
  sortPrefsRef.current = { mode: state.sortMode, fixedThreshold: state.sortFixedThreshold, progressPercent: state.sortProgressPercent };

  const loadStatic = useCallback(async (): Promise<ChapterSortPrefs | null> => {
    try {
      const [detail, metadata, globalPrefs, seriesOverride] = await Promise.all([
        fetchSeriesDetail(seriesId),
        fetchSeriesMetadata(seriesId),
        getChapterSortPrefs(),
        getSeriesSortPrefs(seriesId),
      ]);
      dispatch({ type: 'DETAIL_LOADED', detail });
      dispatch({ type: 'METADATA_LOADED', metadata });
      // Override da série (salvo via modal) tem prioridade sobre o global.
      const effective = seriesOverride ?? globalPrefs;
      dispatch({
        type: 'SORT_PREFS_LOADED',
        mode: effective.mode,
        fixedThreshold: effective.fixedThreshold,
        progressPercent: effective.progressPercent,
        hasSeriesOverride: seriesOverride !== null,
      });
      return effective;
    } catch {
      // Non-fatal: header renders with partial data
      return null;
    }
  }, [seriesId]);

  const syncChapters = useCallback(async (prefs: { mode: ChapterSortMode; fixedThreshold?: number; progressPercent: number }) => {
    try {
      const remote = await fetchChapters(seriesId);
      const now = Date.now();
      const local = chaptersRef.current;
      const merged = remote.map(r => {
        const localMatch = local.find(l => l.id === r.id);
        if (localMatch?.updatedAtLocalMs && now - localMatch.updatedAtLocalMs < LOCAL_UPDATE_TOLERANCE_MS) {
          return localMatch;
        }
        return r;
      });
      await replaceCachedChapters(seriesId, merged);
      lastFetchMsRef.current = now;
      dispatch({
        type: 'CHAPTERS_LOADED',
        chapters: merged,
        sortMode: prefs.mode,
        fixedThreshold: prefs.fixedThreshold,
        progressPercent: prefs.progressPercent,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      dispatch({ type: 'ERROR', error: msg });
    }
  }, [seriesId]);

  const load = useCallback(async (
    prefs: { mode: ChapterSortMode; fixedThreshold?: number; progressPercent: number },
    forceRefresh = false,
  ) => {
    dispatch({ type: 'LOADING' });
    try {
      const cached = await fetchCachedChapters(seriesId);
      if (cached.length > 0) {
        dispatch({
          type: 'CHAPTERS_LOADED',
          chapters: cached,
          sortMode: prefs.mode,
          fixedThreshold: prefs.fixedThreshold,
          progressPercent: prefs.progressPercent,
        });
      }
      const now = Date.now();
      const withinWindow = !forceRefresh && now - lastFetchMsRef.current < REFRESH_WINDOW_MS;
      if (!withinWindow) {
        await syncChapters(prefs);
      } else if (cached.length === 0) {
        dispatch({ type: 'CHAPTERS_LOADED', chapters: [], sortMode: prefs.mode, fixedThreshold: prefs.fixedThreshold, progressPercent: prefs.progressPercent });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      dispatch({ type: 'ERROR', error: msg });
    }
  }, [seriesId, syncChapters]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const prefs = await loadStatic();
      if (cancelled) return;
      const effectivePrefs = prefs ?? { mode: initial.sortMode, fixedThreshold: initial.sortFixedThreshold, progressPercent: initial.sortProgressPercent };
      await load(effectivePrefs, false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId]);

  useFocusEffect(
    useCallback(() => {
      syncChapters(sortPrefsRef.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seriesId]),
  );

  useEffect(() => {
    const sub = SeriesFollowedEmitter.addListener('seriesFollowedIds', (ids: string[]) => {
      dispatch({ type: 'SET_FOLLOWED', isFollowed: ids.includes(seriesId) });
    });
    return () => sub.remove();
  }, [seriesId]);

  const refresh = useCallback(async () => {
    dispatch({ type: 'REFRESHING' });
    await syncChapters(sortPrefsRef.current);
  }, [syncChapters]);

  const markRead = useCallback(async (chapterIds: string[]) => {
    const now = Date.now();
    dispatch({ type: 'UPDATE_CHAPTERS_READ_STATUS', ids: chapterIds, readStatus: 'READ', nowMs: now });
    replaceCachedChapters(seriesId, chaptersRef.current).catch(() => {});
    markChaptersRead(seriesId, chapterIds).catch(() => {
      // Optimistic update stands; network failure will retry via sync queue
    });
  }, [seriesId]);

  const markUnread = useCallback(async (chapterIds: string[]) => {
    const now = Date.now();
    dispatch({ type: 'UPDATE_CHAPTERS_READ_STATUS', ids: chapterIds, readStatus: 'UNREAD', nowMs: now });
    replaceCachedChapters(seriesId, chaptersRef.current).catch(() => {});
    markChaptersUnread(seriesId, chapterIds).catch(() => {
      // Optimistic update stands; network failure will retry via sync queue
    });
  }, [seriesId]);

  const toggleFollow = useCallback(async () => {
    dispatch({ type: 'SET_FOLLOWED', isFollowed: !state.isFollowed });
    try {
      await bridgeToggleFollow(seriesId);
    } catch {
      dispatch({ type: 'SET_FOLLOWED', isFollowed: state.isFollowed });
    }
  }, [seriesId, state.isFollowed]);

  // Toggle rápido é sempre temporário: só altera o estado da sessão atual,
  // nunca persiste. A preferência salva (override da série ou global) só
  // muda via updateSortPrefs (modal de configuração), e volta a valer na
  // próxima vez que a tela abrir.
  const toggleSortOrder = useCallback(() => {
    const currentIndex = SORT_CYCLE.indexOf(state.sortMode);
    const nextMode = SORT_CYCLE[(currentIndex + 1) % SORT_CYCLE.length];
    dispatch({ type: 'SET_SORT_MODE', mode: nextMode });
  }, [state.sortMode]);

  // Modal de configuração grava um override FIXO só desta série — tem
  // prioridade sobre a preferência global do app (que fica em Ajustes).
  const updateSortPrefs = useCallback(async (mode: ChapterSortMode, fixedThreshold: number | undefined, progressPercent: number) => {
    dispatch({ type: 'SET_SORT_PREFS', mode, fixedThreshold, progressPercent, hasSeriesOverride: true });
    setSeriesSortPrefs(seriesId, mode, fixedThreshold, progressPercent).catch(() => {});
  }, [seriesId]);

  // Remove o override desta série e volta a respeitar a preferência global.
  const resetSortPrefs = useCallback(async () => {
    try {
      await resetSeriesSortPrefs(seriesId);
      const globalPrefs = await getChapterSortPrefs();
      dispatch({
        type: 'SET_SORT_PREFS',
        mode: globalPrefs.mode,
        fixedThreshold: globalPrefs.fixedThreshold,
        progressPercent: globalPrefs.progressPercent,
        hasSeriesOverride: false,
      });
    } catch {
      // Non-fatal: mantém o estado atual se o reset falhar
    }
  }, [seriesId]);

  const onChapterLongPress = useCallback((chapterId: string) => {
    dispatch({ type: 'LONG_PRESS', chapterId });
  }, []);

  const onChapterClick = useCallback((chapterId: string) => {
    dispatch({ type: 'CLICK', chapterId });
  }, []);

  const selectAll = useCallback(() => dispatch({ type: 'SELECT_ALL' }), []);
  const invertSelection = useCallback(() => dispatch({ type: 'INVERT_SELECTION' }), []);
  const exitSelectionMode = useCallback(() => dispatch({ type: 'EXIT_SELECTION' }), []);

  const continueChapter = useMemo(() => computeContinueChapter(state.chapters), [state.chapters]);

  return {
    ...state,
    continueChapter,
    refresh,
    markRead,
    markUnread,
    toggleFollow,
    toggleSortOrder,
    updateSortPrefs,
    resetSortPrefs,
    onChapterLongPress,
    onChapterClick,
    selectAll,
    invertSelection,
    exitSelectionMode,
  };
}

export type ChapterSortPreferences = ChapterSortPrefs;
