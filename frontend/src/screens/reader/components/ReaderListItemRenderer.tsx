import React from 'react';
import { ReaderListItem } from '../../../shared/transforms/page';
import { ChapterFooter } from './ChapterFooter';
import { ChapterHeader } from './ChapterHeader';
import { PageImage } from './PageImage';
import { ReaderGap } from './ReaderGap';

interface Props {
  item: ReaderListItem;
  seriesName: string;
  chapterTitle: string;
  nextChapterTitle: string | null;
  hasNext: boolean;
  pageUrl: string | undefined;
  gapHeight: number;
  onLayout: (key: string, height: number) => void;
}

export function ReaderListItemRenderer({
  item,
  seriesName,
  chapterTitle,
  nextChapterTitle,
  hasNext,
  pageUrl,
  gapHeight,
  onLayout,
}: Props) {
  switch (item.kind) {
    case 'HEADER':
      return (
        <ChapterHeader
          seriesName={seriesName}
          chapterTitle={chapterTitle}
          onLayout={height => onLayout(item.key, height)}
        />
      );
    case 'FOOTER':
      return (
        <ChapterFooter
          hasNext={hasNext}
          chapterTitle={nextChapterTitle}
          onLayout={height => onLayout(item.key, height)}
        />
      );
    case 'GAP':
      return <ReaderGap height={gapHeight} />;
    case 'PAGE':
      return pageUrl ? <PageImage url={pageUrl} onLayout={height => onLayout(item.key, height)} /> : null;
  }
}
