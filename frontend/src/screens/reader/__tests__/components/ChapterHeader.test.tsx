import React from 'react';
import { render } from '@testing-library/react-native';
import { ChapterHeader } from '../../components/ChapterHeader';

describe('ChapterHeader', () => {
  it('renderiza titulo do capitulo e nome da serie', () => {
    const { getByText } = render(
      <ChapterHeader chapterTitle="1. A Chegada" seriesName="One Piece" onLayout={jest.fn()} />,
    );

    expect(getByText('1. A Chegada')).toBeTruthy();
    expect(getByText('One Piece')).toBeTruthy();
  });

  it('propaga a altura via onLayout', () => {
    const onLayout = jest.fn();
    const { getByTestId } = render(
      <ChapterHeader chapterTitle="1. A Chegada" seriesName="One Piece" onLayout={onLayout} />,
    );

    getByTestId('chapter-header-root').props.onLayout({
      nativeEvent: { layout: { height: 120, width: 400, x: 0, y: 0 } },
    });

    expect(onLayout).toHaveBeenCalledWith(120);
  });
});
