import React, { useCallback, useEffect, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NavOrigin } from '../../navigation/routes';
import { useStrings } from '../../shared/i18n/useStrings';
import { buildReaderList, ChapterWithPages, computeGapHeight, ReaderListItem } from '../../shared/transforms/page';
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

export function ReaderScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'Reader'>>();
  const { seriesId, chapterId, origin = 'LIBRARY' } = route.params ?? {};
  const t = useStrings();

  const reader = useReader(seriesId, chapterId);
  const listRef = useRef<FlashList<ReaderListItem>>(null);
  const measuredHeightsRef = useRef<Map<string, number>>(new Map());
  const isFirstItemChapterHeaderRef = useRef(true);

  useEffect(() => {
    return () => {
      reader.onScreenExit();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleScrollEvent = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      reader.handleScroll(event.nativeEvent.contentOffset.y, isFirstItemChapterHeaderRef.current);
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
          estimatedItemSize={800}
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
