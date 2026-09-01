import React from 'react';
import { NativeSyntheticEvent, requireNativeComponent, ViewStyle } from 'react-native';
import type { SduNode } from '../../reader-sdu';
import { styles } from './reader-page-list-view.styles';

export interface ReaderChapterBlock {
  chapterId: string;
  pageUrls: string[];
  // Height/width aspect ratio per page (index-aligned with pageUrls) — 0 means "unavailable, fall
  // back to measuring this page once it's decoded on-device".
  pageAspectRatios: number[];
  // Server-Driven UI (see reader-sdu.ts): everything rendered BEFORE this chapter's pages
  // (typically a Gap + title) / AFTER them (typically an end-of-chapter label). Either can be
  // null — RN decides, Kotlin just draws whatever tree it's handed.
  firstNode: SduNode | null;
  lastNode: SduNode | null;
}

interface VisiblePageChangedEvent {
  chapterId: string;
  pageIndex: number;
  pageFraction: number;
  chapterFraction: number;
}

interface NativeProps {
  testID?: string;
  style?: ViewStyle | ViewStyle[];
  blocks: ReaderChapterBlock[];
  scrollToChapterId: string | null;
  scrollToPageIndex: number;
  onVisiblePageChanged?: (event: NativeSyntheticEvent<VisiblePageChangedEvent>) => void;
  onScrollToChapterHandled?: () => void;
  onTap?: () => void;
}

const RCTReaderPageListView = requireNativeComponent<NativeProps>('ReaderPageListView');

interface Props {
  blocks: ReaderChapterBlock[];
  // One-shot absolute scroll — used only for "continue reading" (initial page != 0). Chapter
  // switching reloads the whole `blocks` list, so the LazyColumn already starts at the target's
  // top. null chapterId means "no pending request".
  scrollToChapterId: string | null;
  scrollToPageIndex: number;
  onVisiblePageChanged?: (
    chapterId: string,
    pageIndex: number,
    pageFraction: number,
    chapterFraction: number,
  ) => void;
  onScrollToChapterHandled?: () => void;
  onTap?: () => void;
}

// Dumb: forwards props to the native view and unwraps its event payloads. Kotlin never decides
// navigation — it draws the blocks RN hands it and reports the visible page. All chapter-switch
// logic lives in useReader (moveFocus).
export function ReaderPageListView({
  blocks,
  scrollToChapterId,
  scrollToPageIndex,
  onVisiblePageChanged,
  onScrollToChapterHandled,
  onTap,
}: Props) {
  return (
    <RCTReaderPageListView
      testID="reader-page-list-view"
      style={[styles.root, styles.sized]}
      blocks={blocks}
      scrollToChapterId={scrollToChapterId}
      scrollToPageIndex={scrollToPageIndex}
      onVisiblePageChanged={
        onVisiblePageChanged
          ? event =>
              onVisiblePageChanged(
                event.nativeEvent.chapterId,
                event.nativeEvent.pageIndex,
                event.nativeEvent.pageFraction,
                event.nativeEvent.chapterFraction,
              )
          : undefined
      }
      onScrollToChapterHandled={onScrollToChapterHandled}
      onTap={onTap}
    />
  );
}
