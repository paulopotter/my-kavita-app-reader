import type { OrderedChapter, ReaderChapter, ReaderWindow } from '../reader.types';
import { withOrderNumber } from '../reader.model';
import { buildWindow, computeWindowAfterFocusMove, reconcileWindow } from '../reader.window';

// ── fixtures ────────────────────────────────────────────────────────────

function order(ids: string[]): OrderedChapter[] {
  return ids.map((id, i) => ({
    id,
    seriesId: 's1',
    number: i + 1,
    decimalNumber: i + 1,
    title: `Ch ${i + 1}`,
    readStatus: 'UNREAD' as const,
  }));
}

function readerChapter(id: string, over: Partial<ReaderChapter> = {}): ReaderChapter {
  return {
    id,
    seriesId: 's1',
    number: 1,
    title: id,
    readStatus: 'UNREAD',
    pageCount: 10,
    pagesRead: 0,
    pageUrls: Array.from({ length: 10 }, (_, i) => `${id}-p${i}`),
    pageAspectRatios: Array.from({ length: 10 }, () => 1.5),
    serverResume: null,
    ...over,
  };
}

function readyWindow(ids: string[], focusedIndex: number): ReaderWindow {
  return {
    entries: ids.map(id => ({ chapter: readerChapter(id), status: 'ready' as const })),
    focusedIndex,
  };
}

// ── buildWindow — [prev?, opened, next?] with the opened chapter focused ─

describe('buildWindow', () => {
  const o = order(['c1', 'c2', 'c3', 'c4', 'c5']);

  it('is [prev, opened, next] with the opened chapter focused', () => {
    const w = buildWindow('c3', o, [readerChapter('c3')]);
    expect(w.entries.map(e => e.chapter.id)).toEqual(['c2', 'c3', 'c4']);
    expect(w.focusedIndex).toBe(1);
  });

  it('has no prev entry at the start of the series (opened stays at index 0)', () => {
    const w = buildWindow('c1', o, [readerChapter('c1')]);
    expect(w.entries.map(e => e.chapter.id)).toEqual(['c1', 'c2']);
    expect(w.focusedIndex).toBe(0);
  });

  it('has no next entry at the end of the series', () => {
    const w = buildWindow('c5', o, [readerChapter('c5')]);
    expect(w.entries.map(e => e.chapter.id)).toEqual(['c4', 'c5']);
    expect(w.focusedIndex).toBe(1);
  });

  it('marks the opened chapter ready and the neighbours placeholders', () => {
    const w = buildWindow('c3', o, [readerChapter('c3')]);
    expect(w.entries.map(e => e.status)).toEqual(['placeholder', 'ready', 'placeholder']);
  });

  it('uses embedded prev/next digests as ready', () => {
    const w = buildWindow('c3', o, [readerChapter('c3'), readerChapter('c2'), readerChapter('c4')]);
    expect(w.entries.map(e => e.status)).toEqual(['ready', 'ready', 'ready']);
  });

  it('falls back to a 1-entry window when the order is not loaded', () => {
    const w = buildWindow('c3', [], [readerChapter('c3')]);
    expect(w.entries).toHaveLength(1);
    expect(w.focusedIndex).toBe(0);
    expect(w.entries[0].status).toBe('ready');
  });

  it('uses explicit neighbor ids even with no order (cold open, digest embedded neighbors)', () => {
    // orderIndex === -1, but the digest carried prev/next — the window still has both sides.
    const w = buildWindow('c3', [], [readerChapter('c3'), readerChapter('c2'), readerChapter('c4')], {
      prevId: 'c2',
      nextId: 'c4',
    });
    expect(w.entries.map(e => e.chapter.id)).toEqual(['c2', 'c3', 'c4']);
    expect(w.focusedIndex).toBe(1);
    expect(w.entries.map(e => e.status)).toEqual(['ready', 'ready', 'ready']);
  });

  it('ignores a neighbor id equal to the opened chapter', () => {
    const w = buildWindow('c3', o, [readerChapter('c3')], { prevId: 'c3', nextId: 'c4' });
    expect(w.entries.map(e => e.chapter.id)).toEqual(['c3', 'c4']);
    expect(w.focusedIndex).toBe(0);
  });

  it('builds a bare placeholder for a neighbor id that is in neither known nor order', () => {
    const w = buildWindow('c3', [], [readerChapter('c3')], { prevId: 'ghost', nextId: null });
    expect(w.entries.map(e => e.chapter.id)).toEqual(['ghost', 'c3']);
    expect(w.entries[0].status).toBe('placeholder');
    expect(w.entries[0].chapter.pageUrls).toEqual([]);
    expect(w.focusedIndex).toBe(1);
  });
});

// ── reconcileWindow — runs once the canonical order lands ──────────────

