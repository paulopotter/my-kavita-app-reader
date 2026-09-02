import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { FollowedSeriesBridge } from '../../../shared/bridge/followedSeries';
import type { ExternalMetadataMatch } from '../../../shared/bridge/external';
import { SeriesFollowedEmitter } from '../../../shared/bridge/series';
import { EventBus, useEvent } from '../../../shared/managers/events';
import { SerialsService, SerialService } from '../../../shared/services/serials';
import { ChapterEvents } from '../../../shared/tools/chapters';
import { SeriesDigestIndex, SeriesTool, SerieEvents, serieDigestResolvedPayload } from '../../../shared/tools/series';
import type { SeriesDigestIndexEntry } from '../../../shared/tools/series';
import { LibraryEvents } from '../library.events';
import { LibraryPrefs, DEFAULT_SORT_MODE, DEFAULT_VIEW_MODE } from '../library.prefs';
import { LibraryTool, type LibraryEntry } from '../library.tool';
import type { LibrarySortMode, LibraryViewMode, UseLibraryOptions } from '../library.types';

// Debounce for the background reconcile after a cross-screen chapter-read event: marking several
// chapters in quick succession collapses into one reload, not one per mark.
const RECONCILE_DEBOUNCE_MS = 400;

// A card past this scroll offset (px) with the user scrolling up shows the scroll-to-top button.
const SCROLL_TOP_THRESHOLD = 300;

// After a force-refresh that actually reached the network, the "Atualizado às HH:MM:SS" banner
// stays up this long, then hides itself. A cache-first mount never shows this variant.
const BANNER_CONFIRMED_MS = 4000;

// Older than this and the data is "stale" — matches :content-digest's SERIAL cache TTL (15 min),
// the same window buildSerialsDigest itself uses to decide a background refresh is due.
const STALE_AFTER_MS = 15 * 60 * 1000;

// A just-assembled list, shared across every useLibrary instance (Library + Following) so the
// second screen to mount paints it synchronously instead of flashing a spinner while it
// re-assembles identical data. Written only in load()'s .then(); read only on mount. `null` until
// the first assemble in this app session. Not persisted (that was the rc57 Store snapshot, ripped
// out for the allocation cost) — the Kotlin per-series cache is the cold-start source.
let lastAssembled: { entries: LibraryEntry[]; lastUpdatedEpochMs: number | null; atEpochMs: number } | null = null;

// A mount reuses lastAssembled without its own fetch only while it's this fresh; older than this,
// the mount does a normal background load() instead.
const HANDOFF_FRESH_MS = 30 * 1000;

let libraryInstanceSeq = 0;

// What the freshness strip under the header shows. 'confirmed' is the transient post-refresh
// state; 'offline' means the last load failed but we're still showing cached rows; 'stale' means
// the newest cached row is past STALE_AFTER_MS; 'none' hides the strip.
export type LibraryBannerState =
  | { kind: 'none' }
  | { kind: 'confirmed'; atEpochMs: number }
  | { kind: 'stale'; sinceEpochMs: number }
  | { kind: 'offline'; sinceEpochMs: number | null };

// ── state ────────────────────────────────────────────────────────────────────
// `data` is ALWAYS the raw unsorted, unfiltered list exactly as assembleLibrary produced it. The
// reducer never sorts or filters — sorting is a pure view concern (see the useMemo in the hook),
// so changing sortMode is a single field write, not a data rebuild, and never a refetch.

interface State {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  data: LibraryEntry[];
  sortMode: LibrarySortMode;
  // Newest per-series cache timestamp reported by the last successful SerialsService.get()
  // (SerialsDigest.lastUpdatedEpochMs). null until the first success / on an empty library.
  lastUpdatedEpochMs: number | null;
  // Set when a load fails while `data` still holds cached rows — drives the 'offline' banner.
  loadFailed: boolean;
  // Set right after a force-refresh that reached the network — drives the transient 'confirmed'
  // banner. Cleared on a timer (BANNER_CONFIRMED_MS) and on any non-forced load.
  confirmedAtEpochMs: number | null;
}

