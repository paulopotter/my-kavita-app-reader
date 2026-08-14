import React from 'react';
import { Dimensions, NativeSyntheticEvent, requireNativeComponent, ViewStyle } from 'react-native';

export interface ReaderChapterBlock {
  chapterId: string;
  chapterTitle: string;
  pageUrls: string[];
  nextChapterTitle: string | null;
  endOfChapterLabel: string;
  nextChapterLabel: string;
}

interface VisiblePageChangedEvent {
  chapterId: string;
  pageIndex: number;
}

interface NativeProps {
  testID?: string;
  style?: ViewStyle | ViewStyle[];
  blocks: ReaderChapterBlock[];
  scrollToChapterId: string | null;
  scrollToPageIndex: number;
  onVisiblePageChanged?: (event: NativeSyntheticEvent<VisiblePageChangedEvent>) => void;
  onScrollToChapterHandled?: () => void;
}

const RCTReaderPageListView = requireNativeComponent<NativeProps>('ReaderPageListView');

interface Props {
  blocks: ReaderChapterBlock[];
  // One-shot scroll request ("continue reading" on open, or jumping to a specific chapter/page)
  // — never used for the natural forward/back scroll between already-visible blocks, which the
  // native list already handles on its own. null chapterId means "no pending scroll request".
  scrollToChapterId: string | null;
  scrollToPageIndex: number;
  onVisiblePageChanged?: (chapterId: string, pageIndex: number) => void;
  onScrollToChapterHandled?: () => void;
}

// flex:1 sozinho não é suficiente para Views nativas customizadas sem filhos JS — o Yoga não
// tem como inferir um tamanho intrínseco e pode colapsar a view para 0x0. Passar width/height
// explícitos elimina essa ambiguidade.
const windowSize = Dimensions.get('window');

// Kotlin nunca decide navegação (quais capítulos carregar, quando avançar/retroceder o trio) —
// só desenha os blocos que RN mandar e reporta a página visível. Toda a lógica de troca de
// capítulo (useReader.advanceToNextChapter/retreatToPrevChapter) fica inteiramente aqui.
export function ReaderPageListView({
  blocks,
  scrollToChapterId,
  scrollToPageIndex,
  onVisiblePageChanged,
  onScrollToChapterHandled,
}: Props) {
  return (
    <RCTReaderPageListView
      testID="reader-page-list-view"
      style={[styles.root, { width: windowSize.width, height: windowSize.height }]}
      blocks={blocks}
      scrollToChapterId={scrollToChapterId}
      scrollToPageIndex={scrollToPageIndex}
      onVisiblePageChanged={
        onVisiblePageChanged
          ? event => onVisiblePageChanged(event.nativeEvent.chapterId, event.nativeEvent.pageIndex)
          : undefined
      }
      onScrollToChapterHandled={onScrollToChapterHandled}
    />
  );
}

const styles: { root: ViewStyle } = {
  root: { flex: 1 },
};
