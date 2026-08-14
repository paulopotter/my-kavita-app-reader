import React, { useCallback, useEffect, useRef } from 'react';
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Pressable, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NavOrigin } from '../../navigation/routes';
import { useStrings } from '../../shared/i18n/useStrings';
import {
  buildReaderList,
  ChapterWithPages,
  computeGapHeight,
  computeVisiblePageProgress,
  ReaderListItem,
} from '../../shared/transforms/page';
import { ReaderListItemRenderer } from './components/ReaderListItemRenderer';
import { ReaderOfflineBanner } from './components/ReaderOfflineBanner';
import { ReaderSideProgressBar } from './components/ReaderSideProgressBar';
import { ReaderThinProgressBar } from './components/ReaderThinProgressBar';
import { ReaderTopBar } from './components/ReaderTopBar';
import { chapterHeaderTitle, progressBarFraction } from './ReaderTransform';
import { useReader } from './useReader';

type RouteParams = {
  Reader: { seriesId: string; chapterId: string; origin?: NavOrigin };
};

const ESTIMATED_ITEM_SIZE = 800;

export function ReaderScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'Reader'>>();
  const { seriesId, chapterId, origin = 'LIBRARY' } = route.params ?? {};
  const t = useStrings();

  const reader = useReader(seriesId, chapterId);
  const listRef = useRef<FlashList<ReaderListItem>>(null);
  const measuredHeightsRef = useRef<Map<string, number>>(new Map());
  const isFirstItemChapterHeaderRef = useRef(true);
  const viewportHeightRef = useRef(0);

  useEffect(() => {
    return () => {
      reader.onScreenExit();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (reader.scrollToPageRequest == null || !reader.viewer) {return;}
    const currChapterId = reader.viewer.curr.chapter.id;
    const targetKey = `${currChapterId}:PAGE:${reader.scrollToPageRequest}`;
    const list = buildReaderList(reader.viewer, measuredHeightsRef.current);
    const index = list.findIndex(item => item.key === targetKey);
    console.log(
      `[ReaderScreen] scrollToPageRequest=${reader.scrollToPageRequest} currChapterId=${currChapterId} targetKey=${targetKey} resolvedIndex=${index} listLength=${list.length} hasPrev=${reader.viewer.prev != null} hasNext=${reader.viewer.next != null}`,
    );
    if (index >= 0) {
      // getLayout(index), usado internamente por scrollToIndex, só reflete alturas REAIS já
      // medidas via onLayout — antes disso ele usa estimatedItemSize, que diverge muito da
      // altura real de páginas de manga (podem passar de 2000px). Uma única chamada logo
      // após a inserção do bloco caía num offset fisicamente errado. Repetir a chamada por
      // alguns frames dá tempo para os onLayout reais dos itens acima do alvo chegarem e
      // corrigirem o layout interno, convergindo para a posição certa.
      let cancelled = false;
      let attempts = 0;
      const MAX_ATTEMPTS = 8;
      const scrollAttempt = () => {
        if (cancelled) {return;}
        listRef.current?.scrollToIndex({ index, animated: false });
        attempts += 1;
        if (attempts < MAX_ATTEMPTS) {
          requestAnimationFrame(scrollAttempt);
        }
      };
      scrollAttempt();
      reader.handleScrollToPageHandled();
      return () => {
        cancelled = true;
      };
    }
    console.log('[ReaderScreen] scrollToIndex SKIPPED — targetKey not found in list');
    reader.handleScrollToPageHandled();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reader.scrollToPageRequest, reader.viewer]);

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'series/:seriesId', params: { seriesId, origin } }] });
    }
  }

  const handleLayout = useCallback((key: string, height: number) => {
    measuredHeightsRef.current.set(key, height);
  }, []);

  const handleListLayout = useCallback((event: LayoutChangeEvent) => {
    viewportHeightRef.current = event.nativeEvent.layout.height;
  }, []);

  const handleScrollEvent = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      reader.handleScroll(offsetY, isFirstItemChapterHeaderRef.current);

      const viewer = reader.viewer;
      if (!viewer || viewportHeightRef.current <= 0) {return;}
      const progress = computeVisiblePageProgress(
        buildReaderList(viewer, measuredHeightsRef.current),
        measuredHeightsRef.current,
        offsetY,
        viewportHeightRef.current,
        viewer.curr.chapter.id,
        ESTIMATED_ITEM_SIZE,
      );
      if (progress) {
        reader.setCurrentPage(progress.pageIndex, progress.scrollFraction);
      }
    },
    [reader],
  );

  const handleScrollEndDragEvent = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      reader.handleScrollEndDrag(event.nativeEvent.contentOffset.y);
    },
    [reader],
  );

  if (!reader.viewer) {
    return <View style={styles.root} />;
  }

  const { prev, curr, next } = reader.viewer;
  const listItems = buildReaderList(reader.viewer, measuredHeightsRef.current);
  const gapHeight = computeGapHeight(28, 32);

  const entryForChapterId = (targetChapterId: string): ChapterWithPages =>
    [prev, curr, next].find(entry => entry?.chapter.id === targetChapterId) ?? curr;

  const nextEntryAfter = (targetChapterId: string): ChapterWithPages | null => {
    if (prev && prev.chapter.id === targetChapterId) {return curr;}
    if (curr.chapter.id === targetChapterId) {return next;}
    return null;
  };

  return (
    <View style={styles.root}>
      <Pressable style={styles.pressableList} onPress={reader.toggleOverlay}>
        <FlashList
          ref={listRef}
          data={listItems}
          keyExtractor={item => item.key}
          estimatedItemSize={ESTIMATED_ITEM_SIZE}
          onLayout={handleListLayout}
          onScroll={handleScrollEvent}
          onScrollEndDrag={handleScrollEndDragEvent}
          onMomentumScrollEnd={handleScrollEndDragEvent}
          renderItem={({ item }: { item: ReaderListItem }) => {
            const entry = entryForChapterId(item.chapterId);
            const nextEntry = nextEntryAfter(item.chapterId);
            return (
              <ReaderListItemRenderer
                item={item}
                seriesName=""
                chapterTitle={chapterHeaderTitle(entry.chapter, t)}
                nextChapterTitle={nextEntry ? chapterHeaderTitle(nextEntry.chapter, t) : null}
                hasNext={nextEntry != null}
                pageUrl={item.kind === 'PAGE' ? entry.pages[item.pageIndex ?? 0] : undefined}
                gapHeight={gapHeight}
                onLayout={handleLayout}
                t={t}
              />
            );
          }}
        />
      </Pressable>
      <ReaderThinProgressBar
        fraction={progressBarFraction(reader.currentVisiblePage, reader.scrollFraction, curr.pages.length)}
      />
      {reader.overlayVisible && (
        <>
          <ReaderTopBar seriesName="" chapterTitle={chapterHeaderTitle(curr.chapter, t)} onBack={handleBack} visible />
          <ReaderSideProgressBar
            totalPages={curr.pages.length}
            currentPage={reader.currentVisiblePage}
            onPageSelect={reader.scrollToPage}
            onPrevChapter={reader.goToPrevChapterManual}
            onNextChapter={reader.goToNextChapterManual}
            hasPrev={prev != null}
            hasNext={next != null}
            visible
          />
        </>
      )}
      <ReaderOfflineBanner visible={reader.offline} t={t} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  pressableList: { flex: 1 },
});