type Action =
  | { type: 'LOADING' }
  | { type: 'REFRESHING' }
  | { type: 'LOADED'; data: LibraryEntry[]; lastUpdatedEpochMs: number | null; forced: boolean }
  // Data assembled by ANOTHER useLibrary instance (or by lastAssembled on mount). Same effect on
  // state as LOADED with forced=false, but it must never trigger a load() or an emit — that's what
  // keeps the cross-screen handoff from looping.
  | { type: 'HYDRATE'; data: LibraryEntry[]; lastUpdatedEpochMs: number | null }
  | { type: 'ERROR'; error: string }
  | { type: 'CLEAR_CONFIRMED' }
  | { type: 'SET_SORT_MODE'; mode: LibrarySortMode }
  | { type: 'SET_FOLLOWED_IDS'; ids: string[] }
  | { type: 'TOGGLE_FOLLOW'; seriesId: string }
  | { type: 'PATCH_ENTRY'; seriesId: string; patch: Partial<LibraryEntry> }
  | { type: 'ADJUST_READ'; seriesId: string; delta: number };

// Pure view transform — sort a list by the current mode. Not in the reducer: called by a useMemo
// keyed on (data, sortMode) so it re-runs only when one of those actually changes.
function sortEntries(data: LibraryEntry[], mode: LibrarySortMode): LibraryEntry[] {
  if (mode === 'ALPHABETICAL') {
    return [...data].sort((a, b) => a.name.localeCompare(b.name));
  }
  return [...data].sort((a, b) => {
    const ta = a.lastChapterAddedEpochMs ?? 0;
    const tb = b.lastChapterAddedEpochMs ?? 0;
    if (tb !== ta) {return tb - ta;}
    return a.name.localeCompare(b.name);
  });
}

// Recomputes progressFraction / readStatus after an in-place count change (a cross-screen mark).
// Only applies when the entry carries chapter counts; a page-only entry is left for the reload.
function withRecomputedProgress(entry: LibraryEntry): LibraryEntry {
  if (entry.readChapters == null || entry.chapterCount == null || entry.chapterCount <= 0) {
    return entry;
  }
  const readChapters = Math.max(0, Math.min(entry.chapterCount, entry.readChapters));
  const progressFraction = readChapters / entry.chapterCount;
  const readStatus: LibraryEntry['readStatus'] =
    readChapters <= 0 ? 'UNREAD' : readChapters >= entry.chapterCount ? 'READ' : 'IN_PROGRESS';
  return { ...entry, readChapters, progressFraction, readStatus };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null };
    case 'REFRESHING':
      return { ...state, refreshing: true, error: null };
    case 'LOADED':
      return {
        ...state,
        loading: false,
        refreshing: false,
        error: null,
        loadFailed: false,
        data: action.data,
        lastUpdatedEpochMs: action.lastUpdatedEpochMs,
        confirmedAtEpochMs: action.forced ? Date.now() : null,
      };
    case 'HYDRATE':
      // Reference-equality guard: the same array handed back (a re-emit we already applied) is a
      // no-op, so it can't drive an extra render.
      if (state.data === action.data && !state.loading) {
        return state;
      }
      return {
        ...state,
        loading: false,
        refreshing: false,
        error: null,
        loadFailed: false,
        data: action.data,
        lastUpdatedEpochMs: action.lastUpdatedEpochMs,
      };
    case 'ERROR':
      // Keep whatever `data` is already on screen — only flag the failure so the banner can say
      // "offline". A hard error with no data at all is still surfaced via `error`.
      return { ...state, loading: false, refreshing: false, error: action.error, loadFailed: true };
    case 'CLEAR_CONFIRMED':
      return state.confirmedAtEpochMs == null ? state : { ...state, confirmedAtEpochMs: null };
    case 'SET_SORT_MODE':
      return state.sortMode === action.mode ? state : { ...state, sortMode: action.mode };
    case 'SET_FOLLOWED_IDS': {
      const followed = new Set(action.ids);
      // No-op if nothing changed — avoids a re-render when the emitter fires with the same set.
      if (state.data.every(e => e.isFollowed === followed.has(e.id))) {
        return state;
      }
      return { ...state, data: state.data.map(e => ({ ...e, isFollowed: followed.has(e.id) })) };
    }
    case 'TOGGLE_FOLLOW':
      return {
        ...state,
        data: state.data.map(e => (e.id === action.seriesId ? { ...e, isFollowed: !e.isFollowed } : e)),
      };
    case 'PATCH_ENTRY': {
      const idx = state.data.findIndex(e => e.id === action.seriesId);
      if (idx === -1) {
        return state;
      }
      const patched = withRecomputedProgress({ ...state.data[idx], ...action.patch });
      const next = state.data.slice();
      next[idx] = patched;
      return { ...state, data: next };
    }
    case 'ADJUST_READ': {
      const idx = state.data.findIndex(e => e.id === action.seriesId);
      if (idx === -1) {
        return state;
      }
      const e = state.data[idx];
      if (e.readChapters == null || e.chapterCount == null || e.chapterCount <= 0) {
        return state;
      }
      const next = state.data.slice();
      next[idx] = withRecomputedProgress({
        ...e,
        readChapters: Math.max(0, Math.min(e.chapterCount, e.readChapters + action.delta)),
      });
      return { ...state, data: next };
    }
  }
}

