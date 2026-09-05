import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChapterTool, ChaptersTool, SerialService, SerieTool, useAction } from '../../../shared';
import type { ChapterMarkUpdate, ChapterSortPrefs, Serie, SerieChapter } from '../../../shared';
import { EventBus, useEvent } from '../../../shared/managers/events';
import { ChapterEvents } from '../../../shared/tools/chapters';
import { SerieEvents, serieDigestResolvedPayload } from '../../../shared/tools/series';
import { useStrings } from '../../../shared/i18n';
import type { NavOrigin } from '../../../navigation/routes';
import type { ChapterSortMode } from '../serie.types';

const SORT_CYCLE: ChapterSortMode[] = ['ASCENDING', 'DESCENDING', 'AUTO_FIXED', 'AUTO_PROGRESS'];

const DEFAULT_SORT_PREFS: ChapterSortPrefs = { mode: 'ASCENDING', progressPercent: 50 };

// Chapter ordering lives with the screen that renders the list — SerieChapter's number is already
// numeric (and decimalNumber carries the precise value, e.g. 5 vs 5.5), so this compares directly
// rather than parsing strings. Same 4 modes the sort config exposes.
function chapterNumberComparator(a: SerieChapter, b: SerieChapter): number {
  const na = a.decimalNumber ?? a.number;
  const nb = b.decimalNumber ?? b.number;
  if (na != null && nb != null && na !== nb) {return na - nb;}
  if (na != null && nb == null) {return -1;}
  if (na == null && nb != null) {return 1;}
  return a.title.localeCompare(b.title);
}

// progressPercent has no default: `serie.hooks.ts` always calls this with sortProgressPercent's
// own state (already initialized to 50), so a parameter default here would be unreachable code.
function sortChapters(chapters: SerieChapter[], mode: ChapterSortMode, fixedThreshold: number | undefined, progressPercent: number): SerieChapter[] {
  const ascending = [...chapters].sort(chapterNumberComparator);

  switch (mode) {
    case 'ASCENDING':
      return ascending;
    case 'DESCENDING':
      return [...ascending].reverse();
    case 'AUTO_FIXED': {
      if (fixedThreshold == null) {return ascending;}
      const lastReadNumber = ascending
        .filter(c => c.readStatus === 'READ')
        .map(c => c.decimalNumber ?? c.number)
        .filter((n): n is number => n != null)
        .reduce((max, n) => Math.max(max, n), 0);
      return lastReadNumber > fixedThreshold ? [...ascending].reverse() : ascending;
    }
    case 'AUTO_PROGRESS': {
      const readCount = ascending.filter(c => c.readStatus === 'READ').length;
      const actualPercent = ascending.length === 0 ? 0 : (readCount / ascending.length) * 100;
      return actualPercent >= progressPercent ? [...ascending].reverse() : ascending;
    }
  }
}

