// Reader V2 — pure transforms. No I/O, no React, no hooks. Everything here is directly
// unit-testable. The most important one is computeWindowAfterFocusMove — the pure core of
// moveFocus, whose test proves the 26→28 race can't recur.

import type {
  ChapterDigestSuccess,
  ChapterNeighborDigestSuccess,
  SerialDigestSuccess,
} from '../../../shared/bridge/digest';
import type {
  FocusMoveTrigger,
  LoadedChapterEntry,
  OrderedChapter,
  ReaderChapter,
  ReaderWindow,
} from '../reader.types';

// "Practically finished" cutoff — used both for auto-mark-as-read while scrolling
// (chapterFraction >= this) and for isChapterEffectivelyRead (pagesRead / pageCount >= this).
// 0.95, not 0.98: chapterFraction measures the viewport's bottom edge against the chapter's
// total pixel height, so the last ~1 viewport of a chapter never counts (there's nothing below
// to scroll it past). On a webtoon whose final page is many thousands of px tall, 0.98 means
// the user has to drag through almost the entire last page before it marks — they routinely
// reach the visible end and stop with the fraction stuck around 0.95-0.97. 0.95 marks it when
// they've genuinely seen the chapter through. (device log v40/v41: fraction climbs past 0.98
// only in the final few hundred px of an ~19000px last page.)
export const READ_THRESHOLD_FRACTION = 0.95;

// How far ahead of / behind the focus the window keeps at least one loaded-or-placeholder entry.
// The window is append-only (see computeWindowAfterFocusMove) — this is the "grow" trigger, not a
// fixed size.
export const WINDOW_EDGE_LOOKAHEAD = 1;

// ── native scroll report → FocusMoveTrigger (webtoon) ───────────────────
// Lives here, not in the webtoon adapter, so the hook's onNativePosition (the very first thing a
// native scroll event hits) never depends on the adapter module graph — a module-init ordering
// issue there must not be able to crash the whole app on the first scroll.
export interface WebtoonPositionReport {
  chapterId: string;
  pageIndex: number;
  pageFraction: number;
  chapterFraction: number;
}

export function isWebtoonPositionReport(raw: unknown): raw is WebtoonPositionReport {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    typeof (raw as WebtoonPositionReport).chapterId === 'string' &&
    typeof (raw as WebtoonPositionReport).pageIndex === 'number'
  );
}

export function webtoonReportToTrigger(raw: unknown): FocusMoveTrigger | null {
  if (!isWebtoonPositionReport(raw)) {return null;}
  return {
    source: 'native-scroll',
    reportedChapterId: raw.chapterId,
    page: raw.pageIndex,
    pageFraction: raw.pageFraction,
    chapterFraction: raw.chapterFraction,
  };
}

// ── digest → ReaderChapter ───────────────────────────────────────────────

export function chapterFromDigest(
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
  };
}

// A placeholder chapter from the series-order list alone — no pages yet, filled by a getFull.
export function placeholderChapterFromOrder(o: OrderedChapter): ReaderChapter {
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
  };
}

// The chapter's `number` from the series order (SerialDigest.chapters.list, 1-indexed position) —
// the SAME value the series screen shows. ChapterService.getFull called in isolation gives a
// DIFFERENT `number` (decimalNumber truncated), so anywhere the reader shows "Capítulo N" it must
// use this. Falls back to the chapter's own number when the order isn't loaded / the chapter
// isn't in it.
export function withOrderNumber(c: ReaderChapter, order: OrderedChapter[]): ReaderChapter {
  const o = order.find(x => x.id === c.id);
  return o && o.number != null && o.number !== c.number ? { ...c, number: o.number } : c;
}

// ── read-status helpers ─────────────────────────────────────────────────

export function isChapterEffectivelyRead(c: ReaderChapter): boolean {
  if (c.readStatus === 'READ') {return true;}
  if (c.pageCount <= 0) {return false;}
  return c.pagesRead / c.pageCount >= READ_THRESHOLD_FRACTION;
}

