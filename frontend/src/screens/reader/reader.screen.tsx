import React, { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NavOrigin } from '../../navigation/routes';
import { useStrings } from '../../shared/i18n/useStrings';
import { ChapterTool } from '../../shared/tools/chapters';
import {
  ReaderOfflineBanner,
  ReaderOverlayFooter,
  ReaderPageListView,
  ReaderSideProgressBar,
  ReaderThinProgressBar,
  ReaderTopBar,
  type ReaderChapterBlock,
} from './components';
import { useReader } from './hooks';
import { progressBarFraction, windowToWebtoonBlocks } from './transforms';
import { styles } from './reader.styles';

type RouteParams = {
  Reader: { seriesId: string; chapterId: string; origin?: NavOrigin; seriesName?: string };
};

// Reader V2 screen — zero domain logic. It reads route params, forwards the native list's payload
// to the hook verbatim (the hook owns every decision), and renders what the hook exposes. The
// webtoon adapter turns the mode-agnostic window into native ChapterBlocks.
export function ReaderScreen() {
  const route = useRoute<RouteProp<RouteParams, 'Reader'>>();
  const navigation = useNavigation();
  const { seriesId, chapterId, seriesName } = route.params ?? {};
  const t = useStrings();

  const reader = useReader(seriesId, chapterId, seriesName);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  useEffect(() => {
    return () => {
      reader.onScreenExit();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dumb: forward the native list's atomic position payload verbatim. The hook decides.
  const handleVisiblePageChanged = useCallback(
    (visibleChapterId: string, pageIndex: number, pageFraction: number, chapterFraction: number) => {
      reader.onNativePosition(visibleChapterId, pageIndex, pageFraction, chapterFraction);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reader.onNativePosition],
  );

  // Only webtoon has a native renderer today. When another mode is implemented this becomes a
  // switch(reader.readingMode) picking which <ReaderXxxView> to render — no change to the hook.
  const blocks: ReaderChapterBlock[] = useMemo(
    () => (reader.window ? windowToWebtoonBlocks(reader.window, reader.order, t) : []),
    [reader.window, reader.order, t],
  );

  if (!reader.window) {
    if (reader.error) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t.readerError}</Text>
          <Pressable style={styles.button} onPress={() => reader.loadChapter(chapterId)}>
            <Text style={styles.buttonText}>{t.readerRetry}</Text>
          </Pressable>
          <Pressable style={styles.buttonSecondary} onPress={handleBack}>
            <Text style={styles.buttonText}>←</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>{t.readerLoading}</Text>
      </View>
    );
  }

  const focused = reader.window.entries[reader.window.focusedIndex];
  const curr = focused.chapter;
  const currIsPlaceholder = focused.status === 'placeholder' || focused.status === 'loading';

  const scrollToChapterId = reader.scrollRequest?.chapterId ?? null;
  const scrollToPageIndex = reader.scrollRequest?.page ?? -1;

  // [Reader v2][diag] Task 029/030/031 debug — descomente ao investigar troca de capítulo.
  // console.log(
  //   `[Reader v2][diag] render blocks=[${blocks.map(b => `${b.chapterId}:${b.pageUrls.length}p`).join(',')}] focus=${curr.id} chFrac=${reader.chapterFraction.toFixed(3)} page=${reader.currentVisiblePage} scrollReq=${scrollToChapterId ?? 'null'}:${scrollToPageIndex}`,
  // );

  return (
    <View style={styles.root}>
      {/*
        key={reader.nativeListKey} — bumped by every openChapter/WINDOW_READY (open, arrow
        reload, jump). A changed key makes React unmount the native View and mount a fresh one,
        so a chapter switch rebuilds the LazyColumn straight onto the target chapter's top with
        no surviving scroll offset to fight. Natural-scroll crossings do NOT bump it (no remount
        mid-scroll).
      */}
      <ReaderPageListView
        key={reader.nativeListKey}
        blocks={blocks}
        scrollToChapterId={scrollToChapterId}
        scrollToPageIndex={scrollToPageIndex}
        onVisiblePageChanged={handleVisiblePageChanged}
        onScrollToChapterHandled={reader.handleScrollRequestHandled}
        onTap={reader.toggleOverlay}
      />

      {currIsPlaceholder && (
        <View style={styles.pageLoadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}

      {!reader.overlayVisible && (
        <ReaderThinProgressBar
          fraction={progressBarFraction(reader.chapterFraction)}
          pageFraction={reader.scrollFraction}
        />
      )}
      <ReaderTopBar
        seriesName={reader.seriesName}
        chapterTitle={ChapterTool.format.title(curr, t)}
        onBack={handleBack}
        visible={reader.overlayVisible}
      />
      <ReaderSideProgressBar
        totalPages={curr.pageUrls.length}
        currentPage={reader.currentVisiblePage}
        onPageSelect={reader.scrollToPage}
        onPrevChapter={() => reader.goToAdjacent('prev')}
        onNextChapter={() => reader.goToAdjacent('next')}
        hasPrev={reader.hasPrevChapter}
        hasNext={reader.hasNextChapter}
        visible={reader.overlayVisible}
      />
      <ReaderOverlayFooter visible={reader.overlayVisible} />
      <ReaderOfflineBanner visible={reader.offline} t={t} />
    </View>
  );
}
