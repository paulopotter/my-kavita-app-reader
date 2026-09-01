import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { PixelRatio } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { ChapterService } from '../../../shared/services/chapters';
import { SerialService } from '../../../shared/services/serials';
import { ChapterEvents, ChapterTool } from '../../../shared/tools/chapters';
import { useEvent, EventBus } from '../../../shared/managers/events';
import { ReadingProgressManager, type ReadingProgressRecord } from '../../../shared/managers/reading-progress';
import type { ChapterDigestSuccess, ChapterNeighborDigestSuccess, SeriesDigestSuccess } from '../../../shared/bridge/digest';
import { ReaderChapter, ReaderAction, State, ViewerState } from '../reader.types';
import { ReaderEvents } from '../reader.events';
import {
  allowScreenOff,
  fetchImmersiveModePref,
  fetchKeepScreenOnPref,
  keepScreenOn as keepScreenOnBridge,
  setImmersiveMode,
} from '../ReaderService';

// Task 029 — the reader, on the new stack (ChapterService/SerialService/ChapterTool):
//  - Fase 1: reads the current chapter from ChapterService.getFull → ChapterDigest.
//  - Fase 2: mark via ChapterTool (emits ChapterEvents), server progress via ChapterService.progress,
//    reacts to ChapterEvents from other screens, emits ReaderEvents.progressChanged, series name.
//  - Fase 4: local reading position on ReadingProgressManager; resolveInitialPage picks the newest
//    of {local, server} by timestamp.
//  - Fase 3: the trio (prev/curr/next) + infinite chapter navigation.
//
// Navigation model (matches ReaderPageList.kt): the native list is handed the whole trio as
// `blocks` and scrolls CONTINUOUSLY between them on its own. When the user scrolls into a
// neighbour it reports `onVisiblePageChanged(neighbourChapterId, pageIndex, ...)` — an atomic,
// self-consistent payload (chapterId/pageIndex/fraction all from the same chapter; on a crossing
// pageIndex is 0 going forward, the last page going back). The hook just BELIEVES that: it slides
// the "logical curr" (curr→prev, next→curr) using the ReaderChapters ALREADY in the trio (no
// re-fetch), and loads only the new edge neighbour. The overlay arrows do the exact same slide,
// plus a one-shot scroll to the target's first page. switchChapter (a real ChapterService.getFull)
// is only for opening the screen.

const LOCAL_SAVE_INTERVAL_MS = 2_000;
const SERVER_SYNC_INTERVAL_MS = 20_000;
const READ_THRESHOLD_FRACTION = 0.98;
const OVERSCROLL_TRIGGER_DP = 72;

// ── digest → ReaderChapter ───────────────────────────────────────────────

function chapterFromDigest(
  digest: ChapterDigestSuccess | ChapterNeighborDigestSuccess,
): ReaderChapter {
  const list = digest.pages.list;
  return {
    id: digest.id,
    seriesId: digest.seriesId,
    number: digest.number,
    decimalNumber: digest.decimalNumber,
    specialLabel: digest.specialLabel,
    isSpecial: digest.isSpecial,
    title: digest.title,
    readStatus: digest.readStatus,
    pageCount: digest.pages.count ?? list.length,
    pagesRead: digest.pages.readCount ?? 0,
    pageUrls: list.map(p => (p.isSuccess ? p.url : '')),
    pageAspectRatios: list.map(p =>
      p.isSuccess && p.width && p.height && p.width > 0 ? p.height / p.width : null,
    ),
    serverResume:
      digest.pages.resumePoint?.stoppedAtPageIndex != null
        ? {
            page: digest.pages.resumePoint.stoppedAtPageIndex,
            recordedAtEpochMs: digest.pages.resumePoint.recordedAtEpochMs ?? null,
          }
        : null,
    hasPages: list.length > 0,
  };
}

export const toReaderChapter = chapterFromDigest as (d: ChapterDigestSuccess) => ReaderChapter;

// A placeholder chapter from the series-order list alone — no pages yet, filled by loadPages.
function placeholderChapterFromOrder(o: OrderedChapter): ReaderChapter {
  return {
    id: o.id,
    seriesId: o.seriesId,
    number: o.number,
    decimalNumber: o.decimalNumber,
    specialLabel: o.specialLabel,
    isSpecial: o.isSpecial,
    title: o.title,
    readStatus: o.readStatus,
    pageCount: 0,
    pagesRead: 0,
    pageUrls: [],
    pageAspectRatios: [],
    serverResume: null,
    hasPages: false,
  };
}

