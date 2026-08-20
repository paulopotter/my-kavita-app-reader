import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { ConfigRepository } from '../../shared/bridge/config';
import { LibrarySortMode, LibraryViewMode, SeriesSummary } from '../../shared/bridge/library';
import { SeriesFollowedEmitter, SeriesProgressChangedEmitter, SeriesProgressChangedEvent } from '../../shared/bridge/series';
import { useAppShellState } from '../../shared/components/AppShellState';
import { fetchSeries, syncBff, toggleFollow as bridgeToggleFollow } from './LibraryService';

export interface UseLibraryOptions {
  filter?: (s: SeriesSummary) => boolean;
  prefsKey?: 'library' | 'following';
}

interface State {
  loading: boolean;
  data: SeriesSummary[];
  error: string | null;
  viewMode: LibraryViewMode;
  sortMode: LibrarySortMode;
}

type Action =
  | { type: 'LOADING' }
  | { type: 'LOADED'; data: SeriesSummary[] }
  | { type: 'ERROR'; error: string }
  | { type: 'SET_VIEW_MODE'; mode: LibraryViewMode }
  | { type: 'SET_SORT_MODE'; mode: LibrarySortMode }
  | { type: 'TOGGLE_FOLLOW'; seriesId: number }
  | { type: 'SET_FOLLOWED_IDS'; ids: string[] }
  | { type: 'PROGRESS_CHANGED'; event: SeriesProgressChangedEvent };

function sortSeries(data: SeriesSummary[], mode: LibrarySortMode): SeriesSummary[] {
  if (mode === 'ALPHABETICAL') {
    return [...data].sort((a, b) => a.name.localeCompare(b.name));
  }
  // RECENTLY_UPDATED: descending by lastChapterAddedUtc, fallback to name
  return [...data].sort((a, b) => {
    const ta = a.lastChapterAddedUtc ? new Date(a.lastChapterAddedUtc).getTime() : 0;
    const tb = b.lastChapterAddedUtc ? new Date(b.lastChapterAddedUtc).getTime() : 0;
    if (tb !== ta) return tb - ta;
    return a.name.localeCompare(b.name);
  });
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null };
    case 'LOADED':
      return { ...state, loading: false, data: sortSeries(action.data, state.sortMode), error: null };
    case 'ERROR':
      return { ...state, loading: false, error: action.error };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode };
    case 'SET_SORT_MODE':
      return { ...state, sortMode: action.mode, data: sortSeries(state.data, action.mode) };
    case 'TOGGLE_FOLLOW':
      return {
        ...state,
        data: state.data.map(s =>
          s.id === action.seriesId ? { ...s, isFollowed: !s.isFollowed } : s,
        ),
      };
    case 'SET_FOLLOWED_IDS': {
      const followedIds = new Set(action.ids);
      return {
        ...state,
        data: state.data.map(s => ({ ...s, isFollowed: followedIds.has(String(s.id)) })),
      };
    }
    case 'PROGRESS_CHANGED': {
      const { seriesId, progressFraction, readChapters, chapterCount } = action.event;
      const readStatus = readChapters <= 0 ? 'UNREAD' : readChapters >= chapterCount ? 'READ' : 'IN_PROGRESS';
      return {
        ...state,
        data: state.data.map(s =>
          String(s.id) === seriesId ? { ...s, progressFraction, readChapters, chapterCount, readStatus } : s,
        ),
      };
    }
  }
}

const initial: State = {
  loading: true,
  data: [],
  error: null,
  viewMode: 'GRID',
  sortMode: 'RECENTLY_UPDATED',
};

export function useLibrary({ filter, prefsKey = 'library' }: UseLibraryOptions = {}) {
  const [state, dispatch] = useReducer(reducer, initial);
  const { refresh: refreshShell } = useAppShellState();

  const viewModeKey = prefsKey === 'following' ? 'followingViewMode' : 'libraryViewMode';
  const sortModeKey = prefsKey === 'following' ? 'followingSortMode' : 'librarySortMode';

  // Load persisted viewMode + sortMode on mount
  useEffect(() => {
    ConfigRepository.getUiPreferences().then(prefs => {
      const vm = prefs[viewModeKey];
      const sm = prefs[sortModeKey];
      if (vm) dispatch({ type: 'SET_VIEW_MODE', mode: vm });
      if (sm) dispatch({ type: 'SET_SORT_MODE', mode: sm });
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async (forceRefresh = false) => {
    dispatch({ type: 'LOADING' });
    try {
      const all = await fetchSeries(forceRefresh);
      dispatch({ type: 'LOADED', data: all });
      syncBff().catch(() => {});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      dispatch({ type: 'ERROR', error: msg });
    }
  }, []);

  useEffect(() => { refresh(false); }, [refresh]);

  // Series follow state can change from another screen (e.g. SeriesDetailScreen) while this
  // screen stays mounted in the navigation stack (React Navigation keeps it alive, it never
  // remounts on back) — sync isFollowed reactively instead of relying on a refetch on focus.
  useEffect(() => {
    const sub = SeriesFollowedEmitter.addListener('seriesFollowedIds', (ids: string[]) => {
      dispatch({ type: 'SET_FOLLOWED_IDS', ids });
    });
    return () => sub.remove();
  }, []);

  // Mesma ideia do listener de follow acima: progresso de leitura muda em outra tela (Series
  // Detail, Reader) enquanto esta continua montada — reage in-place ao invés de esperar o TTL do
  // cache em memória do lado nativo expirar ou depender de um refetch completo.
  useEffect(() => {
    const sub = SeriesProgressChangedEmitter.addListener(
      'seriesProgressChanged',
      (event: SeriesProgressChangedEvent) => {
        dispatch({ type: 'PROGRESS_CHANGED', event });
      },
    );
    return () => sub.remove();
  }, []);

  const setViewMode = useCallback((mode: LibraryViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', mode });
    ConfigRepository.upsertUiPreferences({ [viewModeKey]: mode } as any).catch(() => {});
  }, [viewModeKey]);

  const setSortMode = useCallback((mode: LibrarySortMode) => {
    dispatch({ type: 'SET_SORT_MODE', mode });
    ConfigRepository.upsertUiPreferences({ [sortModeKey]: mode } as any).catch(() => {});
  }, [sortModeKey]);

  const toggleFollow = useCallback(async (seriesId: number) => {
    dispatch({ type: 'TOGGLE_FOLLOW', seriesId });
    try {
      await bridgeToggleFollow(String(seriesId));
      refreshShell();
    } catch {
      // Revert optimistic update on failure
      dispatch({ type: 'TOGGLE_FOLLOW', seriesId });
    }
  }, [refreshShell]);

  // Applied on every render (not once at fetch time) so screens like FollowingScreen react
  // immediately when isFollowed changes via SET_FOLLOWED_IDS/TOGGLE_FOLLOW — an item must be
  // able to appear/disappear from a filtered list without a refetch.
  const data = useMemo(
    () => (filter ? state.data.filter(filter) : state.data),
    [state.data, filter],
  );

  return { ...state, data, refresh, setViewMode, setSortMode, toggleFollow };
}