describe('reconcileWindow', () => {
  const o = order(['c1', 'c2', 'c3', 'c4', 'c5']);

  it('prepends the missing prev and appends the missing next when the focus is a lone entry', () => {
    const before: ReaderWindow = { entries: [{ chapter: readerChapter('c3'), status: 'ready' }], focusedIndex: 0 };
    const after = reconcileWindow(before, o);
    expect(after.entries.map(e => e.chapter.id)).toEqual(['c2', 'c3', 'c4']);
    expect(after.entries[after.focusedIndex].chapter.id).toBe('c3');
    expect(after.entries[0].status).toBe('placeholder');
  });

  it('returns the SAME window reference when there is nothing to grow or renumber', () => {
    const w = readyWindow(['c2', 'c3', 'c4'], 1);
    // pre-number the entries the way the order would, so renumbering is a no-op too
    const numbered: ReaderWindow = {
      entries: w.entries.map(e => ({ ...e, chapter: withOrderNumber(e.chapter, o) })),
      focusedIndex: 1,
    };
    expect(reconcileWindow(numbered, o)).toBe(numbered);
  });

  it('re-applies the series-order number to an entry built before the order was known', () => {
    const before: ReaderWindow = {
      entries: [{ chapter: readerChapter('c4', { number: 1 }), status: 'ready' }],
      focusedIndex: 0,
    };
    const after = reconcileWindow(before, o);
    expect(after.entries[after.focusedIndex].chapter.number).toBe(4);
  });
});

// ── computeWindowAfterFocusMove — natural-scroll crossings only ─────────

describe('computeWindowAfterFocusMove', () => {
  const o = order(['c1', 'c2', 'c3', 'c4', 'c5']);

  const scroll = (reportedChapterId: string, page = 0, pageFraction = 0, chapterFraction = 0) =>
    ({ source: 'native-scroll' as const, reportedChapterId, page, pageFraction, chapterFraction });

  it('a report for the already-focused chapter is position-only', () => {
    const out = computeWindowAfterFocusMove(readyWindow(['c1', 'c2', 'c3'], 1), o, scroll('c2', 4, 0.5, 0.3));
    expect(out).toEqual({ kind: 'position-only', page: 4, pageFraction: 0.5, chapterFraction: 0.3 });
  });

  it('a crossing into an adjacent block moves the pointer only, no reorder', () => {
    const out = computeWindowAfterFocusMove(readyWindow(['c1', 'c2', 'c3'], 1), o, scroll('c3', 0, 0, 0.02));
    expect(out.kind).toBe('focus-moved');
    if (out.kind !== 'focus-moved') {throw new Error('unreachable');}
    // pointer -> c3, entries order UNCHANGED (c4 appended at the end since focus is now last)
    expect(out.window.entries.map(e => e.chapter.id)).toEqual(['c1', 'c2', 'c3', 'c4']);
    expect(out.window.entries[out.window.focusedIndex].chapter.id).toBe('c3');
    expect(out.position).toEqual({ page: 0, pageFraction: 0, chapterFraction: 0.02 });
  });

  it('a crossing backward moves the pointer back and prepends the new prev', () => {
    const out = computeWindowAfterFocusMove(readyWindow(['c2', 'c3', 'c4'], 1), o, scroll('c2', 9, 1, 1));
    expect(out.kind).toBe('focus-moved');
    if (out.kind !== 'focus-moved') {throw new Error('unreachable');}
    expect(out.window.entries.map(e => e.chapter.id)).toEqual(['c1', 'c2', 'c3', 'c4']);
    expect(out.window.entries[out.window.focusedIndex].chapter.id).toBe('c2');
  });

  it('a stale report for a chapter two away is a noop', () => {
    // focus c3, c1 is NOT in the list
    expect(computeWindowAfterFocusMove(readyWindow(['c2', 'c3', 'c4'], 1), o, scroll('c1', 9, 1, 1))).toEqual({
      kind: 'noop',
    });
  });

  it('THE BUG THAT WAS: a lagging backward report does NOT reshuffle the entries', () => {
    // Append-only: the pointer moves, entries never reshuffle, so the SAME block indices persist
    // and the native scroll position stays meaningful — no wedge.
    let w = readyWindow(['c1', 'c2', 'c3'], 2); // focus c3
    let out = computeWindowAfterFocusMove(w, o, scroll('c2', 42, 1, 1));
    if (out.kind !== 'focus-moved') {throw new Error('unreachable');}
    w = out.window;
    expect(w.entries.map(e => e.chapter.id)).toEqual(['c1', 'c2', 'c3']); // order unchanged
    expect(w.entries[w.focusedIndex].chapter.id).toBe('c2');
    // another lagging report for c2 — still adjacent, still no reshuffle
    out = computeWindowAfterFocusMove(w, o, scroll('c2', 42, 1, 1));
    expect(out).toEqual({ kind: 'position-only', page: 42, pageFraction: 1, chapterFraction: 1 });
  });
});
