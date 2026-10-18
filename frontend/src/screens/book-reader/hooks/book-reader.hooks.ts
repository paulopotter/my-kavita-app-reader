import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Routes } from '../../../navigation/routes';
import { useStrings } from '../../../shared/i18n';
import { ReadingProgressManager } from '../../../shared/managers/store';
import { BookService } from '../../../shared/services/books';
import { ChapterService } from '../../../shared/services/chapters';
import { SerialService } from '../../../shared/services/serials';
import { createBackAction } from '../../../shared/tools/actions';
import { BookDocumentTool, BookPrefs, DEFAULT_BOOK_FONT_SCALE } from '../../../shared/tools/books';
import type { BookMessage } from '../../../shared/tools/books';
import { adjacentChapterId, ChapterTool, toOrderedChapters } from '../../../shared/tools/chapters';
import type { OrderedChapter } from '../../../shared/tools/chapters';
import { pageIndicatorText, reachedEnd, resolveStartPage, shouldMarkRead } from '../book-reader.model';
import type { BookReaderStatus } from '../book-reader.types';

// The book reader's brain: everything the screen shows or does is decided here. The screen only
// renders what this returns and forwards what the WebView reports.
export function useBookReader({
  seriesId,
  chapterId: initialChapterId,
  seriesName,
}: {
  seriesId: string;
  chapterId: string;
  seriesName?: string;
}) {
  const t = useStrings();

  const [chapterId, setChapterId] = useState(initialChapterId);
  const [status, setStatus] = useState<BookReaderStatus>('loading');
  const [html, setHtml] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  // Where the document lands once laid out: the saved position when a chapter opens, the current
  // one when only the text size changed.
  const [restoreFraction, setRestoreFraction] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [fontScale, setFontScale] = useState(DEFAULT_BOOK_FONT_SCALE);
  const [order, setOrder] = useState<OrderedChapter[]>([]);
  // Bumped by retry() to run the load again for the same chapter.
  const [reloadTick, setReloadTick] = useState(0);

  const fractionRef = useRef(0);
  const markedRef = useRef<Set<string>>(new Set());
  // A newer load supersedes an older one still in flight.
  const loadGenRef = useRef(0);
  // Where to open the chapter: set before a chapter switch, read by the load.
  const startPageRef = useRef<number | undefined>(undefined);

  const backAction = useMemo(
    () => createBackAction({ route: Routes.SERIES_DETAIL, params: { seriesId }, canResetStack: true }),
    [seriesId],
  );

  // ── text size ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    BookPrefs.fontScale
      .get()
      .then(value => {
        if (!cancelled) {setFontScale(value);}
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // ── the series' reading order (prev/next chapter, chapter title) ────
  useEffect(() => {
    let cancelled = false;
    SerialService.get({ seriesId })
      .then(digest => {
        if (!cancelled && digest.isSuccess) {setOrder(toOrderedChapters(digest));}
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [seriesId]);

  // ── load: the chapter's book info + saved position, then the page ──
  useEffect(() => {
    const gen = ++loadGenRef.current;
    setStatus('loading');
    (async () => {
      try {
        const [info, saved] = await Promise.all([
          BookService.info({ chapterId }),
          ReadingProgressManager.get(chapterId).catch(() => null),
        ]);
        const count = Math.max(1, info.pageCount);
        const startPage = resolveStartPage({ savedPage: startPageRef.current ?? saved?.page, pageCount: count });
        const startFraction = startPageRef.current != null ? 0 : startPage === saved?.page ? (saved?.scrollFraction ?? 0) : 0;
        startPageRef.current = undefined;
        const page = await BookService.page({ chapterId, page: startPage });
        if (gen !== loadGenRef.current) {return;}
        fractionRef.current = startFraction;
        setPageCount(count);
        setPageIndex(startPage);
        setRestoreFraction(startFraction);
        setHtml(page);
        setStatus('ready');
      } catch {
        if (gen === loadGenRef.current) {setStatus('error');}
      }
    })();
  }, [chapterId, reloadTick]);

  // ── navigation inside the book and between chapters ──────────────
  const openPage = useCallback(
    (target: number) => {
      if (target < 0 || target >= pageCount) {return;}
      const gen = ++loadGenRef.current;
      setStatus('loading');
      BookService.page({ chapterId, page: target })
        .then(page => {
          if (gen !== loadGenRef.current) {return;}
          fractionRef.current = 0;
          setPageIndex(target);
          setRestoreFraction(0);
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

  const nextChapterId = adjacentChapterId(order, chapterId, 'next');
  const prevChapterId = adjacentChapterId(order, chapterId, 'prev');

  const goToChapter = useCallback((targetId: string | null) => {
    if (!targetId) {return;}
    // A chapter reached by the buttons opens at its start, not where it was left.
    startPageRef.current = 0;
    setChapterId(targetId);
  }, []);
  const goToNextChapter = useCallback(() => goToChapter(nextChapterId), [goToChapter, nextChapterId]);
  const goToPrevChapter = useCallback(() => goToChapter(prevChapterId), [goToChapter, prevChapterId]);

  const retry = useCallback(() => setReloadTick(tick => tick + 1), []);

  // ── what the WebView reports ────────────────────────────────────
  const current = order.find(c => c.id === chapterId);

  const handleMessage = useCallback(
    (raw: string) => {
      const message: BookMessage | null = BookDocumentTool.parseMessage(raw);
      if (!message) {return;}
      if (message.type === 'tap') {
        setOverlayVisible(visible => !visible);
        return;
      }
      fractionRef.current = message.fraction;
      ReadingProgressManager.set(chapterId, { seriesId, page: pageIndex, scrollFraction: message.fraction }).catch(() => {});
      const ended = reachedEnd({ fraction: message.fraction, pageIndex, pageCount });
      if (shouldMarkRead({ ended, alreadyMarked: markedRef.current.has(chapterId), wasRead: current?.readStatus === 'READ' })) {
        markedRef.current.add(chapterId);
        ChapterTool.mark.read({ seriesId, chapterId, prevStatus: current?.readStatus });
      }
    },
    [chapterId, current?.readStatus, pageCount, pageIndex, seriesId],
  );

  // ── text size ────────────────────────────────────────────────────
  const changeFontScale = useCallback(
    (direction: 'smaller' | 'larger') => {
      const next = BookPrefs.fontScale.step(fontScale, direction);
      if (next === fontScale) {return;}
      // The document is rebuilt with the new size; keep the reader where they are in it.
      setRestoreFraction(fractionRef.current);
      setFontScale(next);
      BookPrefs.fontScale.set(next).catch(() => {});
    },
    [fontScale],
  );

  return {
    seriesName: seriesName ?? '',
    chapterId,
    chapterTitle: current ? ChapterTool.format.title(current, t) : '',
    status,
    html,
    pageIndex,
    pageCount,
    pageIndicator: pageIndicatorText({ pageIndex, pageCount, template: t.bookReaderPage }),
    restoreFraction,
    fontScale,
    overlayVisible,
    hasPrevChapter: prevChapterId != null,
    hasNextChapter: nextChapterId != null,
    hasPrevPage: pageIndex > 0,
    hasNextPage: pageIndex < pageCount - 1,
    backAction,
    handleMessage,
    nextPage,
    prevPage,
    goToNextChapter,
    goToPrevChapter,
    changeFontScale,
    retry,
  };
}