// useSerie — orchestrates the serie screen: decides WHEN to fetch (mount, focus, manual refresh),
// holds the screen's own state, and delegates every domain concern to the tools that own it
// (SerieTool for the canonical series shape/follow, ChapterTool for chapter read status). Never
// uses async/await — every asynchronous method here is a plain function returning a .then()/
// .catch() chain, so whoever calls it (this hook internally, or the screen) decides whether it
// needs to wait on the result at all.
export function useSerie({ seriesId, origin }: { seriesId: string; origin: NavOrigin }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serie, setSerie] = useState<Serie | null>(null);
  const [isFollowed, setIsFollowed] = useState(false);
  const [sortMode, setSortMode] = useState<ChapterSortMode>(DEFAULT_SORT_PREFS.mode);
  const [sortFixedThreshold, setSortFixedThreshold] = useState<number | undefined>(DEFAULT_SORT_PREFS.fixedThreshold);
  const [sortProgressPercent, setSortProgressPercent] = useState(DEFAULT_SORT_PREFS.progressPercent);
  const [hasSeriesSortOverride, setHasSeriesSortOverride] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { realize } = useAction({ origin });
  const t = useStrings();

  // SerialService.get (full=false) already returns SerialDigest cache-first (the decision lives
  // entirely in Kotlin's digest builders — see architecture.md's Cache Guideline) — a plain mount/
  // focus load never forces a network call, it just asks and lets Kotlin decide whether that means
  // a cache hit or a real fetch. `isRefresh` (pull-to-refresh) is different: it passes force=true,
  // skipping the cache entirely — otherwise a manual "pull to refresh" inside the digest's TTL
  // (~15min default) would silently just hand back the same cached value, never actually reaching
  // the server.
  //
  // Deliberately full=false, not getFull — full=true propagates to every chapter's own digest,
  // fetching that chapter's entire page list over the network (buildChapterDigest's full=true
  // path). A chapter list screen only needs title/number/readStatus, never each chapter's pages;
  // asking for full=true here turned into one network round trip per chapter, all in parallel,
  // taking minutes on a series with many chapters. The reader screen is what actually needs
  // full=true, one chapter at a time.
  const load = useCallback(
    (isRefresh = false) => {
      if (isRefresh) {setRefreshing(true);}
      else {setLoading(true);}
      setError(null);
      return SerialService.get({ seriesId, force: isRefresh })
        .then(digest => {
          if (!digest.isSuccess) {throw new Error(digest.error.message ?? 'unknown error');}
          // Announce the fresh digest for the app-wide SeriesDigestIndex (Library reads it so a
          // series opened here shows real chapter counts / publication status without the
          // Library refetching it). Fire-and-forget — this screen doesn't care who listens.
          EventBus.emit(SerieEvents.digestResolved, serieDigestResolvedPayload(digest));
          return SerieTool.normalize({ digest });
        })
        .then(normalized => {
          setSerie(normalized);
          return SerieTool.isFollowed(seriesId);
        })
        .then(followed => {
          setIsFollowed(followed);
        })
        .catch((err: Error) => {
          setError(err.message ?? 'unknown error');
        })
        .finally(() => {
          if (isRefresh) {setRefreshing(false);}
          else {setLoading(false);}
        });
    },
    [seriesId],
  );

  // Neither useEffect nor useFocusEffect accept a callback returning a Promise (React treats that
  // as an invalid destructor) — this discards load()'s Promise, unlike `refresh` below, which
  // callers may want to await/`.then()` on.
  const triggerLoad = useCallback(() => {
    load();
  }, [load]);

  useEffect(triggerLoad, [triggerLoad]);
  useFocusEffect(triggerLoad);

  const refresh = useCallback(() => load(true), [load]);

  // Loads persisted sort prefs via ChaptersTool.sort.get({ domain: 'series' }) — it already
  // resolves the per-series override vs. the global default internally (see its own doc): the
  // presence of `isOverride` on the result is what tells us which one we got. Runs once per
  // seriesId, independent of load() above (series data and sort prefs are unrelated reads — no
  // reason to block one on the other).
  const applySortPrefs = useCallback((prefs: ChapterSortPrefs, hasOverride: boolean) => {
    setSortMode(prefs.mode);
    setSortFixedThreshold(prefs.fixedThreshold);
    setSortProgressPercent(prefs.progressPercent);
    setHasSeriesSortOverride(hasOverride);
  }, []);

  useEffect(() => {
    ChaptersTool.sort
      .get({ domain: 'series', seriesId })
      .then(prefs => applySortPrefs(prefs, 'isOverride' in prefs))
      .catch(() => applySortPrefs(DEFAULT_SORT_PREFS, false));
  }, [seriesId, applySortPrefs]);

  const chapters = useMemo(
    () => (serie ? sortChapters(serie.chapters, sortMode, sortFixedThreshold, sortProgressPercent) : []),
    [serie, sortMode, sortFixedThreshold, sortProgressPercent],
  );

  // Mirrors the legacy ChapterSortConfigModal's onSave contract (mode/fixedThreshold/
  // progressPercent as one call) — always writes a per-series override (never touches the global
  // default; see this screen's own design notes), applied optimistically before the write
  // resolves.
  const updateSortPrefs = useCallback(
    ({ mode, fixedThreshold, progressPercent }: { mode: ChapterSortMode; fixedThreshold?: number; progressPercent?: number }) => {
      const prefs: ChapterSortPrefs = { mode, fixedThreshold, progressPercent: progressPercent ?? sortProgressPercent };
      applySortPrefs(prefs, true);
      ChaptersTool.sort.put({ domain: 'series', seriesId }, prefs);
    },
    [seriesId, sortProgressPercent, applySortPrefs],
  );

  // Removes the per-series override and falls back to the global default (or the hardcoded
  // default if no global was ever saved either) — ChaptersTool.sort.reset already returns exactly
  // that resolved value.
  const resetSortPrefs = useCallback(() => {
    return ChaptersTool.sort.reset({ seriesId }).then(prefs => applySortPrefs(prefs, false));
  }, [seriesId, applySortPrefs]);

  const toggleSortOrder = useCallback(() => {
    setSortMode(current => SORT_CYCLE[(SORT_CYCLE.indexOf(current) + 1) % SORT_CYCLE.length]);
  }, []);

  // Which chapter to resume at. Derived from the chapters in hand via SerieTool.resolveResumeChapterId
  // (the same 2-level cascade the Kotlin digest uses), NOT from the static serie.resumePoint —
  // so an optimistic mark (single or batch, in this screen) updates the "continue" button
  // immediately, without waiting for a refetch. A real load() still overwrites `serie.chapters`
  // with fresh Kotlin data, and the cascade re-runs on that.
  const continueChapter = useMemo(() => {
    if (!serie) {return null;}
    const resumeId = SerieTool.resolveResumeChapterId(serie.chapters);
    return resumeId ? serie.chapters.find(c => c.id === resumeId) ?? null : null;
  }, [serie]);

  const readCount = useMemo(
    () => (serie ? serie.chapters.filter(c => c.readStatus === 'READ').length : 0),
    [serie],
  );

  // Action-button label for the Header — moved out of header.component.tsx (dumb component holds
  // no logic). Kept in the serie domain (this hook), not promoted to a tool. The resume-chapter
  // decision lives in SerieTool.resolveResumeChapterId (via continueChapter above) — this only
  // picks the wording.
  const actionLabel = useMemo(() => {
    const total = serie?.chapters.length ?? 0;
    if (total === 0 || readCount === 0) {return t.seriesDetailStartReading;}
    if (continueChapter === null) {return t.seriesDetailRereadFromStart;}
    // Same label the chapter list shows for this chapter — never a second, divergent formula.
    // The button clamps this to one line with an ellipsis (see header.component.tsx).
    return t.seriesDetailContinueReading.replace('{0}', ChapterTool.format.title(continueChapter, t));
  }, [serie, readCount, continueChapter, t]);

  // The one place a ChapterMarkUpdate (optimistic, confirmed, or reverted — see
  // ChapterTool.mark's own doc) is applied to local state, same channel regardless of which
  // mark.* call produced it.
  const applyMarkUpdate = useCallback((update: ChapterMarkUpdate) => {
    setSerie(
      current =>
        current && {
          ...current,
          chapters: current.chapters.map(c => (c.id === update.chapterId ? { ...c, readStatus: update.readStatus } : c)),
        },
    );
  }, []);

  // Batch counterpart of applyMarkUpdate — ChapterTool.mark.readMany/unreadMany's onUpdateMany
  // channel (see that tool's own doc). Folds the whole selection into ONE setSerie/.map() pass
  // instead of one per chapter: marking a large selection (e.g. "mark all read" on a 200+ chapter
  // series) was calling applyMarkUpdate once per id, each doing its own O(n) .map() over the full
  // chapter list — O(n*m) synchronous work on the JS thread before the network call even started,
  // which is what showed up as the UI freezing during a bulk mark.
  const applyMarkUpdates = useCallback((updates: ChapterMarkUpdate[]) => {
    if (updates.length === 0) {return;}
    const statusById = new Map(updates.map(u => [u.chapterId, u.readStatus] as const));
    setSerie(
      current =>
        current && {
          ...current,
          chapters: current.chapters.map(c => {
            const readStatus = statusById.get(c.id);
            return readStatus ? { ...c, readStatus } : c;
          }),
        },
    );
  }, []);

  // A mark from ANOTHER screen (the Reader marks as read while you scroll a chapter through) —
  // this screen is still mounted in the nav stack underneath, so it reacts here instead of
  // waiting for a focus reload (which would read the still-cached Kotlin SeriesDigest and show
  // the pre-mark status until its TTL expires — the "KNOWN GAP" in ChapterTool). Reuses
  // applyMarkUpdate: same in-place readStatus swap the local mark.* calls go through.
  //
  // `phase` filter mirrors the Library's listener: 'optimistic' applies the change, 'reverted'
  // applies the fallback status, 'confirmed' is a no-op (nothing visible changed since
  // 'optimistic'). A mark that originated on THIS screen already ran applyMarkUpdate via its own
  // `onUpdate` — reapplying the same readStatus by id is idempotent, no loop, no re-emit here.
  useEvent(ChapterEvents.readStatusChanged, ({ chapter, changed, phase }) => {
    if (phase === 'confirmed') {return;}
    if (chapter.seriesId !== seriesId) {return;}
    applyMarkUpdate({ seriesId, chapterId: chapter.id, readStatus: changed.readStatus });
  });

  const markRead = useCallback(
    ({ chapterId, prevStatus }: { chapterId: string; prevStatus?: SerieChapter['readStatus'] }) => {
      return ChapterTool.mark.read({ seriesId, chapterId, prevStatus, onUpdate: applyMarkUpdate });
    },
    [seriesId, applyMarkUpdate],
  );

  const markUnread = useCallback(
    ({ chapterId, prevStatus }: { chapterId: string; prevStatus?: SerieChapter['readStatus'] }) => {
      return ChapterTool.mark.unread({ seriesId, chapterId, prevStatus, onUpdate: applyMarkUpdate });
    },
    [seriesId, applyMarkUpdate],
  );

  const toggleRead = useCallback(
    ({ chapterId }: { chapterId: string }) => {
      return ChapterTool.mark.toggle({ seriesId, chapterId, onUpdate: applyMarkUpdate });
    },
    [seriesId, applyMarkUpdate],
  );

  const toggleFollow = useCallback(() => {
    return SerieTool.toggleFollow({ seriesId, prevValue: isFollowed, onUpdate: setIsFollowed });
  }, [seriesId, isFollowed]);

  const onChapterLongPress = useCallback((chapterId: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([chapterId]));
  }, []);

  const onChapterClick = useCallback((chapterId: string) => {
    setSelectedIds(current => {
      if (!selectionMode) {return current;}
      const next = new Set(current);
      if (next.has(chapterId)) {next.delete(chapterId);}
      else {next.add(chapterId);}
      if (next.size === 0) {setSelectionMode(false);}
      return next;
    });
  }, [selectionMode]);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(chapters.map(c => c.id)));
  }, [chapters]);

  const invertSelection = useCallback(() => {
    setSelectedIds(current => new Set(chapters.filter(c => !current.has(c.id)).map(c => c.id)));
  }, [chapters]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Batch mark — ONE request for the whole selection (ChapterTool.mark.readMany → Kavita's
  // mark-multiple-read). Looping the single-chapter mark fired N parallel POSTs that saturated
  // the server; the failures were then optimistically reverted, so most of the selection
  // unmarked itself and only one chapter stuck. `prevStatusById` is captured from the chapters
  // in hand so a revert restores the real prior status, not a UNREAD default.
  const prevStatusOf = useCallback(
    (ids: Set<string>): Record<string, SerieChapter['readStatus']> => {
      const byId = new Map((serie?.chapters ?? []).map(c => [c.id, c.readStatus] as const));
      const out: Record<string, SerieChapter['readStatus']> = {};
      ids.forEach(id => {
        const s = byId.get(id);
        if (s) {out[id] = s;}
      });
      return out;
    },
    [serie],
  );

  const markSelectedRead = useCallback(() => {
    const ids = [...selectedIds];
    if (ids.length > 0) {
      ChapterTool.mark.readMany({ seriesId, chapterIds: ids, prevStatusById: prevStatusOf(selectedIds), onUpdateMany: applyMarkUpdates });
    }
    exitSelectionMode();
  }, [selectedIds, seriesId, prevStatusOf, applyMarkUpdates, exitSelectionMode]);

  const markSelectedUnread = useCallback(() => {
    const ids = [...selectedIds];
    if (ids.length > 0) {
      ChapterTool.mark.unreadMany({ seriesId, chapterIds: ids, prevStatusById: prevStatusOf(selectedIds), onUpdateMany: applyMarkUpdates });
    }
    exitSelectionMode();
  }, [selectedIds, seriesId, prevStatusOf, applyMarkUpdates, exitSelectionMode]);

  // ── scroll-to-top button visibility (presentation-only, owned by the hook per the "dumb
  // component / dumb screen" invariant — the screen just wires onScroll / onLayout and renders) ──
  // Shows the button once the header has scrolled out of view AND the user is scrolling back up —
  // the "you're heading back, here's a shortcut" pattern. headerHeight is measured by the screen
  // via onHeaderLayout; lastOffsetY tracks the previous frame to detect direction.
  const [showScrollTop, setShowScrollTop] = useState(false);
  const lastOffsetY = useRef(0);
  const headerHeightRef = useRef(0);

  const onHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    headerHeightRef.current = e.nativeEvent.layout.height;
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = e.nativeEvent.contentOffset.y;
    const scrollingUp = currentY < lastOffsetY.current;
    lastOffsetY.current = currentY;
    setShowScrollTop(currentY > headerHeightRef.current && scrollingUp);
  }, []);

  const hideScrollTop = useCallback(() => setShowScrollTop(false), []);

  return {
    loading,
    refreshing,
    error,
    serie,
    chapters,
    continueChapter,
    readCount,
    actionLabel,
    isFollowed,
    sortMode,
    sortFixedThreshold,
    sortProgressPercent,
    hasSeriesSortOverride,
    selectionMode,
    selectedIds,
    realize,
    refresh,
    markRead,
    markUnread,
    toggleRead,
    toggleFollow,
    toggleSortOrder,
    updateSortPrefs,
    resetSortPrefs,
    onChapterLongPress,
    onChapterClick,
    selectAll,
    invertSelection,
    exitSelectionMode,
    markSelectedRead,
    markSelectedUnread,
    showScrollTop,
    handleScroll,
    hideScrollTop,
    onHeaderLayout,
  };
}
