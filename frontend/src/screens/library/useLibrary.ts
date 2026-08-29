import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { ConfigRepository } from '../../shared/bridge/config';
import { LibrarySortMode, LibraryViewMode, SeriesSummary } from '../../shared/bridge/library';
import { SeriesFollowedEmitter } from '../../shared/bridge/series';
import { ChapterEvents } from '../../shared/tools/chapters';
import { useEvent } from '../../shared/managers/events';
import { useAppShellState } from '../../shared/components/AppShellState';
import { fetchSeries, syncBff, toggleFollow as bridgeToggleFollow } from './LibraryService';

// Debounce for the background reconcile: marking several chapters in quick succession
// collapses into one refetch, not one per mark.
const RECONCILE_DEBOUNCE_MS = 400;

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
  | { type: 'ADJUST_SERIES_PROGRESS'; seriesId: string; delta: number };

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
    case 'ADJUST_SERIES_PROGRESS': {
      // Optimistic local move on a chapter-read change from elsewhere (EventBus). Needs the
      // series' own chapter count to bound the result and recompute the fraction/status — a
      // series that never carried readChapters/chapterCount (null) is skipped, the background
      // reconcile refetch covers it. The clamp guarantees readChapters never exceeds
      // chapterCount nor drops below 0, whatever the delta.
      return {
        ...state,
        data: state.data.map(s => {
          if (String(s.id) !== action.seriesId) return s;
          if (s.readChapters == null || s.chapterCount == null || s.chapterCount <= 0) return s;
          const readChapters = Math.max(0, Math.min(s.chapterCount, s.readChapters + action.delta));
          const progressFraction = readChapters / s.chapterCount;
          const readStatus = readChapters <= 0 ? 'UNREAD' : readChapters >= s.chapterCount ? 'READ' : 'IN_PROGRESS';
          return { ...s, readChapters, progressFraction, readStatus };
        }),
      };
    }
  }
}

// How much this change moves a series' READ count, from the aggregate's point of view.
// With prevStatus known: only a real crossing of the READ boundary counts (+1/-1), anything
// else is 0. Without it: an optimistic ±1 by the new status alone, left for the clamp +
// background refetch to reconcile.
function readCountDelta(readStatus: string, prevStatus: string | undefined): number {
  if (prevStatus != null) {
    if (prevStatus !== 'READ' && readStatus === 'READ') return 1;
    if (prevStatus === 'READ' && readStatus !== 'READ') return -1;
    return 0;
  }
  return readStatus === 'READ' ? 1 : -1;
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

  // Used by the ChapterEvents.readStatusChanged listener below — declared here so it can be
  // pointed at `refresh` right after that's defined, without the listener re-subscribing.
  const reconcileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshRef = useRef<(force?: boolean) => void>(() => {});

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

  // Keep the ref the EventBus listener calls pointing at the current refresh (the listener closes
  // over a ref, not refresh directly, so it never needs re-subscribing when refresh changes).
  refreshRef.current = refresh;

  // Series follow state can change from another screen (e.g. SeriesDetailScreen) while this
  // screen stays mounted in the navigation stack (React Navigation keeps it alive, it never
  // remounts on back) — sync isFollowed reactively instead of relying on a refetch on focus.
  useEffect(() => {
    const sub = SeriesFollowedEmitter.addListener('seriesFollowedIds', (ids: string[]) => {
      dispatch({ type: 'SET_FOLLOWED_IDS', ids });
    });
    return () => sub.remove();
  }, []);

  // Reading progress changes from another screen (SerieScreen marking a chapter read/unread)
  // while this one stays mounted — same "react in place, don't wait for a refetch" idea as the
  // follow listener above, now over the EventBus RN→RN (plano 017, Task 013) instead of the
  // removed native 'seriesProgressChanged' emitter.
  //
  // Two-step: an optimistic local move on the card right away (ADJUST_SERIES_PROGRESS, bounded
  // by the clamp), then a debounced silent refetch to reconcile the aggregate exactly. `phase`
  // 'confirmed' is ignored — the refetch already covers it; 'reverted' undoes the optimistic
  // move (its payload's prevStatus is the optimistic value this listener applied).
  //
  // The refetch is refresh(false) (the whole list) because the Library still runs on the legacy
  // LibraryBridge.listSeries/SeriesSummary stack — SerialService.get returns a different shape
  // (SeriesDigest) missing fields SeriesSummary needs. A per-series refetch here is a Task 036
  // item, to land when the Library is rewritten onto the digest stack.
  useEvent(ChapterEvents.readStatusChanged, ({ chapter, changed, phase }) => {
    if (phase === 'confirmed') return;

    const baseDelta = readCountDelta(changed.readStatus, changed.prevStatus);
    const delta = phase === 'reverted' ? -baseDelta : baseDelta;
    if (delta !== 0) {
      dispatch({ type: 'ADJUST_SERIES_PROGRESS', seriesId: chapter.seriesId, delta });
    }

    if (reconcileTimerRef.current) clearTimeout(reconcileTimerRef.current);
    reconcileTimerRef.current = setTimeout(() => refreshRef.current(false), RECONCILE_DEBOUNCE_MS);
  });
  useEffect(() => () => {
    if (reconcileTimerRef.current) clearTimeout(reconcileTimerRef.current);
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
