import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Routes } from '../../../navigation/routes';
import { useStrings } from '../../../shared/i18n';
import { ReadingProgressManager } from '../../../shared/managers/store';
import { BookService } from '../../../shared/services/books';
import { ChapterService } from '../../../shared/services/chapters';
import { SerialService } from '../../../shared/services/serials';
import { createBackAction } from '../../../shared/tools/actions';
import { BookDocumentTool, BookPrefs, DEFAULT_BOOK_APPEARANCE, DEFAULT_BOOK_READING_MODE } from '../../../shared/tools/books';
import type { BookAppearance, BookMessage, BookReadingMode } from '../../../shared/tools/books';
import { adjacentChapterId, ChapterTool, toOrderedChapters } from '../../../shared/tools/chapters';
import type { OrderedChapter } from '../../../shared/tools/chapters';
import { pageIndicatorText, reachedEnd, resolveStartPage, shouldMarkRead } from '../book-reader.model';
import type { BookReaderStatus } from '../book-reader.types';

// A page of a chapter that is in the document, with how many pages that chapter has.
interface LoadedSection {
  chapterId: string;
  page: number;
  pageCount: number;
}

// The book reader's brain: everything the screen shows or does is decided here. The screen only
// renders what this returns and forwards what the WebView reports. `inject` runs a snippet in the
// page (the infinite mode appends the next chapter that way).
export function useBookReader({
  seriesId,
  chapterId: initialChapterId,
  seriesName,
  inject,
}: {
  seriesId: string;
  chapterId: string;
  seriesName?: string;
  inject?: (script: string) => void;
}) {
  const t = useStrings();

  // The chapter the document was loaded from, and the one the reader is in right now: the same in
  // the paged mode, apart in the infinite one once chapters have been appended below the first.
  const [chapterId, setChapterId] = useState(initialChapterId);
  const [activeChapterId, setActiveChapterId] = useState(initialChapterId);
  const [firstSection, setFirstSection] = useState<{ chapterId: string; page: number }>({ chapterId: initialChapterId, page: 0 });
  const [status, setStatus] = useState<BookReaderStatus>('loading');
  const [html, setHtml] = useState('');
  // The page and page count of the section the reader is in.
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  // Where the document lands once laid out: the saved position when a chapter opens, the current
  // one when only the look changed.
  const [restoreFraction, setRestoreFraction] = useState(0);
  // How far down the current section the reader is (0..1), for the progress bar.
  const [pageScroll, setPageScroll] = useState(0);
  // Closed on open, like the image reader: the page comes first, the controls appear on a tap.
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [appearance, setAppearance] = useState<BookAppearance>(DEFAULT_BOOK_APPEARANCE);
  const [mode, setMode] = useState<BookReadingMode>(DEFAULT_BOOK_READING_MODE);
  // The first load waits for the saved look and mode, so the page is never drawn once with the
  // defaults and again with the real ones.
  const [prefsReady, setPrefsReady] = useState(false);
  const [order, setOrder] = useState<OrderedChapter[]>([]);
  // The series' own name, for when the route did not carry one (the Home and notifications don't).
  const [loadedName, setLoadedName] = useState('');
  // Bumped to run the load again for the same chapter.
  const [reloadTick, setReloadTick] = useState(0);

  const fractionRef = useRef(0);
  const markedRef = useRef<Set<string>>(new Set());
  // A newer load supersedes an older one still in flight.
  const loadGenRef = useRef(0);
  // Where to open the chapter when it is not "where it was left": set before a switch, read by the load.
  const startRef = useRef<{ page: number; fraction: number } | undefined>(undefined);
  // The infinite mode's bookkeeping: what is in the document, whether a page is being fetched, and
  // whether the series has run out. Refs, because the page's messages must see the latest values.
  const sectionsRef = useRef<LoadedSection[]>([]);
  const fetchingRef = useRef(false);
  const orderRef = useRef<OrderedChapter[]>([]);
  orderRef.current = order;
  const injectRef = useRef(inject);
  injectRef.current = inject;

  const infinite = mode === 'infinite';

  const backAction = useMemo(
    () => createBackAction({ route: Routes.SERIES_DETAIL, params: { seriesId }, canResetStack: true }),
    [seriesId],
  );

  // ── how the page looks and how it reads: saved look, saved mode ───
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      BookPrefs.appearance.get().catch(() => DEFAULT_BOOK_APPEARANCE),
      BookPrefs.mode.get().catch(() => DEFAULT_BOOK_READING_MODE),
    ]).then(([savedAppearance, savedMode]) => {
      if (cancelled) {return;}
      setAppearance(savedAppearance);
      setMode(savedMode);
      setPrefsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── the series' reading order (prev/next chapter, chapter title) ────
  useEffect(() => {
    let cancelled = false;
    SerialService.get({ seriesId })
      .then(digest => {
        if (cancelled || !digest.isSuccess) {return;}
        setOrder(toOrderedChapters(digest));
        setLoadedName(digest.name ?? '');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [seriesId]);

  // ── load: the chapter's book info + saved position, then the page ──
  useEffect(() => {
    if (!prefsReady) {return;}
    const gen = ++loadGenRef.current;
    setStatus('loading');
    (async () => {
      try {
        const [info, saved] = await Promise.all([
          BookService.info({ chapterId }),
          ReadingProgressManager.get(chapterId).catch(() => null),
        ]);
        const count = Math.max(1, info.pageCount);
        const explicit = startRef.current;
        startRef.current = undefined;
        const startPage = resolveStartPage({ savedPage: explicit?.page ?? saved?.page, pageCount: count });
        const startFraction = explicit ? explicit.fraction : startPage === saved?.page ? (saved?.scrollFraction ?? 0) : 0;
        const page = await BookService.page({ chapterId, page: startPage });
        if (gen !== loadGenRef.current) {return;}
        sectionsRef.current = [{ chapterId, page: startPage, pageCount: count }];
        fetchingRef.current = false;
        fractionRef.current = startFraction;
        setFirstSection({ chapterId, page: startPage });
        setActiveChapterId(chapterId);
        setPageScroll(startFraction);
        setPageCount(count);
        setPageIndex(startPage);
        setRestoreFraction(startFraction);
        setHtml(page);
        setStatus('ready');
      } catch {
        if (gen === loadGenRef.current) {setStatus('error');}
      }
    })();
  }, [chapterId, reloadTick, prefsReady]);

  // Opens a chapter at a given page and position — the way a mode change, or a look change over a
  // document that has grown, keeps the reader exactly where they are.
  const reopenAt = useCallback(({ chapterId: target, page, fraction }: { chapterId: string; page: number; fraction: number }) => {
    startRef.current = { page, fraction };
    setChapterId(target);
    setActiveChapterId(target);
    setReloadTick(tick => tick + 1);
  }, []);

  // ── navigation inside the book and between chapters (paged mode) ─
  const openPage = useCallback(
    (target: number) => {
      if (target < 0 || target >= pageCount) {return;}
      const gen = ++loadGenRef.current;
      setStatus('loading');
      BookService.page({ chapterId, page: target })
        .then(page => {
          if (gen !== loadGenRef.current) {return;}
          sectionsRef.current = [{ chapterId, page: target, pageCount }];
          fractionRef.current = 0;
          setPageScroll(0);
          setPageIndex(target);
          setRestoreFraction(0);
          setFirstSection({ chapterId, page: target });
          setHtml(page);
          setStatus('ready');
          ChapterService.progress.set({ seriesId, chapterId, pageIndex: target }).catch(() => {});
        })
        .catch(() => {
          if (gen === loadGenRef.current) {setStatus('error');}
        });
    },
    [chapterId, pageCount, seriesId],
  );

  const nextPage = useCallback(() => openPage(pageIndex + 1), [openPage, pageIndex]);
  const prevPage = useCallback(() => openPage(pageIndex - 1), [openPage, pageIndex]);

  const nextChapterId = adjacentChapterId(order, activeChapterId, 'next');
  const prevChapterId = adjacentChapterId(order, activeChapterId, 'prev');

  // One line each time where the reader is changes, so a mode switch that loses the neighbours (or
  // the bar) can be read off the device log.
  useEffect(() => {
    console.log(
      `[book-reader] mode=${mode} status=${status} chapter=${activeChapterId} page=${pageIndex}/${pageCount} order=${order.length} prev=${prevChapterId} next=${nextChapterId} overlay=${overlayVisible}`,
    );
  }, [mode, status, activeChapterId, pageIndex, pageCount, order.length, prevChapterId, nextChapterId, overlayVisible]);

  const goToChapter = useCallback((targetId: string | null) => {
    if (!targetId) {return;}
    // A chapter reached by the buttons opens at its start, not where it was left.
    startRef.current = { page: 0, fraction: 0 };
    setChapterId(targetId);
    setActiveChapterId(targetId);
  }, []);
  const goToNextChapter = useCallback(() => goToChapter(nextChapterId), [goToChapter, nextChapterId]);
  const goToPrevChapter = useCallback(() => goToChapter(prevChapterId), [goToChapter, prevChapterId]);

  const retry = useCallback(() => setReloadTick(tick => tick + 1), []);

  // ── infinite mode: append the next page when the document asks for it ─
  const appendNext = useCallback(async () => {
    const run = injectRef.current;
    if (!run || fetchingRef.current) {return;}
    const last = sectionsRef.current[sectionsRef.current.length - 1];
    if (!last) {return;}
    fetchingRef.current = true;
    try {
      let target: LoadedSection;
      if (last.page + 1 < last.pageCount) {
        target = { chapterId: last.chapterId, page: last.page + 1, pageCount: last.pageCount };
      } else {
        // Without the series order there is no way to know what comes next: not the end, just not yet.
        if (orderRef.current.length === 0) {throw new Error('order not loaded');}
        const nextId = adjacentChapterId(orderRef.current, last.chapterId, 'next');
        if (!nextId) {
          run('window.__noMore(); true;');
          return;
        }
        const info = await BookService.info({ chapterId: nextId });
        target = { chapterId: nextId, page: 0, pageCount: Math.max(1, info.pageCount) };
      }
      const pageHtml = await BookService.page({ chapterId: target.chapterId, page: target.page });
      sectionsRef.current = [...sectionsRef.current, target];
      run(`window.__appendSection(${JSON.stringify({ chapterId: target.chapterId, page: target.page, html: pageHtml })}); true;`);
    } catch {
      // The page will ask again the next time the reader scrolls near the end.
      run('window.__needNextFailed(); true;');
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  // ── what the WebView reports ────────────────────────────────────
  const current = order.find(c => c.id === activeChapterId);

  // A section was read to its end: the chapter is read once its LAST page is, and only the first time.
  const markIfFinished = useCallback(
    ({ chapterId: target, page, fraction }: { chapterId: string; page: number; fraction: number }) => {
      const section = sectionsRef.current.find(s => s.chapterId === target && s.page === page);
      const count = section?.pageCount ?? pageCount;
      const entry = orderRef.current.find(c => c.id === target);
      if (
        shouldMarkRead({
          ended: reachedEnd({ fraction, pageIndex: page, pageCount: count }),
          alreadyMarked: markedRef.current.has(target),
          wasRead: entry?.readStatus === 'READ',
        })
      ) {
        markedRef.current.add(target);
        ChapterTool.mark.read({ seriesId, chapterId: target, prevStatus: entry?.readStatus });
      }
    },
    [pageCount, seriesId],
  );

  const handleMessage = useCallback(
    (raw: string) => {
      const message: BookMessage | null = BookDocumentTool.parseMessage(raw);
      if (!message) {return;}
      if (message.type === 'tap') {
        setOverlayVisible(visible => !visible);
        return;
      }
      if (message.type === 'needNext') {
        appendNext();
        return;
      }
      if (message.type === 'passed') {
        markIfFinished({ chapterId: message.chapterId, page: message.page, fraction: 1 });
        return;
      }

      // progress — in the infinite mode it says which section the reader is in.
      const inChapter = message.chapterId ?? activeChapterId;
      const inPage = message.page ?? pageIndex;
      if (message.chapterId != null && (message.chapterId !== activeChapterId || inPage !== pageIndex)) {
        const section = sectionsRef.current.find(s => s.chapterId === inChapter && s.page === inPage);
        setActiveChapterId(inChapter);
        setPageIndex(inPage);
        if (section) {setPageCount(section.pageCount);}
        ChapterService.progress.set({ seriesId, chapterId: inChapter, pageIndex: inPage }).catch(() => {});
      }
      fractionRef.current = message.fraction;
      setPageScroll(message.fraction);
      ReadingProgressManager.set(inChapter, { seriesId, page: inPage, scrollFraction: message.fraction }).catch(() => {});
      markIfFinished({ chapterId: inChapter, page: inPage, fraction: message.fraction });
    },
    [activeChapterId, appendNext, markIfFinished, pageIndex, seriesId],
  );

  // ── appearance and mode ──────────────────────────────────────────
  // Rebuilding the document drops every section appended below the first, so a document that has
  // grown is reopened at the section the reader is in instead of just rebuilt.
  const keepPosition = useCallback(() => {
    if (infinite && sectionsRef.current.length > 1) {
      reopenAt({ chapterId: activeChapterId, page: pageIndex, fraction: fractionRef.current });
    } else {
      setRestoreFraction(fractionRef.current);
    }
  }, [activeChapterId, infinite, pageIndex, reopenAt]);

  const updateAppearance = useCallback(
    <K extends keyof BookAppearance>(key: K, value: BookAppearance[K]) => {
      keepPosition();
      setAppearance(previous => ({ ...previous, [key]: value }));
      BookPrefs.appearance.set({ key, value }).catch(() => {});
    },
    [keepPosition],
  );

  const changeFontScale = useCallback(
    (direction: 'smaller' | 'larger') => {
      const next = BookPrefs.fontScale.step(appearance.fontScale, direction);
      if (next !== appearance.fontScale) {updateAppearance('fontScale', next);}
    },
    [appearance.fontScale, updateAppearance],
  );

  const changeMode = useCallback(
    (next: BookReadingMode) => {
      if (next === mode) {return;}
      setMode(next);
      // The bars give way to the page, so the new mode is seen working (progress bar included).
      setOverlayVisible(false);
      BookPrefs.mode.set(next).catch(() => {});
      // The same place, read the other way.
      reopenAt({ chapterId: activeChapterId, page: pageIndex, fraction: fractionRef.current });
    },
    [activeChapterId, mode, pageIndex, reopenAt],
  );

  return {
    seriesName: seriesName || loadedName,
    chapterId: activeChapterId,
    chapterTitle: current ? ChapterTool.format.title(current, t) : '',
    status,
    html,
    firstSection,
    mode,
    infinite,
    pageIndex,
    pageCount,
    pageIndicator: pageIndicatorText({ pageIndex, pageCount, template: t.bookReaderPage }),
    restoreFraction,
    // Across the whole chapter: the pages already behind the reader plus how far into this one.
    chapterFraction: pageCount > 0 ? Math.min(1, (pageIndex + pageScroll) / pageCount) : 0,
    appearance,
    overlayVisible,
    hasPrevChapter: prevChapterId != null,
    hasNextChapter: nextChapterId != null,
    // Pages are turned by hand only in the paged mode; the infinite one just keeps scrolling.
    hasPrevPage: !infinite && pageIndex > 0,
    hasNextPage: !infinite && pageIndex < pageCount - 1,
    backAction,
    handleMessage,
    nextPage,
    prevPage,
    goToNextChapter,
    goToPrevChapter,
    changeFontScale,
    updateAppearance,
    changeMode,
    retry,
  };
}
