import React from 'react';
import { render } from '@testing-library/react-native';
import { ChapterFooter } from '../../components/ChapterFooter';

describe('ChapterFooter', () => {
  it('renderiza "Fim do capitulo"', () => {
    const { getByText } = render(<ChapterFooter hasNext={false} chapterTitle={null} onLayout={jest.fn()} />);

    expect(getByText('Fim do capítulo')).toBeTruthy();
  });

  it('mostra preview do proximo capitulo quando hasNext e true', () => {
    const { getByText } = render(
      <ChapterFooter hasNext chapterTitle="2. A Fuga" onLayout={jest.fn()} />,
    );

    expect(getByText('2. A Fuga')).toBeTruthy();
  });

  it('nao mostra preview quando hasNext e false', () => {
    const { queryByText } = render(
      <ChapterFooter hasNext={false} chapterTitle="2. A Fuga" onLayout={jest.fn()} />,
    );

    expect(queryByText('2. A Fuga')).toBeNull();
  });

  it('propaga a altura via onLayout', () => {
    const onLayout = jest.fn();
    const { getByTestId } = render(<ChapterFooter hasNext={false} chapterTitle={null} onLayout={onLayout} />);

    getByTestId('chapter-footer-root').props.onLayout({
      nativeEvent: { layout: { height: 100, width: 400, x: 0, y: 0 } },
    });

    expect(onLayout).toHaveBeenCalledWith(100);
  });
});