// How much a chapter-read change moves a series' READ count. With prevStatus known, only a real
// crossing of the READ boundary counts; without it, an optimistic ±1 the clamp + reload reconcile.
function readCountDelta(readStatus: string, prevStatus: string | undefined): number {
  if (prevStatus != null) {
    if (prevStatus !== 'READ' && readStatus === 'READ') {return 1;}
    if (prevStatus === 'READ' && readStatus !== 'READ') {return -1;}
    return 0;
  }
  return readStatus === 'READ' ? 1 : -1;
}

const initial: State = {
  loading: true,
  refreshing: false,
  error: null,
  data: [],
  sortMode: DEFAULT_SORT_MODE,
  lastUpdatedEpochMs: null,
  loadFailed: false,
  confirmedAtEpochMs: null,
};

// ── list assembly (the hook owns "when/how to fetch", like serie.hooks.ts's own load) ─────────

// Reads whatever the persistent SeriesDigestIndex already has for these ids (a series the user
// opened before). Missing → not in the map. Runs for every id up front, in one pass — no per-id
// event, no per-id dispatch.
async function readIndexFor(ids: string[]): Promise<Map<string, SeriesDigestIndexEntry>> {
  const out = new Map<string, SeriesDigestIndexEntry>();
  const settled = await Promise.allSettled(ids.map(id => SeriesDigestIndex.get(id)));
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value) {
      out.set(ids[i], result.value);
    }
  });
  return out;
}

// Fetches every followed series' digest (full=false — the card only needs counts) in parallel and
// returns the per-series index projection. It does NOT emit SerieEvents.digestResolved per series
// — that event is the SerieScreen's channel for a user-opened series; firing it here for every
// followed series would bounce straight back into this hook's own listener (a re-render per
// followed series). The results are folded into the assembled list directly instead.
async function loadFollowedDigests(
  followedIds: string[],
  force: boolean,
): Promise<Map<string, SeriesDigestIndexEntry>> {
  const out = new Map<string, SeriesDigestIndexEntry>();
  if (followedIds.length === 0) {
    return out;
  }
  const settled = await Promise.allSettled(followedIds.map(seriesId => SerialService.get({ seriesId, force })));
  settled.forEach((result, i) => {
    if (result.status !== 'fulfilled' || !result.value.isSuccess) {
      return;
    }
    const payload = serieDigestResolvedPayload(result.value);
    out.set(followedIds[i], {
      readChapters: payload.readChapters,
      totalChapters: payload.totalChapters,
      publicationStatus: payload.publicationStatus,
    });
  });
  return out;
}

function settledOr<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback;
}