// The chapter's `number` from the series order (SerieDigest.chapters.list, 1-indexed position) —
// the SAME value the series screen shows. ChapterService.getFull called in isolation gives a
// DIFFERENT `number` (decimalNumber truncated), so anywhere the reader shows "Capítulo N" it must
// use this, not the digest's own. Falls back to the chapter's own number when the order isn't
// loaded yet or the chapter isn't in it.
function withOrderNumber(c: ReaderChapter, order: OrderedChapter[]): ReaderChapter {
  const o = order.find(x => x.id === c.id);
  return o && o.number != null && o.number !== c.number ? { ...c, number: o.number } : c;
}

export function isChapterEffectivelyRead(c: ReaderChapter): boolean {
  if (c.readStatus === 'READ') {return true;}
  if (c.pageCount <= 0) {return false;}
  return c.pagesRead / c.pageCount >= READ_THRESHOLD_FRACTION;
}

// Where to open the chapter. Priority: read-status → newest of (local, server) → start.
//  1. Effectively read → page 0 ("marking it read means 'reread from the start'").
//  2. Otherwise local progress vs the server resume point compete by timestamp — newest wins.
//     Missing timestamps: a local record with no server timestamp wins; a server point with no
//     local record wins.
//  3. Nothing → page 0.
export function resolveInitialPage(
  c: ReaderChapter,
  local: ReadingProgressRecord | null,
): { page: number; scrollFraction: number } {
  if (isChapterEffectivelyRead(c)) {return { page: 0, scrollFraction: 0 };}

  const server = c.serverResume;
  if (local && server) {
    const localWins =
      server.recordedAtEpochMs == null || local.updatedAtEpochMs >= server.recordedAtEpochMs;
    return localWins
      ? { page: local.page, scrollFraction: local.scrollFraction }
      : { page: server.page, scrollFraction: 0 };
  }
  if (local) {return { page: local.page, scrollFraction: local.scrollFraction };}
  if (server) {return { page: server.page, scrollFraction: 0 };}
  return { page: 0, scrollFraction: 0 };
}

export function shouldUnmarkOnReread(
  wasReadOnOpen: boolean,
  currentPage: number,
  totalPages: number,
  alreadyUnmarkedThisSession: boolean,
): boolean {
  if (!wasReadOnOpen || alreadyUnmarkedThisSession) {return false;}
  return currentPage < totalPages - 1;
}

// Reading order (ascending by number) — the sequence prev/next depend on, not the display sort.
export interface OrderedChapter {
  id: string;
  seriesId: string;
  number?: number;
  decimalNumber?: number;
  specialLabel?: string;
  isSpecial?: boolean;
  title: string;
  readStatus: ReaderChapter['readStatus'];
}

// Pure: the ids immediately before/after `id` in a reading-ordered list (or null at the ends).
export function neighborsOfIn(
  list: OrderedChapter[],
  id: string,
): { prevId: string | null; nextId: string | null } {
  const i = list.findIndex(c => c.id === id);
  if (i === -1) {return { prevId: null, nextId: null };}
  return {
    prevId: i > 0 ? list[i - 1].id : null,
    nextId: i < list.length - 1 ? list[i + 1].id : null,
  };
}

export function toOrderedChapters(digest: SeriesDigestSuccess): OrderedChapter[] {
  const list = (digest.chapters?.list ?? [])
    .filter((c): c is ChapterDigestSuccess => c.isSuccess)
    .map(c => ({
      id: c.id,
      seriesId: c.seriesId,
      number: c.number,
      decimalNumber: c.decimalNumber,
      specialLabel: c.specialLabel,
      isSpecial: c.isSpecial,
      title: c.title,
      readStatus: c.readStatus,
    }));
  return list.sort((a, b) => {
    const na = a.number ?? a.decimalNumber;
    const nb = b.number ?? b.decimalNumber;
    if (na != null && nb != null && na !== nb) {return na - nb;}
    if (na != null && nb == null) {return -1;}
    if (na == null && nb != null) {return 1;}
    return a.title.localeCompare(b.title);
  });
}

// ── reducer ──────────────────────────────────────────────────────────────

export const initial: State = {
  loading: true,
  error: null,
  viewer: null,
  seriesName: '',
  overlayVisible: false,
  currentVisiblePage: 0,
  scrollToPageRequest: null,
  scrollToChapterId: null,
  scrollFraction: 0,
  chapterFraction: 0,
  offline: false,
  isSwitching: false,
};