// Where to open the chapter. Priority (see _freshness-principles.md — timestamps are the
// tiebreaker, not source priority):
//  1. Effectively read → page 0 ("marking it read means 'reread from the start'").
//  2. Otherwise local progress vs. the server resume point compete by timestamp — newest wins.
//     A local record with no server timestamp wins; a server point with no local record wins.
//  3. Nothing → page 0.
export function resolveInitialPage(
  c: ReaderChapter,
  local: { page: number; scrollFraction: number; updatedAtEpochMs: number } | null,
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

// ── series order ────────────────────────────────────────────────────────

export function toOrderedChapters(digest: SerialDigestSuccess): OrderedChapter[] {
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

// The ids immediately before/after `id` in a reading-ordered list (or null at the ends).
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

// ── progress bar ────────────────────────────────────────────────────────

export function progressBarFraction(chapterFraction: number): number {
  return Math.min(1, Math.max(0, chapterFraction));
}

// ── window: an APPEND-ONLY list + a focus pointer ────────────────────────
//
// The window's `entries` is only ever grown at the ends (append / prepend) and NEVER reordered or
// trimmed while a reading session is live. This is the fix for the "stuck between two chapters"
// bug: the previous design recentred the window on every crossing, which reshuffled the block
// indices under the native LazyColumn — the list keeps its scroll offset but it now points at a
// different chapter, so the user is wedged at a boundary (device log rc33: focus ping-ponged
// 20677 ↔ 21920 forever). Append-only means every block the native list has ever rendered stays
// at the same index, so its scroll position stays meaningful; the pointer just follows what the
// native list reports.

function placeholderEntry(chapterId: string, order: OrderedChapter[]): LoadedChapterEntry | null {
  const o = order.find(c => c.id === chapterId);
  if (!o) {return null;}
  return { chapter: placeholderChapterFromOrder(o), status: 'placeholder' };
}

// The initial window: [prev?, opened, next?]. The opened chapter is at `focusedIndex` (1 when a
// prev exists, 0 at the series start). The native list REMOUNTS on this fresh `blocks` list (RN
// bumps nativeListKey → the screen re-keys the native view), and its one-shot
// scrollToChapterId/scrollToPageIndex lands the freshly-created LazyColumn on the opened
// chapter's first page — a single scrollToItem during the first composition (not a mid-flight
// jump fighting a surviving scroll position, which is what failed across earlier device builds).
//
// The PREV chapter is included from the start so backward scroll has somewhere to go — without
// it there is simply no block above the opened chapter and the user can't scroll up at all
// (device bug: open on 104, can't reach 103). `neighbors` (from the chapter digest's embedded
// prevChapter/nextChapter) is the source of the prev/next ids: on the very first open the
// canonical series `order` hasn't loaded yet, so relying on it here would drop the prev until
// the user navigates away and back. When `order` IS loaded it's the fallback / cross-check.
export function buildWindow(
  focusChapterId: string,
  order: OrderedChapter[],
  known: ReaderChapter[],
  neighbors?: { prevId?: string | null; nextId?: string | null },
): ReaderWindow {
  const knownById = new Map(known.map(c => [c.id, c]));
  const orderIndex = order.findIndex(c => c.id === focusChapterId);

  const entryFor = (id: string): LoadedChapterEntry => {
    const k = knownById.get(id);
    if (k) {return { chapter: withOrderNumber(k, order), status: 'ready' };}
    const oIdx = order.findIndex(c => c.id === id);
    if (oIdx >= 0) {
      return { chapter: placeholderChapterFromOrder(order[oIdx]), status: 'placeholder' };
    }
    return {
      chapter: {
        id,
        seriesId: known[0]?.seriesId ?? '',
        title: '',
        readStatus: 'UNREAD',
        pageCount: 0,
        pagesRead: 0,
        pageUrls: [],
        pageAspectRatios: [],
        serverResume: null,
      } as ReaderChapter,
      status: 'placeholder',
    };
  };

  const prevId =
    neighbors?.prevId ?? (orderIndex > 0 ? order[orderIndex - 1]?.id : undefined) ?? undefined;
  const nextId =
    neighbors?.nextId ?? (orderIndex >= 0 ? order[orderIndex + 1]?.id : undefined) ?? undefined;

  const entries: LoadedChapterEntry[] = [];
  if (prevId && prevId !== focusChapterId) {entries.push(entryFor(prevId));}
  const focusedIndex = entries.length;
  entries.push(entryFor(focusChapterId));
  if (nextId && nextId !== focusChapterId) {entries.push(entryFor(nextId));}

  return { entries, focusedIndex };
}

// Called once the canonical order lands: re-apply each entry's series-order `number` (an entry
// built before the order was known has the isolated, wrong number) and grow BOTH ends so the
// focused chapter always has a neighbour on each side. Never reorders or drops.
//
// This is where the prev chapter usually enters: a bare ChapterService.getFull (what openChapter
// calls) returns NO embedded prevChapter/nextChapter on a cold open — those are only attached by
// a Series-driven fetch — so buildWindow can't include the prev until the order is known here.
// Prepending is safe now: the native list is remounted per chapter switch (nativeListKey) and
// its one-shot scrollToChapterId lands it on the FOCUSED chapter, not on index 0 — a block
// inserted above the focus doesn't move a keyed LazyColumn off the focused chapter.
export function reconcileWindow(window: ReaderWindow, order: OrderedChapter[]): ReaderWindow {
  let changed = false;
  const entries = window.entries.map(e => {
    const withNum = withOrderNumber(e.chapter, order);
    if (withNum === e.chapter) {return e;}
    changed = true;
    return { ...e, chapter: withNum };
  });
  const renumbered: ReaderWindow = changed ? { entries, focusedIndex: window.focusedIndex } : window;
  const grown = growEnds(renumbered, order, { allowPrepend: true });
  // Return the ORIGINAL window reference when nothing actually changed, so the reconcile effect's
  // identity check doesn't fire an endless SET_WINDOW → re-render → reconcile loop.
  return grown === renumbered && !changed ? window : grown;
}

// Grow the window at whichever end the focus is near, so there's always at least one loaded (or
// placeholder) chapter beyond the focus in the direction of travel. Pure: returns a new window
// (or the same one if nothing to add). Never reorders or drops. `allowPrepend` gates growing the
// FRONT — off during open/reconcile so the LazyColumn's anchor block (index 0) never shifts.
function growEnds(
  window: ReaderWindow,
  order: OrderedChapter[],
  opts: { allowPrepend?: boolean } = {},
): ReaderWindow {
  const allowPrepend = opts.allowPrepend ?? true;
  let { entries } = window;
  let { focusedIndex } = window;

  if (allowPrepend && focusedIndex <= 0) {
    const firstOrderIndex = order.findIndex(c => c.id === entries[0]?.chapter.id);
    const before = firstOrderIndex > 0 ? placeholderEntry(order[firstOrderIndex - 1].id, order) : null;
    if (before) {
      entries = [before, ...entries];
      focusedIndex += 1;
    }
  }
  // Append if focus is at the last index and the order has a chapter after entries[last].
  if (focusedIndex >= entries.length - 1) {
    const lastOrderIndex = order.findIndex(c => c.id === entries[entries.length - 1]?.chapter.id);
    const after =
      lastOrderIndex >= 0 && lastOrderIndex < order.length - 1
        ? placeholderEntry(order[lastOrderIndex + 1].id, order)
        : null;
    if (after) {entries = [...entries, after];}
  }

  return entries === window.entries ? window : { entries, focusedIndex };
}

export type FocusMoveOutcome =
  | { kind: 'position-only'; page: number; pageFraction: number; chapterFraction: number }
  | {
      kind: 'focus-moved';
      window: ReaderWindow;
      // The position the NEW focused chapter is at right now — straight from the native-scroll
      // report that caused the crossing. The reducer adopts it so the progress bar / page dots
      // follow the new chapter immediately instead of staying frozen on the old value.
      position: { page: number; pageFraction: number; chapterFraction: number };
    }
  | { kind: 'noop' };

// The pure decision for a NATURAL SCROLL crossing. `entries` is append-only: this only ever moves
// `focusedIndex` and grows an end via growEnds — never reorders or drops a block, so the native
// list's scroll position stays valid. The overlay arrows don't come here (they reload via
// openChapter).
//
//  - report for the focused chapter        → position-only (the common case)
//  - report for a block adjacent in the list → move the pointer there (list is already there)
//  - anything else (stale / non-adjacent)  → noop
export function computeWindowAfterFocusMove(
  window: ReaderWindow,
  order: OrderedChapter[],
  trigger: FocusMoveTrigger,
): FocusMoveOutcome {
  const { entries, focusedIndex } = window;
  const focused = entries[focusedIndex];
  if (!focused) {return { kind: 'noop' };}

  if (trigger.reportedChapterId === focused.chapter.id) {
    return {
      kind: 'position-only',
      page: trigger.page,
      pageFraction: trigger.pageFraction,
      chapterFraction: trigger.chapterFraction,
    };
  }

  let targetIndex = -1;
  if (entries[focusedIndex + 1]?.chapter.id === trigger.reportedChapterId) {
    targetIndex = focusedIndex + 1;
  } else if (entries[focusedIndex - 1]?.chapter.id === trigger.reportedChapterId) {
    targetIndex = focusedIndex - 1;
  }
  if (targetIndex === -1) {return { kind: 'noop' };} // stale / not an adjacent block

  return {
    kind: 'focus-moved',
    window: growEnds({ entries, focusedIndex: targetIndex }, order),
    position: {
      page: trigger.page,
      pageFraction: trigger.pageFraction,
      chapterFraction: trigger.chapterFraction,
    },
  };
}

// The next / previous chapter id in the canonical reading order, relative to `chapterId`.
// null at the series ends or when the order isn't loaded. Used by the overlay arrows to pick
// which chapter to reload.
export function adjacentChapterId(
  order: OrderedChapter[],
  chapterId: string,
  direction: 'next' | 'prev',
): string | null {
  const i = order.findIndex(c => c.id === chapterId);
  if (i === -1) {return null;}
  const j = direction === 'next' ? i + 1 : i - 1;
  return j >= 0 && j < order.length ? order[j].id : null;
}