// Assembles LibraryEntry[] from the batch sources. Only SerialsService.get() is critical — if it
// rejects, or comes back a Failure, this rejects. getAllIds / the BFF batch / each followed
// digest are best-effort: a rejection degrades that piece, the rest of the list still renders.
// SerialsService.get() is cache-first on the Kotlin side (each series merged into its own
// per-series cache), so a warm mount resolves without a network round trip — no RN-side snapshot
// needed. `lastUpdatedEpochMs` is the newest of those per-series cache timestamps.
async function assembleLibrary({
  force,
}: {
  force: boolean;
}): Promise<{ entries: LibraryEntry[]; lastUpdatedEpochMs: number | null }> {
  const [serialsResult, followedResult] = await Promise.allSettled([
    SerialsService.get({ force }),
    FollowedSeriesBridge.getAllIds(),
  ]);

  if (serialsResult.status !== 'fulfilled') {
    throw serialsResult.reason instanceof Error ? serialsResult.reason : new Error(String(serialsResult.reason));
  }
  if (!serialsResult.value.isSuccess) {
    throw new Error(serialsResult.value.error.message ?? serialsResult.value.error.code ?? 'serials digest failed');
  }
  const digest = serialsResult.value;
  const series = SeriesTool.normalize({ serials: digest.serials });
  const followedIds = settledOr(followedResult, [] as string[]);
  const followedSet = new Set(followedIds);

  const [matchesResult] = await Promise.allSettled([
    SerialsService.externalDetails.sync({
      series: series.map(s => ({ seriesId: s.id, seriesName: s.name })),
    }),
  ]);
  const matches = settledOr(matchesResult, [] as (ExternalMetadataMatch | null)[]);

  const freshDigests = await loadFollowedDigests(followedIds, force);
  const idsNeedingIndex = series.map(s => s.id).filter(id => !freshDigests.has(id));
  const staleIndex = await readIndexFor(idsNeedingIndex);
  const indexBySeriesId = new Map<string, SeriesDigestIndexEntry>([...staleIndex, ...freshDigests]);

  return {
    entries: LibraryTool.normalize({ series, matches, indexBySeriesId, followedIds: followedSet }),
    lastUpdatedEpochMs: digest.lastUpdatedEpochMs,
  };
}

// ── hook ─────────────────────────────────────────────────────────────────────