export function reducer(state: State, action: ReaderAction): State {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null };
    case 'ERROR':
      return { ...state, loading: false, error: action.error, isSwitching: false };
    case 'VIEWER_READY':
      return {
        ...state,
        loading: false,
        error: null,
        isSwitching: false,
        viewer: action.viewer,
        currentVisiblePage: action.initialPage,
        scrollToPageRequest: action.scrollToChapterId != null ? action.initialPage : null,
        scrollToChapterId: action.scrollToChapterId ?? null,
        scrollFraction: action.initialScrollFraction,
        chapterFraction: action.initialChapterFraction,
      };
    case 'SET_VIEWER':
      return {
        ...state,
        viewer: action.viewer,
        currentVisiblePage: action.page,
        scrollFraction: action.scrollFraction,
        chapterFraction: action.chapterFraction,
        isSwitching: false,
      };
    case 'SET_TRIO_SLOT': {
      if (!state.viewer) {return state;}
      // A placeholder being installed into an empty slot (reconcile) OR real pages replacing a
      // placeholder already there (loadPages). Skip only if a different chapter now holds the slot
      // (a fast slide moved things) — but always allow filling an empty slot.
      const held = state.viewer[action.slot];
      if (held && held.id !== action.chapter.id) {return state;}
      return { ...state, viewer: { ...state.viewer, [action.slot]: action.chapter } };
    }
    case 'PATCH_NUMBERS': {
      if (!state.viewer) {return state;}
      const patch = (c: ReaderChapter | null): ReaderChapter | null => {
        if (!c) {return c;}
        const n = action.numberById[c.id];
        return n != null && n !== c.number ? { ...c, number: n } : c;
      };
      return {
        ...state,
        viewer: {
          prev: patch(state.viewer.prev),
          curr: patch(state.viewer.curr) ?? state.viewer.curr,
          next: patch(state.viewer.next),
        },
      };
    }
    case 'SET_CURRENT_PAGE':
      return {
        ...state,
        currentVisiblePage: action.page,
        scrollFraction: action.scrollFraction,
        chapterFraction: action.chapterFraction,
      };
    case 'SCROLL_TO_PAGE':
      return {
        ...state,
        currentVisiblePage: action.page,
        scrollToPageRequest: action.page,
        scrollToChapterId: state.viewer?.curr.id ?? null,
      };
    case 'SCROLL_TO_CHAPTER':
      // Overlay arrow: the target chapter is already in `blocks` — just ask the native list to
      // scroll to its page, and (via `viewer`) make it the logical curr.
      return {
        ...state,
        viewer: action.viewer,
        currentVisiblePage: action.page,
        scrollToPageRequest: action.page,
        scrollToChapterId: action.chapterId,
        scrollFraction: 0,
      };
    case 'SCROLL_TO_PAGE_HANDLED':
      return { ...state, scrollToPageRequest: null, scrollToChapterId: null };
    case 'SERIES_NAME_LOADED':
      return { ...state, seriesName: action.seriesName };
    case 'TOGGLE_OVERLAY':
      return { ...state, overlayVisible: !state.overlayVisible };
    case 'SET_OFFLINE':
      return { ...state, offline: action.offline };
    case 'SET_SWITCHING':
      return { ...state, isSwitching: action.isSwitching };
    case 'OPTIMISTIC_MARK_READ':
    case 'OPTIMISTIC_MARK_UNREAD': {
      if (!state.viewer) {return state;}
      const readStatus = action.type === 'OPTIMISTIC_MARK_READ' ? 'READ' : 'UNREAD';
      const applyTo = (c: ReaderChapter | null): ReaderChapter | null =>
        c && c.id === action.chapterId
          ? { ...c, readStatus, pagesRead: readStatus === 'READ' ? c.pageCount : 0 }
          : c;
      return {
        ...state,
        viewer: {
          prev: applyTo(state.viewer.prev),
          curr: applyTo(state.viewer.curr) ?? state.viewer.curr,
          next: applyTo(state.viewer.next),
        },
      };
    }
  }
}

// ── hook ─────────────────────────────────────────────────────────────────

