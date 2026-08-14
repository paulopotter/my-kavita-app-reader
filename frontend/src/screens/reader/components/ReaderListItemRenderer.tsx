import React from 'react';
import { Strings } from '../../../shared/i18n/strings';
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
  decodeReal: boolean;
  gapHeight: number;
  onLayout: (key: string, height: number) => void;
  t: Strings;
}

export function ReaderListItemRenderer({
  item,
  seriesName,
  chapterTitle,
  nextChapterTitle,
  hasNext,
  pageUrl,
  decodeReal,
  gapHeight,
  onLayout,
  t,
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
          t={t}
        />
      );
    case 'GAP':
      return <ReaderGap height={gapHeight} />;
    case 'PAGE':
      return pageUrl ? (
        <PageImage url={pageUrl} decodeReal={decodeReal} onLayout={height => onLayout(item.key, height)} />
      ) : null;
  }
}
