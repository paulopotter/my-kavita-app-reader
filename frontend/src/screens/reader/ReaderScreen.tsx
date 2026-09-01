import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NavOrigin } from '../../navigation/routes';
import { useStrings } from '../../shared/i18n/useStrings';
import { ReaderChapterBlock, ReaderPageListView } from './components/ReaderPageListView';
import { ReaderOfflineBanner } from './components/ReaderOfflineBanner';
import { ReaderOverlayFooter } from './components/ReaderOverlayFooter';
import { ReaderSideProgressBar } from './components/ReaderSideProgressBar';
import { ReaderThinProgressBar } from './components/ReaderThinProgressBar';
import { ReaderTopBar } from './components/ReaderTopBar';
import { buildFirstNode, buildLastNode } from './ReaderSduNodes';
import { progressBarFraction } from './ReaderTransform';
import { useReader } from './hooks/reader.hooks';
import type { ReaderChapter } from './reader.types';
import { ChapterTool } from '../../shared/tools/chapters';

type RouteParams = {
  Reader: { seriesId: string; chapterId: string; origin?: NavOrigin; seriesName?: string };
};

// Task 029 — Fase 3: consumes the new hook with the full trio (prev/curr/next) and infinite
// chapter navigation via useReader.switchChapter. `blocks` carries every loaded side; the native
// list draws them and reports the visible page — a report for a neighbour's chapter id is what
// tells us the user scrolled across a boundary.

// The chapter's own number as a bare string, for the end-of-chapter footer ("Fim do capítulo N")
// — the footer wants just the number, not the full "Capítulo N" label.
function chapterNumberLabel(chapter: ReaderChapter): string {
  const num = chapter.number ?? chapter.decimalNumber;
  return num != null ? String(num) : '';
}

export function ReaderScreen() {
  const route = useRoute<RouteProp<RouteParams, 'Reader'>>();
  const navigation = useNavigation();
  const { seriesId, chapterId, seriesName } = route.params ?? {};
  const t = useStrings();

  const reader = useReader(seriesId, chapterId, seriesName);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useEffect(() => {
    return () => {
      reader.onScreenExit();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dumb: forward the native list's atomic position payload verbatim. The hook (onNativePosition)
  // owns every decision — same chapter vs. crossed a boundary, which direction, whether to slide
  // the trio. ReaderScreen makes no comparison of its own.
  const handleVisiblePageChanged = useCallback(
    (visibleChapterId: string, pageIndex: number, pageFraction: number, chapterFraction: number) => {
      // [Reader][diag] candidato a task de debug (nav Fase 3): o que o nativo reporta vs o trio.
      // eslint-disable-next-line no-console
      console.log(`[Reader][diag] onVisiblePageChanged visible=${visibleChapterId} page=${pageIndex} chFrac=${chapterFraction} | trio prev=${reader.viewer?.prev?.id ?? 'null'} curr=${reader.viewer?.curr.id ?? 'null'} next=${reader.viewer?.next?.id ?? 'null'}`);
      reader.onNativePosition(visibleChapterId, pageIndex, pageFraction, chapterFraction);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reader.onNativePosition, reader.viewer],
  );

  if (!reader.viewer) {
    // Task 029 — Fase 1: o erro do capítulo deixa de virar "tela preta" silenciosa. Enquanto
    // reader.viewer é null: se há erro, mostra mensagem + tentar de novo + voltar; senão, spinner.
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

  const { prev, curr, next } = reader.viewer;

  // Server-Driven UI (see SduNode.ts doc): firstNode/lastNode carry the ENTIRE Header/Footer/Gap
  // visual as data — Kotlin only interprets the tree. hasGapAbove is false only for the very
  // first block; lastNode's next-chapter preview is included whenever a next chapter is known.
  const toBlock = (
    entry: ReaderChapter,
    nextEntry: ReaderChapter | null,
    hasGapAbove: boolean,
  ): ReaderChapterBlock => {
    return {
      chapterId: entry.id,
      pageUrls: entry.pageUrls,
      // null entries (dimension unavailable/Kavita unreachable) become 0 — the native side treats
      // a non-positive aspect ratio the same as "not provided" and measures that page on decode.
      pageAspectRatios: entry.pageAspectRatios.map(ratio => ratio ?? 0),
      firstNode: buildFirstNode(ChapterTool.format.title(entry, t), hasGapAbove),
      lastNode: buildLastNode(
        t.readerEndOfChapterPrefix,
        chapterNumberLabel(entry),
        t.readerNextChapterLabel,
        nextEntry ? ChapterTool.format.title(nextEntry, t) : null,
      ),
    };
  };

  // prev/curr/next — each already loaded (or a placeholder with no pages, still drawn) — for
  // continuous scroll both ways. Kotlin never decides which chapter is "prev" or "next".
  const blocks: ReaderChapterBlock[] = [
    ...(prev ? [toBlock(prev, curr, false)] : []),
    toBlock(curr, next, prev != null),
    ...(next ? [toBlock(next, null, true)] : []),
  ];

  // One-shot scroll request — "continue reading" on open, a manual chapter switch, or a
  // progress-bar jump. The hook seeds scrollToChapterId with the chapter the request belongs to;
  // the native list scrolls only the block whose id matches. Never set for a natural crossing.
  const scrollToChapterId = reader.scrollToPageRequest != null ? reader.scrollToChapterId : null;
  const scrollToPageIndex = reader.scrollToPageRequest ?? -1;
  // eslint-disable-next-line no-console
  console.log(`[Reader][diag] render blocks=[${blocks.map(b => b.chapterId).join(',')}] scrollToChapterId=${scrollToChapterId} scrollToPageIndex=${scrollToPageIndex} isSwitching=${reader.isSwitching}`);

  return (
    <View style={styles.root}>
      <ReaderPageListView
        blocks={blocks}
        scrollToChapterId={scrollToChapterId}
        scrollToPageIndex={scrollToPageIndex}
        onVisiblePageChanged={handleVisiblePageChanged}
        onScrollToChapterHandled={reader.handleScrollToPageHandled}
        onTap={reader.toggleOverlay}
      />
      {/* Switched into a chapter whose pages aren't in yet (fast arrow tap outran the fetch): a
          spinner over the reading area while loadPages fills it — the top bar already shows the
          new chapter, so this only covers the page canvas, not the whole screen. */}
      {!curr.hasPages && (
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
        hasPrev={reader.viewer.prev != null}
        hasNext={reader.viewer.next != null}
        visible={reader.overlayVisible}
      />
      <ReaderOverlayFooter visible={reader.overlayVisible} />
      <ReaderOfflineBanner visible={reader.offline} t={t} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  centered: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { color: '#A0AEC0', fontSize: 14, marginTop: 12 },
  errorText: { color: '#FFFFFF', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  button: { backgroundColor: '#2D3748', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 6, marginBottom: 8 },
  buttonSecondary: { paddingVertical: 10, paddingHorizontal: 24 },
  buttonText: { color: '#FFFFFF', fontSize: 14 },
  pageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