export function useReader(seriesId: string, chapterId: string, seriesNameHint?: string) {
  const [state, dispatch] = useReducer(
    reducer,
    seriesNameHint ? { ...initial, seriesName: seriesNameHint } : initial,
  );

  const viewerRef = useRef<ViewerState | null>(null);
  viewerRef.current = state.viewer;
  const currentPageRef = useRef(0);
  currentPageRef.current = state.currentVisiblePage;
  const scrollFractionRef = useRef(0);
  scrollFractionRef.current = state.scrollFraction;
  const chapterFractionRef = useRef(0);
  chapterFractionRef.current = state.chapterFraction;

  const orderedChaptersRef = useRef<OrderedChapter[]>([]);
  const orderReadyRef = useRef(false);
  const [orderReadyTick, setOrderReadyTick] = useState(0);

  const lastSyncedPageRef = useRef<Map<string, number>>(new Map());
  const suppressServerSyncRef = useRef<Set<string>>(new Set());
  const sessionMarkedReadRef = useRef<Set<string>>(new Set());
  const sessionUnmarkedRef = useRef<Set<string>>(new Set());
  const wasReadOnOpenRef = useRef<Map<string, boolean>>(new Map());

  const localTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── mark read / unread (via ChapterTool — emits ChapterEvents) ─────────
  const applyMarkUpdate = useCallback(
    (update: { chapterId: string; readStatus: 'READ' | 'IN_PROGRESS' | 'UNREAD' }) => {
      dispatch({
        type: update.readStatus === 'READ' ? 'OPTIMISTIC_MARK_READ' : 'OPTIMISTIC_MARK_UNREAD',
        chapterId: update.chapterId,
      });
    },
    [],
  );

  const markAsReadIfNeeded = useCallback(
    async (chapter: ReaderChapter) => {
      if (sessionMarkedReadRef.current.has(chapter.id)) {return;}
      sessionMarkedReadRef.current.add(chapter.id);
      suppressServerSyncRef.current.add(chapter.id);
      await ChapterTool.mark.read({
        seriesId: chapter.seriesId,
        chapterId: chapter.id,
        prevStatus: chapter.readStatus,
        onUpdate: applyMarkUpdate,
      });
    },
    [applyMarkUpdate],
  );

  const unmarkIfRereading = useCallback(
    async (chapter: ReaderChapter, currentPage: number, totalPages: number) => {
      const wasReadOnOpen = wasReadOnOpenRef.current.get(chapter.id) ?? false;
      if (
        !shouldUnmarkOnReread(
          wasReadOnOpen,
          currentPage,
          totalPages,
          sessionUnmarkedRef.current.has(chapter.id),
        )
      ) {
        return;
      }
      sessionUnmarkedRef.current.add(chapter.id);
      await ChapterTool.mark.unread({
        seriesId: chapter.seriesId,
        chapterId: chapter.id,
        prevStatus: chapter.readStatus,
        onUpdate: applyMarkUpdate,
      });
    },
    [applyMarkUpdate],
  );

  useEvent(ChapterEvents.readStatusChanged, payload => {
    const viewer = viewerRef.current;
    if (!viewer) {return;}
    const inTrio =
      viewer.curr.id === payload.chapter.id ||
      viewer.prev?.id === payload.chapter.id ||
      viewer.next?.id === payload.chapter.id;
    if (!inTrio) {return;}
    dispatch({
      type: payload.changed.readStatus === 'READ' ? 'OPTIMISTIC_MARK_READ' : 'OPTIMISTIC_MARK_UNREAD',
      chapterId: payload.chapter.id,
    });
  });

  // ── series order (SerialService.get, light) ──────────────────────────
  useEffect(() => {
    let cancelled = false;
    SerialService.get({ seriesId })
      .then(digest => {
        // [Reader][diag] candidato a task de debug (nav Fase 3): confirmar que a lista de
        // capítulos da série carrega (isSuccess + chapters.list). orderedLen=0 mata prev/next.
        // eslint-disable-next-line no-console
        console.log(`[Reader][diag] SerialService.get isSuccess=${digest.isSuccess} chapters=${digest.isSuccess ? (digest.chapters ? `list(${digest.chapters.list?.length ?? 'undef'})` : 'null') : 'n/a'}`);
        if (cancelled || !digest.isSuccess) {return;}
        orderedChaptersRef.current = toOrderedChapters(digest);
        orderReadyRef.current = true;
        setOrderReadyTick(t => t + 1);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [seriesId]);

  // ── loadPages — fetch a chapter's pages and merge them into whatever trio slot it now occupies ──
  // (`prev`, `curr` or `next` — a fast arrow tap can promote a placeholder straight to curr before
  // its prefetch lands). No-op if the id has left the trio, or already has pages.
  // `baseViewer` is the trio slideTrio just computed but hasn't rendered yet — viewerRef still holds
  // the pre-slide trio, so without it a load kicked off from slideTrio for the new EDGE would see
  // that id in no slot and bail.
  const loadPages = useCallback(
    async (chapterIdToLoad: string, baseViewer?: ViewerState) => {
      const before = baseViewer ?? viewerRef.current;
      if (!before) {return;}
      const slotOf = (v: ViewerState): 'prev' | 'curr' | 'next' | null =>
        v.prev?.id === chapterIdToLoad ? 'prev' : v.curr.id === chapterIdToLoad ? 'curr' : v.next?.id === chapterIdToLoad ? 'next' : null;
      const slot = slotOf(before);
      if (!slot || before[slot]?.hasPages) {return;}
      try {
        const digest = await ChapterService.getFull({ seriesId, chapterId: chapterIdToLoad });
        if (!digest.isSuccess) {return;}
        const after = viewerRef.current;
        if (!after) {return;}
        const nowSlot = slotOf(after);
        if (!nowSlot) {return;} // left the trio while loading
        dispatch({
          type: 'SET_TRIO_SLOT',
          slot: nowSlot,
          chapter: withOrderNumber(chapterFromDigest(digest), orderedChaptersRef.current),
        });
      } catch {
        /* leave the placeholder — its block still renders */
      }
    },
    [seriesId],
  );

  // Given the current chapter id and a direction, the neighbour id one further out (or null).
  const edgeNeighborId = useCallback(
    (currId: string, dir: 'prev' | 'next'): string | null => {
      const { prevId, nextId } = neighborsOfIn(orderedChaptersRef.current, currId);
      return dir === 'prev' ? prevId : nextId;
    },
    [],
  );

  const placeholderById = useCallback((id: string | null): ReaderChapter | null => {
    if (!id) {return null;}
    const o = orderedChaptersRef.current.find(c => c.id === id);
    return o ? placeholderChapterFromOrder(o) : null;
  }, []);

  // ── switchChapter — opening the screen (or a non-adjacent jump) ──────
  // The ONLY path that does a ChapterService.getFull for a brand-new curr. Natural scroll and the
  // arrows never come here — they slide the trio (below) using chapters already loaded.
  const latestOpenTargetRef = useRef<string | null>(null);
  // The logical curr id — the single source of truth for "which chapter the user is in", set
  // synchronously by switchChapter/slideTrio (before the next render).
  const logicalCurrIdRef = useRef<string | null>(null);
  // A slide (arrow or crossing) just happened. The native list keeps reporting the chapter we
  // LEFT for a bit while it repositions — and that chapter is now a neighbour of the new trio, so
  // acting on it would slide straight back (the ida-e-volta bug). While a slide is settling, IGNORE
  // every report except the one confirming the new logical curr. Time-boxed so a native list that
  // never sends that exact id (fast successive arrows) can't wedge navigation forever.
  const slideSettlingUntilRef = useRef(0);
  const SLIDE_SETTLE_MS = 1200;

  const switchChapter = useCallback(
    async (targetChapterId: string, opts?: { startAtBeginning?: boolean }) => {
      latestOpenTargetRef.current = targetChapterId;
      dispatch({ type: 'SET_SWITCHING', isSwitching: true });
      dispatch({ type: 'LOADING' });
      try {
        const digest = await ChapterService.getFull({ seriesId, chapterId: targetChapterId });
        if (latestOpenTargetRef.current !== targetChapterId) {return;}
        if (!digest.isSuccess) {
          dispatch({ type: 'ERROR', error: digest.error.message ?? 'Failed to load chapter' });
          return;
        }
        const order = orderedChaptersRef.current;
        const curr = withOrderNumber(chapterFromDigest(digest), order);

        const local = opts?.startAtBeginning ? null : await ReadingProgressManager.get(curr.id);
        if (latestOpenTargetRef.current !== targetChapterId) {return;}

        const initialProgress = opts?.startAtBeginning
          ? { page: 0, scrollFraction: 0 }
          : resolveInitialPage(curr, local);

        const embeddedPrev = digest.prevChapter?.isSuccess ? chapterFromDigest(digest.prevChapter) : null;
        const embeddedNext = digest.nextChapter?.isSuccess ? chapterFromDigest(digest.nextChapter) : null;
        const { prevId, nextId } = neighborsOfIn(order, curr.id);
        const prev = (embeddedPrev && withOrderNumber(embeddedPrev, order)) ?? placeholderById(prevId);
        const next = (embeddedNext && withOrderNumber(embeddedNext, order)) ?? placeholderById(nextId);

        const initialChapterFraction =
          curr.pageUrls.length > 1
            ? Math.min(
                0.9,
                (initialProgress.page + initialProgress.scrollFraction) / (curr.pageUrls.length - 1),
              )
            : 0;

        logicalCurrIdRef.current = curr.id;
        slideSettlingUntilRef.current = 0;
        dispatch({
          type: 'VIEWER_READY',
          viewer: { prev, curr, next },
          initialPage: initialProgress.page,
          initialScrollFraction: initialProgress.scrollFraction,
          initialChapterFraction,
          scrollToChapterId: curr.id,
        });

        if (prev && !prev.hasPages) {loadPages(prev.id);}
        if (next && !next.hasPages) {loadPages(next.id);}
      } catch (e: unknown) {
        if (latestOpenTargetRef.current !== targetChapterId) {return;}
        dispatch({ type: 'ERROR', error: e instanceof Error ? e.message : 'Unknown error' });
      }
    },
    [seriesId, placeholderById, loadPages],
  );

  const loadChapter = useCallback(
    (targetChapterId: string, startAtBeginning = false) =>
      switchChapter(targetChapterId, startAtBeginning ? { startAtBeginning: true } : undefined),
    [switchChapter],
  );

  useEffect(() => {
    switchChapter(chapterId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  // ── slide the trio: curr→prev + next→curr (dir 'next'), mirror for 'prev' ──
  // Uses the ReaderChapters ALREADY in the trio — no re-fetch of the chapter that becomes curr
  // (it was `next`, fully loaded when it entered the trio). Only the new edge is fetched. Takes
  // the CURRENT viewer explicitly (never reads viewerRef, which lags a render behind and would
  // make two quick slides compound the wrong trio — the "[curr,next] loses prev" bug).
  const slideTrio = useCallback(
    (from: ViewerState, dir: 'next' | 'prev'): ViewerState | null => {
      const incoming = dir === 'next' ? from.next : from.prev;
      if (!incoming) {return null;}

      const leaving = from.curr;
      if (chapterFractionRef.current >= READ_THRESHOLD_FRACTION) {
        markAsReadIfNeeded(leaving);
      }

      const newEdge = placeholderById(edgeNeighborId(incoming.id, dir));
      const newViewer: ViewerState =
        dir === 'next'
          ? { prev: leaving, curr: incoming, next: newEdge }
          : { prev: newEdge, curr: incoming, next: leaving };

      // The chapter becoming curr may still be a placeholder (fast arrow taps outrun its
      // prefetch) — fetch its pages too, on the same side it sits. Pass newViewer: viewerRef still
      // holds the pre-slide trio until the dispatch below renders.
      if (!incoming.hasPages) {loadPages(incoming.id, newViewer);}
      if (newEdge && !newEdge.hasPages) {loadPages(newEdge.id, newViewer);}
      return newViewer;
    },
    [markAsReadIfNeeded, edgeNeighborId, placeholderById, loadPages],
  );

  // ── the native list reports where the user is (atomic payload — see ReaderPageList.kt) ──
  // The hook OWNS the decision. ReaderScreen is dumb: it forwards this verbatim.
  const onNativePosition = useCallback(
    (chapterId_: string, page: number, pageFraction: number, chapterFraction: number) => {
      const v = viewerRef.current;
      if (!v) {return;}
      const logicalCurrId = logicalCurrIdRef.current ?? v.curr.id;

      // The report is for the chapter the user is logically in → just update position, and clear
      // any settling window (the native list has caught up).
      if (chapterId_ === logicalCurrId) {
        slideSettlingUntilRef.current = 0;
        dispatch({ type: 'SET_CURRENT_PAGE', page, scrollFraction: pageFraction, chapterFraction });
        return;
      }

      // A slide is still settling — the native list is repositioning and keeps reporting the
      // chapter we left (now a neighbour). Ignore everything until it confirms the new curr.
      if (Date.now() < slideSettlingUntilRef.current) {
        // eslint-disable-next-line no-console
        console.log(`[Reader][diag] onNativePosition IGNORED (settling) ch=${chapterId_} logicalCurr=${logicalCurrId}`);
        return;
      }

      // Not settling → this is a real natural-scroll crossing into a trio neighbour.
      const dir: 'next' | 'prev' | null =
        v.next && chapterId_ === v.next.id ? 'next' : v.prev && chapterId_ === v.prev.id ? 'prev' : null;
      if (!dir) {return;} // not a trio neighbour — ignore
      const nv = slideTrio(v, dir);
      if (!nv) {return;}
      // eslint-disable-next-line no-console
      console.log(`[Reader][diag] onNativePosition CROSSED dir=${dir} report=${chapterId_} newTrio=[${nv.prev?.id ?? 'null'},${nv.curr.id},${nv.next?.id ?? 'null'}]`);
      logicalCurrIdRef.current = nv.curr.id;
      slideSettlingUntilRef.current = Date.now() + SLIDE_SETTLE_MS;
      dispatch({ type: 'SET_VIEWER', viewer: nv, page: 0, scrollFraction: 0, chapterFraction: 0 });
    },
    [slideTrio],
  );

  // ── overlay arrows / overscroll — same slide, plus a scroll to the target's first page ──
  // The switch happens IMMEDIATELY even when the new curr has no pages yet: the trio slides (header
  // updates on the spot), ReaderScreen shows a spinner over the reading area while loadPages fills
  // it in, and a one-shot SCROLL_TO_CHAPTER lands the native list on that chapter's first page.
  // pendingScrollToRef re-fires the scroll once the pages arrive, because the very first
  // SCROLL_TO_CHAPTER hits a block with no ListEntry.Page (native LaunchedEffect finds -1, clears
  // the request without scrolling).
  const pendingScrollToRef = useRef<string | null>(null);

  const goToAdjacent = useCallback(
    (dir: 'next' | 'prev') => {
      const v = viewerRef.current;
      if (!v) {return;}
      const nv = slideTrio(v, dir);
      if (!nv) {return;}
      // eslint-disable-next-line no-console
      console.log(`[Reader][diag] goToAdjacent dir=${dir} from=${v.curr.id} newTrio=[${nv.prev?.id ?? 'null'},${nv.curr.id},${nv.next?.id ?? 'null'}] hasPages=${nv.curr.hasPages}`);
      logicalCurrIdRef.current = nv.curr.id;
      slideSettlingUntilRef.current = Date.now() + SLIDE_SETTLE_MS;
      pendingScrollToRef.current = nv.curr.hasPages ? null : nv.curr.id;
      dispatch({ type: 'SCROLL_TO_CHAPTER', viewer: nv, chapterId: nv.curr.id, page: 0 });
    },
    [slideTrio],
  );

  // Re-fire SCROLL_TO_CHAPTER once the pending chapter (new curr) gets its pages — the first
  // dispatch above ran against a placeholder block the native list couldn't scroll to.
  useEffect(() => {
    const pendingId = pendingScrollToRef.current;
    if (!pendingId) {return;}
    const v = state.viewer;
    if (!v || v.curr.id !== pendingId || !v.curr.hasPages) {return;}
    // eslint-disable-next-line no-console
    console.log(`[Reader][diag] deferred SCROLL_TO_CHAPTER now firing for ${pendingId}`);
    pendingScrollToRef.current = null;
    dispatch({ type: 'SCROLL_TO_CHAPTER', viewer: v, chapterId: pendingId, page: 0 });
  }, [state.viewer]);

  const goToNextChapterManual = useCallback(async () => goToAdjacent('next'), [goToAdjacent]);
  const goToPrevChapterManual = useCallback(async () => goToAdjacent('prev'), [goToAdjacent]);

  // ── reconcile the trio once the series order lands (mount race) ──────
  useEffect(() => {
    if (!orderReadyRef.current) {return;}
    const v = viewerRef.current;
    if (!v) {return;}
    // The trio may have been built with the isolated (wrong) `number`; re-apply the series-order
    // one so "Capítulo N" matches the series screen.
    const numberById: Record<string, number> = {};
    for (const o of orderedChaptersRef.current) {
      if (o.number != null) {numberById[o.id] = o.number;}
    }
    dispatch({ type: 'PATCH_NUMBERS', numberById });

    const { prevId, nextId } = neighborsOfIn(orderedChaptersRef.current, v.curr.id);
    if (!v.prev && prevId) {
      const ph = placeholderById(prevId);
      if (ph) {
        dispatch({ type: 'SET_TRIO_SLOT', slot: 'prev', chapter: ph });
        loadPages(prevId);
      }
    }
    if (!v.next && nextId) {
      const ph = placeholderById(nextId);
      if (ph) {
        dispatch({ type: 'SET_TRIO_SLOT', slot: 'next', chapter: ph });
        loadPages(nextId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderReadyTick, state.viewer?.curr.id]);

  // ── series name (fast-path hint or fallback fetch) ───────────────────
  useEffect(() => {
    if (seriesNameHint) {return;}
    let cancelled = false;
    SerialService.get({ seriesId })
      .then(digest => {
        if (!cancelled && digest.isSuccess) {
          dispatch({ type: 'SERIES_NAME_LOADED', seriesName: digest.name });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [seriesId, seriesNameHint]);

  // ── wasReadOnOpen per chapter ────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) {return;}
    const curr = viewer.curr;
    if (!wasReadOnOpenRef.current.has(curr.id)) {
      wasReadOnOpenRef.current.set(curr.id, isChapterEffectivelyRead(curr));
    }
  }, [state.viewer]);

  // ── progress timers: local every 2s, server every 20s ──────────────
  useEffect(() => {
    const viewer = state.viewer;
    if (!viewer) {return undefined;}
    const { id: chId, seriesId: chSeriesId } = viewer.curr;

    localTimerRef.current = setInterval(() => {
      ReadingProgressManager.set(chId, {
        seriesId: chSeriesId,
        page: currentPageRef.current,
        scrollFraction: scrollFractionRef.current,
      }).catch(() => {});
    }, LOCAL_SAVE_INTERVAL_MS);

    syncTimerRef.current = setInterval(() => {
      const page = currentPageRef.current;
      if (page === lastSyncedPageRef.current.get(chId)) {return;}
      if (suppressServerSyncRef.current.has(chId)) {return;}
      ChapterService.progress
        .set({ seriesId: chSeriesId, chapterId: chId, pageIndex: page })
        .then(() => {
          lastSyncedPageRef.current.set(chId, page);
          EventBus.emit(ReaderEvents.progressChanged, { seriesId: chSeriesId, chapterId: chId, pageIndex: page });
        })
        .catch(() => {});
    }, SERVER_SYNC_INTERVAL_MS);

    return () => {
      if (localTimerRef.current) {clearInterval(localTimerRef.current);}
      if (syncTimerRef.current) {clearInterval(syncTimerRef.current);}
    };
  }, [state.viewer]);

  // ── mark-as-read at 98% / unmark on reread ────────────────────────
  const lastProcessedPageChapterIdRef = useRef<string | null>(null);
  useEffect(() => {
    const viewer = state.viewer;
    if (!viewer) {return;}
    const curr = viewer.curr;
    const isFirstRenderOfChapter = lastProcessedPageChapterIdRef.current !== curr.id;
    lastProcessedPageChapterIdRef.current = curr.id;
    if (!isFirstRenderOfChapter) {
      unmarkIfRereading(curr, state.currentVisiblePage, curr.pageUrls.length);
    }
    if (curr.pageUrls.length > 0 && state.chapterFraction >= READ_THRESHOLD_FRACTION) {
      markAsReadIfNeeded(curr);
    }
  }, [
    state.viewer,
    state.currentVisiblePage,
    state.chapterFraction,
    markAsReadIfNeeded,
    unmarkIfRereading,
  ]);

  const onScreenExit = useCallback(async () => {
    if (localTimerRef.current) {clearInterval(localTimerRef.current);}
    if (syncTimerRef.current) {clearInterval(syncTimerRef.current);}
    const viewer = viewerRef.current;
    if (!viewer) {return;}
    const curr = viewer.curr;
    ReadingProgressManager.set(curr.id, {
      seriesId: curr.seriesId,
      page: currentPageRef.current,
      scrollFraction: scrollFractionRef.current,
    }).catch(() => {});
    if (!isChapterEffectivelyRead(curr)) {
      ChapterService.progress
        .set({ seriesId: curr.seriesId, chapterId: curr.id, pageIndex: currentPageRef.current })
        .catch(() => {});
    }
  }, []);

  // ── keep screen on / immersive / offline ──────────────────────────
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

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(netState => {
      dispatch({ type: 'SET_OFFLINE', offline: netState.isConnected === false });
    });
    return () => unsubscribe();
  }, []);

  // ── overlay / scroll plumbing ────────────────────────────────────
  const toggleOverlay = useCallback(() => dispatch({ type: 'TOGGLE_OVERLAY' }), []);
  const scrollToPage = useCallback((page: number) => dispatch({ type: 'SCROLL_TO_PAGE', page }), []);
  const handleScrollToPageHandled = useCallback(
    () => dispatch({ type: 'SCROLL_TO_PAGE_HANDLED' }),
    [],
  );
  // Kept for back-compat with any caller still using the old name; forwards to onNativePosition.
  const setCurrentPage = useCallback(
    (page: number, scrollFraction: number, chapterFraction: number) => {
      const v = viewerRef.current;
      if (v) {onNativePosition(v.curr.id, page, scrollFraction, chapterFraction);}
    },
    [onNativePosition],
  );

  // ── overscroll at the top → previous chapter ─────────────────────
  const overscrollArmedRef = useRef(true);
  const overscrollTriggerPx = PixelRatio.getPixelSizeForLayoutSize(OVERSCROLL_TRIGGER_DP);
  const handleScroll = useCallback(
    (contentOffsetY: number, isFirstItemChapterHeader: boolean) => {
      if (
        contentOffsetY < -overscrollTriggerPx &&
        isFirstItemChapterHeader &&
        overscrollArmedRef.current
      ) {
        overscrollArmedRef.current = false;
        goToAdjacent('prev');
      }
    },
    [overscrollTriggerPx, goToAdjacent],
  );
  const handleScrollEndDrag = useCallback((contentOffsetY: number) => {
    if (contentOffsetY >= 0) {overscrollArmedRef.current = true;}
  }, []);

  return {
    ...state,
    dispatch,
    toggleOverlay,
    scrollToPage,
    handleScrollToPageHandled,
    setCurrentPage,
    onNativePosition,
    onScreenExit,
    markAsReadIfNeeded,
    unmarkIfRereading,
    loadChapter,
    switchChapter,
    goToAdjacent,
    goToNextChapterManual,
    goToPrevChapterManual,
    handleScroll,
    handleScrollEndDrag,
  };
}
