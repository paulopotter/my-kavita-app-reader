import React from 'react';
import { render } from '@testing-library/react-native';
import { Image } from 'react-native';
import { getStrings } from '../../../../shared/i18n/strings';
import { ReaderListItem } from '../../../../shared/transforms/page';
import { ReaderListItemRenderer } from '../../components/ReaderListItemRenderer';

const baseProps = {
  seriesName: 'One Piece',
  chapterTitle: '1. A Chegada',
  nextChapterTitle: '2. A Fuga',
  hasNext: true,
  pageUrl: 'https://example/p0.jpg',
  decodeReal: true,
  gapHeight: 60,
  onLayout: jest.fn(),
  t: getStrings('pt-BR'),
};

describe('ReaderListItemRenderer', () => {
  beforeEach(() => {
    jest.spyOn(Image, 'getSize').mockImplementation((_uri, success) => {
      success(800, 1200);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renderiza ChapterHeader para item HEADER', () => {
    const item: ReaderListItem = { key: 'c1:HEADER:', kind: 'HEADER', chapterId: 'c1' };
    const { getByText } = render(<ReaderListItemRenderer item={item} {...baseProps} />);

    expect(getByText('1. A Chegada')).toBeTruthy();
  });

  it('renderiza ChapterFooter para item FOOTER', () => {
    const item: ReaderListItem = { key: 'c1:FOOTER:', kind: 'FOOTER', chapterId: 'c1' };
    const { getByText } = render(<ReaderListItemRenderer item={item} {...baseProps} />);

    expect(getByText('Fim do capítulo {0}')).toBeTruthy();
    expect(getByText('2. A Fuga')).toBeTruthy();
  });

  it('renderiza ReaderGap para item GAP', () => {
    const item: ReaderListItem = { key: 'gap:c1:c2', kind: 'GAP', chapterId: 'c2' };
    const { getByTestId } = render(<ReaderListItemRenderer item={item} {...baseProps} />);

    expect(getByTestId('reader-gap').props.style).toEqual({ height: 60 });
  });

  it('renderiza PageImage para item PAGE quando ha url', () => {
    const item: ReaderListItem = { key: 'c1:PAGE:0', kind: 'PAGE', chapterId: 'c1', pageIndex: 0 };
    const { getByTestId } = render(<ReaderListItemRenderer item={item} {...baseProps} />);

    expect(getByTestId('page-image-root')).toBeTruthy();
  });

  it('nao renderiza nada para item PAGE sem url', () => {
    const item: ReaderListItem = { key: 'c1:PAGE:0', kind: 'PAGE', chapterId: 'c1', pageIndex: 0 };
    const { queryByTestId } = render(<ReaderListItemRenderer item={item} {...baseProps} pageUrl={undefined} />);

    expect(queryByTestId('page-image-root')).toBeNull();
  });
});
