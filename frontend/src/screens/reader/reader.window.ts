// Reader V2 — pure screen-local model for the WINDOW: an append-only list of chapter entries plus
// a focus pointer. No I/O, no React. The most important function is computeWindowAfterFocusMove —
// the pure core of moveFocus, whose test proves the 26→28 race can't recur.
//
// Chapter-shape helpers (chapterFromDigest, withOrderNumber, …) live in reader.model.ts; this
// file only owns the window's shape logic and depends on that one for placeholder/renumber.

import {
  placeholderChapterFromOrder,
  withOrderNumber,
} from './reader.model';
import type {
  FocusMoveTrigger,
  LoadedChapterEntry,
  OrderedChapter,
  ReaderChapter,
  ReaderWindow,
} from './reader.types';

// How far ahead of / behind the focus the window keeps at least one loaded-or-placeholder entry.
// The window is append-only (see computeWindowAfterFocusMove) — this is the "grow" trigger, not a
// fixed size.
export const WINDOW_EDGE_LOOKAHEAD = 1;

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
