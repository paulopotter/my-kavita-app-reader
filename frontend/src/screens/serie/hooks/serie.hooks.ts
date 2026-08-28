import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ChapterTool, SerialService, SerieTool, useAction } from '../../../shared';
import type { ChapterMarkUpdate, Serie, SerieChapter } from '../../../shared';
import { PreferencesManager } from '../../../shared/managers/preferences';
import type { NavOrigin } from '../../../navigation/routes';
import type { ChapterSortMode } from '../serie.types';

const SORT_CYCLE: ChapterSortMode[] = ['ASCENDING', 'DESCENDING', 'AUTO_FIXED', 'AUTO_PROGRESS'];

const CHAPTER_SORT_PREFS_DOMAIN = 'chapterSortPrefs';
const GLOBAL_SORT_PREFS_KEY = 'global';

interface ChapterSortPrefs {
  mode: ChapterSortMode;
  fixedThreshold?: number;
  progressPercent: number;
}

const DEFAULT_SORT_PREFS: ChapterSortPrefs = { mode: 'ASCENDING', progressPercent: 50 };

// Rewritten here instead of reused from shared/transforms/chapter.ts (legacy — see that module's
// own Chapter.number: string / parseFloat-based comparator, incompatible with SerieChapter's
// already-numeric number/decimalNumber). Same 4 modes, same behavior, adapted to the new shape.
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

  // SerialService.get (full=false) already returns SeriesDigest cache-first (the decision lives
  // entirely in Kotlin's digest builders — see architecture.md's Cache Guideline) — this never
  // re-fetches "because a refresh window elapsed" the way the legacy useSeriesDetail.ts did; every
  // call here just asks again and lets Kotlin decide whether that means a cache hit or a real
  // network call. `isRefresh` only decides which flag (loading vs. refreshing) reflects this call.
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
      return SerialService.get({ seriesId })
        .then(digest => {
          if (!digest.isSuccess) {throw new Error(digest.error.message ?? 'unknown error');}
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

  // Loads persisted sort prefs — a per-series override (PreferencesManager key=seriesId) takes
  // priority over the global default (key='global'); both share domain='chapterSortPrefs'. Runs
  // once per seriesId, independent of load() above (series data and sort prefs are unrelated
  // reads — no reason to block one on the other).
  const applySortPrefs = useCallback((prefs: ChapterSortPrefs, hasOverride: boolean) => {
    setSortMode(prefs.mode);
    setSortFixedThreshold(prefs.fixedThreshold);
    setSortProgressPercent(prefs.progressPercent);
    setHasSeriesSortOverride(hasOverride);
  }, []);

  useEffect(() => {
    PreferencesManager.get({ key: seriesId })
      .then(seriesEntry => {
        if (seriesEntry) {
          applySortPrefs(JSON.parse(seriesEntry.value), true);
          return;
        }
        return PreferencesManager.get({ key: GLOBAL_SORT_PREFS_KEY }).then(globalEntry => {
          applySortPrefs(globalEntry ? JSON.parse(globalEntry.value) : DEFAULT_SORT_PREFS, false);
        });
      })
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
      PreferencesManager.put({ key: seriesId, value: JSON.stringify(prefs), domain: CHAPTER_SORT_PREFS_DOMAIN });
    },
    [seriesId, sortProgressPercent, applySortPrefs],
  );

  // Removes the per-series override and falls back to the global default (or the hardcoded
  // default if no global was ever saved either).
  const resetSortPrefs = useCallback(() => {
    PreferencesManager.delete({ key: seriesId })
      .then(() => PreferencesManager.get({ key: GLOBAL_SORT_PREFS_KEY }))
      .then(globalEntry => {
        applySortPrefs(globalEntry ? JSON.parse(globalEntry.value) : DEFAULT_SORT_PREFS, false);
      });
  }, [seriesId, applySortPrefs]);

  const toggleSortOrder = useCallback(() => {
    setSortMode(current => SORT_CYCLE[(SORT_CYCLE.indexOf(current) + 1) % SORT_CYCLE.length]);
  }, []);

  // Which chapter to resume at — already decided by the Kotlin digest builder (serie.resumePoint,
  // copied verbatim by SerieTool.normalize); this only looks the chapter up, never recomputes
  // "in progress > first unread > first unfinished" itself.
  const continueChapter = useMemo(() => {
    if (!serie?.resumePoint) {return null;}
    const stoppedAtChapterId = serie.resumePoint.stoppedAtChapterId;
    return serie.chapters.find(c => c.id === stoppedAtChapterId) ?? null;
  }, [serie]);

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

  // Selection mode is real (a plain Set of chapter ids), but the batch actions below are
  // deliberately thin: they just loop the same single-chapter markRead/markUnread this hook
  // already exposes, rather than a dedicated batch call — see chapters.services.ts's own
  // ChapterService (no batch endpoint today).
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

  const markSelectedRead = useCallback(() => {
    selectedIds.forEach(chapterId => markRead({ chapterId }));
    exitSelectionMode();
  }, [selectedIds, markRead, exitSelectionMode]);

  const markSelectedUnread = useCallback(() => {
    selectedIds.forEach(chapterId => markUnread({ chapterId }));
    exitSelectionMode();
  }, [selectedIds, markUnread, exitSelectionMode]);

  return {
    loading,
    refreshing,
    error,
    serie,
    chapters,
    continueChapter,
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
  };
}
