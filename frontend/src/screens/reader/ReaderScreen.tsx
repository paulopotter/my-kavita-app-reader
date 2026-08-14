import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import type { NavOrigin } from '../../navigation/routes';
import { useStrings } from '../../shared/i18n/useStrings';
import { ReaderChapterBlock, ReaderPageListView } from './components/ReaderPageListView';
import { chapterHeaderTitle } from './ReaderTransform';
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
    (visibleChapterId: string, pageIndex: number) => {
      const viewer = reader.viewer;
      if (!viewer) {return;}
      if (visibleChapterId === viewer.curr.chapter.id) {
        reader.setCurrentPage(pageIndex, 0);
      } else if (viewer.next && visibleChapterId === viewer.next.chapter.id) {
        reader.advanceToNextChapter();
      } else if (viewer.prev && visibleChapterId === viewer.prev.chapter.id) {
        reader.retreatToPrevChapter();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reader.viewer, reader.setCurrentPage, reader.advanceToNextChapter, reader.retreatToPrevChapter],
  );

  if (!reader.viewer) {
    return <View style={styles.root} />;
  }

  const { curr, next } = reader.viewer;

  const toBlock = (
    entry: NonNullable<typeof curr>,
    nextEntry: typeof next,
  ): ReaderChapterBlock => ({
    chapterId: entry.chapter.id,
    chapterTitle: chapterHeaderTitle(entry.chapter, t),
    pageUrls: entry.pages,
    nextChapterTitle: nextEntry ? chapterHeaderTitle(nextEntry.chapter, t) : null,
    endOfChapterLabel: t.readerEndOfChapter,
    nextChapterLabel: t.readerNextChapterLabel,
  });

  // Só curr+next por enquanto (baby step) — prev fica de fora até o scroll-pra-trás ser
  // implementado numa rodada futura; o botão/tela anterior continua sendo o caminho de volta.
  const blocks: ReaderChapterBlock[] = [toBlock(curr, next)];
  if (next) {
    blocks.push(toBlock(next, null));
  }

  // TEMP DEBUG: isolando a ReaderPageListView nativa sozinha, sem Pressable/overlay/progress
  // bar por cima, para descobrir se a "tripa fina" persistente vem do componente nativo em si
  // ou de alguma interação com o resto da árvore RN desta tela.
  return (
    <View style={styles.root}>
      <ReaderPageListView blocks={blocks} onVisiblePageChanged={handleVisiblePageChanged} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
});
