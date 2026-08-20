import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { chapterHeaderTitle, progressBarFraction } from './ReaderTransform';
import { useReader } from './useReader';

type RouteParams = {
  Reader: { seriesId: string; chapterId: string; origin?: NavOrigin };
};

export function ReaderScreen() {
  const route = useRoute<RouteProp<RouteParams, 'Reader'>>();
  const navigation = useNavigation();
  const { seriesId, chapterId } = route.params ?? {};
  const t = useStrings();

  const reader = useReader(seriesId, chapterId);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useEffect(() => {
    return () => {
      reader.onScreenExit();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Única fonte de verdade para posição/capítulo: o Kotlin reporta continuamente qual página
  // está mais visível (chapterId real dessa página, não necessariamente o curr atual) e a
  // fração de leitura dela e do capítulo — a mesma lógica sempre, sem um segundo evento
  // paralelo (onChapterBoundaryCrossed, removido) tentando decidir a mesma coisa de outro jeito
  // e podendo discordar dele. Quando o chapterId reportado é o curr atual, só atualiza posição;
  // quando é o vizinho (next/prev), decide a troca de trio usando os MESMOS valores que acabaram
  // de chegar neste evento — nunca um cálculo separado que pode ficar dessincronizado.
  const handleVisiblePageChanged = useCallback(
    (visibleChapterId: string, pageIndex: number, pageFraction: number, chapterFraction: number) => {
      const viewer = reader.viewer;
      if (!viewer) {return;}
      if (visibleChapterId === viewer.curr.chapter.id) {
        reader.setCurrentPage(pageIndex, pageFraction, chapterFraction);
      } else if (viewer.next && visibleChapterId === viewer.next.chapter.id) {
        reader.advanceToNextChapter(pageIndex, pageFraction, chapterFraction);
      } else if (viewer.prev && visibleChapterId === viewer.prev.chapter.id) {
        reader.retreatToPrevChapter(pageIndex, pageFraction, chapterFraction);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reader.viewer, reader.setCurrentPage, reader.advanceToNextChapter, reader.retreatToPrevChapter],
  );

  if (!reader.viewer) {
    return <View style={styles.root} />;
  }

  const { prev, curr, next } = reader.viewer;

  // Server-Driven UI (see SduNode.ts doc): firstNode/lastNode carry the ENTIRE Header/Footer/Gap
  // visual as data — Kotlin no longer hardcodes what they look like, it only interprets the tree
  // (SduNodeView). hasGapAbove is false only for the very first block in the list (no chapter
  // before it to draw a Gap against); lastNode's next-chapter preview is included whenever a
  // next chapter is known, same condition the old nextChapterTitle prop used.
  const toBlock = (
    entry: NonNullable<typeof curr>,
    nextEntry: typeof next,
    hasGapAbove: boolean,
  ): ReaderChapterBlock => {
    const title = chapterHeaderTitle(entry.chapter, t);
    return {
      chapterId: entry.chapter.id,
      pageUrls: entry.pages,
      // null entries (dimension unavailable/Kavita unreachable) become 0 — the native side treats
      // a non-positive aspect ratio the same as "not provided" and falls back to measuring that
      // page once it's actually decoded on-device.
      pageAspectRatios: entry.pageAspectRatios?.map(ratio => ratio ?? 0) ?? [],
      firstNode: buildFirstNode(title, hasGapAbove),
      // "Fim do capítulo" e o número ficam como dois textos separados (não interpolados numa só
      // string) para que o número possa ser negrito — ver buildLastNode. Usa entry.chapter.number
      // puro (não o title formatado por chapterHeaderTitle, que já pode conter a palavra
      // "Capítulo" e duplicaria — ex: "Fim do capítulo Capítulo 40").
      lastNode: buildLastNode(
        t.readerEndOfChapterPrefix,
        entry.chapter.number,
        t.readerNextChapterLabel,
        nextEntry ? chapterHeaderTitle(nextEntry.chapter, t) : null,
      ),
    };
  };

  // Trio completo — prev/curr/next, cada um já carregado pelo useReader — dá scroll contínuo
  // nas duas direções. O Kotlin só desenha os blocos; ele nunca decide qual capítulo é "prev"
  // ou "next".
  const blocks: ReaderChapterBlock[] = [
    ...(prev ? [toBlock(prev, curr, false)] : []),
    toBlock(curr, next, prev != null),
    ...(next ? [toBlock(next, null, true)] : []),
  ];

  // scrollToPageRequest é um pedido one-shot só para "continuar lendo" ao abrir a tela (ou
  // pular para uma página específica via progress bar) — nunca é reemitido pelo avanço/
  // retrocesso natural de capítulo (advanceToNextChapter/retreatToPrevChapter/INSERT_PREV_
  // NEIGHBOR), que a própria lista nativa já resolve por scroll contínuo sem ajuda daqui.
  const scrollToChapterId = reader.scrollToPageRequest != null ? curr.chapter.id : null;
  const scrollToPageIndex = reader.scrollToPageRequest ?? -1;

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
      {!reader.overlayVisible && (
        <ReaderThinProgressBar
          fraction={progressBarFraction(reader.chapterFraction)}
          pageFraction={reader.scrollFraction}
        />
      )}
      <ReaderTopBar
        seriesName={reader.seriesName}
        chapterTitle={chapterHeaderTitle(curr.chapter, t)}
        onBack={handleBack}
        visible={reader.overlayVisible}
      />
      <ReaderSideProgressBar
        totalPages={curr.pages.length}
        currentPage={reader.currentVisiblePage}
        onPageSelect={reader.scrollToPage}
        onPrevChapter={reader.goToPrevChapterManual}
        onNextChapter={reader.goToNextChapterManual}
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
});