export function useLibrary({ filter, prefsKey = 'library' }: UseLibraryOptions = {}) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [viewMode, setViewModeState] = useState<LibraryViewMode>(DEFAULT_VIEW_MODE);
  const reconcileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadInFlightRef = useRef(false);
  const loadRef = useRef<(force?: boolean) => void>(() => {});
  // Stable id for THIS instance — lets the assembled-list listener below ignore its own emit.
  const instanceIdRef = useRef<string>('');
  if (instanceIdRef.current === '') {
    instanceIdRef.current = `lib-${(libraryInstanceSeq += 1)}`;
  }

  // Assemble (or refresh) the list. Guards against a second concurrent run (mount kicks one, and
  // a cross-screen event could kick another before the first settles). No RN-side snapshot write —
  // SerialsService.get() is cache-first on the Kotlin side, so a warm mount is already fast.
  //
  // On success it publishes LibraryEvents.assembled (and fills the module-level lastAssembled) so
  // the OTHER LibraryScreen (Library <-> Following) can paint the same list without re-fetching.
  // This is the ONLY emit; the listener never re-emits and never calls load(), so there is no
  // cycle — see library.events.ts.
  const load = useCallback((force = false) => {
    if (loadInFlightRef.current) {
      return;
    }
    loadInFlightRef.current = true;
    dispatch(force ? { type: 'REFRESHING' } : { type: 'LOADING' });
    assembleLibrary({ force })
      .then(({ entries, lastUpdatedEpochMs }) => {
        dispatch({ type: 'LOADED', data: entries, lastUpdatedEpochMs, forced: force });
        const assembledAtEpochMs = Date.now();
        lastAssembled = { entries, lastUpdatedEpochMs, atEpochMs: assembledAtEpochMs };
        EventBus.emit(LibraryEvents.assembled, {
          instanceId: instanceIdRef.current,
          entries,
          lastUpdatedEpochMs,
          assembledAtEpochMs,
        });
      })
      .catch((e: unknown) => dispatch({ type: 'ERROR', error: e instanceof Error ? e.message : 'Unknown error' }))
      .finally(() => {
        loadInFlightRef.current = false;
      });
  }, []);
  loadRef.current = load;

  // Mount: if another instance assembled the list moments ago, paint it synchronously (no spinner)
  // and skip this mount's own fetch — the emitting instance already refreshed. Otherwise do the
  // normal background load; the Kotlin per-series cache keeps a cold start fast.
  useEffect(() => {
    if (lastAssembled && Date.now() - lastAssembled.atEpochMs < HANDOFF_FRESH_MS) {
      dispatch({
        type: 'HYDRATE',
        data: lastAssembled.entries,
        lastUpdatedEpochMs: lastAssembled.lastUpdatedEpochMs,
      });
      return;
    }
    loadRef.current(false);
  }, []);

  // The other LibraryScreen finished assembling while this one is mounted (both tabs alive). Take
  // its list as-is. HYDRATE only — no load(), no re-emit — so this can never bounce back.
  useEvent(LibraryEvents.assembled, ({ instanceId, entries, lastUpdatedEpochMs }) => {
    if (instanceId === instanceIdRef.current) {
      return;
    }
    dispatch({ type: 'HYDRATE', data: entries, lastUpdatedEpochMs });
  });

  // Persisted view/sort prefs for this tab.
  useEffect(() => {
    LibraryPrefs.getViewMode(prefsKey).then(setViewModeState).catch(() => {});
    LibraryPrefs.getSortMode(prefsKey).then(mode => dispatch({ type: 'SET_SORT_MODE', mode })).catch(() => {});
  }, [prefsKey]);

  // A series' digest resolved elsewhere (the user opened its SerieScreen) — patch that one card's
  // chapter counts in place. One dispatch per event, and the reducer no-ops if the series isn't
  // in the list. publicationStatus isn't patched (the event carries the raw string, not the
  // card's normalized enum) — the next load picks it up from the warmed index.
  useEvent(SerieEvents.digestResolved, ({ seriesId, readChapters, totalChapters }) => {
    if (readChapters == null && totalChapters == null) {return;}
    dispatch({
      type: 'PATCH_ENTRY',
      seriesId,
      patch: {
        ...(readChapters != null ? { readChapters } : {}),
        ...(totalChapters != null ? { chapterCount: totalChapters } : {}),
      },
    });
  });

  // Follow state changed from another screen while this tab stays mounted. The reducer no-ops if
  // the set is unchanged, so an idle emit costs nothing.
  useEffect(() => {
    const sub = SeriesFollowedEmitter.addListener('seriesFollowedIds', (ids: string[]) => {
      dispatch({ type: 'SET_FOLLOWED_IDS', ids });
    });
    return () => sub.remove();
  }, []);

  // Chapter read/unread from another screen — optimistic in-place move, then one debounced
  // background reload to reconcile the aggregate.
  useEvent(ChapterEvents.readStatusChanged, ({ chapter, changed, phase }) => {
    if (phase === 'confirmed') {return;}
    const base = readCountDelta(changed.readStatus, changed.prevStatus);
    const delta = phase === 'reverted' ? -base : base;
    if (delta !== 0) {
      dispatch({ type: 'ADJUST_READ', seriesId: chapter.seriesId, delta });
    }
    if (reconcileTimerRef.current) {clearTimeout(reconcileTimerRef.current);}
    reconcileTimerRef.current = setTimeout(() => loadRef.current(false), RECONCILE_DEBOUNCE_MS);
  });
  useEffect(
    () => () => {
      if (reconcileTimerRef.current) {clearTimeout(reconcileTimerRef.current);}
    },
    [],
  );

  const refresh = useCallback(() => load(true), [load]);

  const setViewMode = useCallback(
    (mode: LibraryViewMode) => {
      setViewModeState(mode);
      LibraryPrefs.setViewMode(prefsKey, mode);
    },
    [prefsKey],
  );

  const setSortMode = useCallback(
    (mode: LibrarySortMode) => {
      dispatch({ type: 'SET_SORT_MODE', mode });
      LibraryPrefs.setSortMode(prefsKey, mode);
    },
    [prefsKey],
  );

  const toggleSortMode = useCallback(() => {
    setSortMode(state.sortMode === 'RECENTLY_UPDATED' ? 'ALPHABETICAL' : 'RECENTLY_UPDATED');
  }, [state.sortMode, setSortMode]);

  const toggleViewMode = useCallback(() => {
    setViewMode(viewMode === 'GRID' ? 'LIST' : 'GRID');
  }, [viewMode, setViewMode]);

  // ── derived view state — sort + filter live here, not in the reducer ─────────
  // Re-runs only when the raw list, the sort mode or the filter actually change. The toggle just
  // flips sortMode; this re-orders the list already in hand, no fetch, no re-normalization.
  const data = useMemo(() => {
    const sorted = sortEntries(state.data, state.sortMode);
    return filter ? sorted.filter(filter) : sorted;
  }, [state.data, state.sortMode, filter]);

  // Freshness strip state. 'confirmed' wins right after a successful force-refresh (transient);
  // then 'offline' if the last load failed but rows are still shown; then 'stale' if the newest
  // cached row is old; else 'none'.
  const bannerState = useMemo<LibraryBannerState>(() => {
    if (state.confirmedAtEpochMs != null) {
      return { kind: 'confirmed', atEpochMs: state.confirmedAtEpochMs };
    }
    if (state.loadFailed && state.data.length > 0) {
      return { kind: 'offline', sinceEpochMs: state.lastUpdatedEpochMs };
    }
    if (
      state.lastUpdatedEpochMs != null &&
      Date.now() - state.lastUpdatedEpochMs >= STALE_AFTER_MS
    ) {
      return { kind: 'stale', sinceEpochMs: state.lastUpdatedEpochMs };
    }
    return { kind: 'none' };
  }, [state.confirmedAtEpochMs, state.loadFailed, state.data.length, state.lastUpdatedEpochMs]);

  // Auto-hide the 'confirmed' strip after BANNER_CONFIRMED_MS.
  useEffect(() => {
    if (state.confirmedAtEpochMs == null) {
      return;
    }
    const timer = setTimeout(() => dispatch({ type: 'CLEAR_CONFIRMED' }), BANNER_CONFIRMED_MS);
    return () => clearTimeout(timer);
  }, [state.confirmedAtEpochMs]);

  // Alphabet index: letter → first row index, only meaningful in LIST + ALPHABETICAL.
  const alphabetIndex = useMemo<Map<string, number>>(() => {
    if (viewMode !== 'LIST' || state.sortMode !== 'ALPHABETICAL') {return new Map();}
    const map = new Map<string, number>();
    data.forEach((entry, index) => {
      const letter = entry.name[0]?.toUpperCase() ?? '#';
      if (!map.has(letter)) {map.set(letter, index);}
    });
    return map;
  }, [data, viewMode, state.sortMode]);

  // GRID needs an even item count for a clean 2-column grid — pad with one null tail cell.
  const paddedData = useMemo<(LibraryEntry | null)[]>(
    () => (viewMode === 'GRID' && data.length % 2 !== 0 ? [...data, null] : data),
    [viewMode, data],
  );

  const [showScrollTop, setShowScrollTop] = useState(false);
  const lastOffsetY = useRef(0);
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const scrollingUp = y < lastOffsetY.current;
    lastOffsetY.current = y;
    setShowScrollTop(scrollingUp && y > SCROLL_TOP_THRESHOLD);
  }, []);
  const hideScrollTop = useCallback(() => setShowScrollTop(false), []);

  return {
    loading: state.loading,
    refreshing: state.refreshing,
    error: state.error,
    bannerState,
    data,
    paddedData,
    viewMode,
    sortMode: state.sortMode,
    alphabetIndex,
    showScrollTop,
    hideScrollTop,
    handleScroll,
    refresh,
    setViewMode,
    setSortMode,
    toggleSortMode,
    toggleViewMode,
  };
}

// Test-only: clear the cross-instance handoff cache between test cases (it's module-level state,
// so it would otherwise leak from one test into the next).
export function __resetLibraryHandoff(): void {
  lastAssembled = null;
  libraryInstanceSeq = 0;
}
