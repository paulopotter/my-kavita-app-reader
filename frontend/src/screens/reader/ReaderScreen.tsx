import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import type { NavOrigin } from '../../navigation/routes';
import { useStrings } from '../../shared/i18n/useStrings';
import { ReaderChapterBlock, ReaderPageListView } from './components/ReaderPageListView';
import { ReaderThinProgressBar } from './components/ReaderThinProgressBar';
import { chapterHeaderTitle, progressBarFraction } from './ReaderTransform';
import { useReader } from './useReader';

type RouteParams = {
  Reader: { seriesId: string; chapterId: string; origin?: NavOrigin };
};

export function ReaderScreen() {
  const route = useRoute<RouteProp<RouteParams, 'Reader'>>();
  const { seriesId, chapterId } = route.params ?? {};
  const t = useStrings();

  const reader = useReader(seriesId, chapterId);

  useEffect(() => {
    return () => {
      reader.onScreenExit();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kotlin nunca decide navegação — só renderiza os blocos que recebe e reporta qual página
  // está visível. Quando o chapterId reportado deixa de ser o capítulo atual, é este handler
  // que decide avançar/retroceder o trio (advanceToNextChapter/retreatToPrevChapter), usando
  // as funções que useReader já expõe.
  const handleVisiblePageChanged = useCallback(
    (visibleChapterId: string, pageIndex: number, pageFraction: number, chapterFraction: number) => {
      const viewer = reader.viewer;
      if (!viewer) {return;}
      if (visibleChapterId === viewer.curr.chapter.id) {
        reader.setCurrentPage(pageIndex, pageFraction, chapterFraction);
      }
      // TEMP DEBUG: troca automática de capítulo por scroll desativada para isolar o bug de
      // decode de WebP alto — não queremos avançar de capítulo enquanto investigamos falhas de
      // carregamento de página nos logs. Reativar (descomentar) quando a investigação terminar.
      // else if (viewer.next && visibleChapterId === viewer.next.chapter.id) {
      //   reader.advanceToNextChapter();
      // } else if (viewer.prev && visibleChapterId === viewer.prev.chapter.id) {
      //   reader.retreatToPrevChapter();
      // }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reader.viewer, reader.setCurrentPage, reader.advanceToNextChapter, reader.retreatToPrevChapter],
  );

  if (!reader.viewer) {
    return <View style={styles.root} />;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- prev unused while blocks below is TEMP DEBUG-restricted to curr only
  const { prev, curr, next } = reader.viewer;

  const toBlock = (
    entry: NonNullable<typeof curr>,
    nextEntry: typeof next,
  ): ReaderChapterBlock => ({
    chapterId: entry.chapter.id,
    chapterTitle: chapterHeaderTitle(entry.chapter, t),
    pageUrls: entry.pages,
    // null entries (dimension unavailable/Kavita unreachable) become 0 — the native side treats
    // a non-positive aspect ratio the same as "not provided" and falls back to measuring that
    // page once it's actually decoded on-device.
    pageAspectRatios: entry.pageAspectRatios?.map(ratio => ratio ?? 0) ?? [],
    nextChapterTitle: nextEntry ? chapterHeaderTitle(nextEntry.chapter, t) : null,
    endOfChapterLabel: t.readerEndOfChapter,
    nextChapterLabel: t.readerNextChapterLabel,
  });

  // Trio completo — prev/curr/next, cada um já carregado pelo useReader — dá scroll contínuo
  // nas duas direções. O Kotlin só desenha os blocos; ele nunca decide qual capítulo é "prev"
  // ou "next".
  // TEMP DEBUG: só o capítulo atual é renderizado (prev/next comentados) para isolar, via logs,
  // a falha de decode da 3ª página sem nenhum ruído de capítulos vizinhos carregando em paralelo.
  // Restaurar a lista completa quando a investigação terminar.
  const blocks: ReaderChapterBlock[] = [
    // ...(prev ? [toBlock(prev, curr)] : []),
    toBlock(curr, next),
    // ...(next ? [toBlock(next, null)] : []),
  ];

  // scrollToPageRequest é um pedido one-shot só para "continuar lendo" ao abrir a tela (ou
  // pular para uma página específica via progress bar) — nunca é reemitido pelo avanço/
  // retrocesso natural de capítulo (advanceToNextChapter/retreatToPrevChapter/INSERT_PREV_
  // NEIGHBOR), que a própria lista nativa já resolve por scroll contínuo sem ajuda daqui.
  const scrollToChapterId = reader.scrollToPageRequest != null ? curr.chapter.id : null;
  const scrollToPageIndex = reader.scrollToPageRequest ?? -1;

  // TEMP DEBUG: isolando a ReaderPageListView nativa sem Pressable/overlay por cima ainda, para
  // manter o isolamento usado na investigação do bug de decode — só a barra fina de progresso
  // volta por enquanto.
  return (
    <View style={styles.root}>
      <ReaderPageListView
        blocks={blocks}
        scrollToChapterId={scrollToChapterId}
        scrollToPageIndex={scrollToPageIndex}
        onVisiblePageChanged={handleVisiblePageChanged}
        onScrollToChapterHandled={reader.handleScrollToPageHandled}
      />
      <ReaderThinProgressBar
        fraction={progressBarFraction(reader.chapterFraction)}
        pageFraction={reader.scrollFraction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
});
