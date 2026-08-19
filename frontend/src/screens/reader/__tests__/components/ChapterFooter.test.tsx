import React from 'react';
import { render } from '@testing-library/react-native';
import { getStrings } from '../../../../shared/i18n/strings';
import { ChapterFooter } from '../../components/ChapterFooter';

const t = getStrings('pt-BR');

describe('ChapterFooter', () => {
  it('renderiza "Fim do capitulo"', () => {
    const { getByText } = render(<ChapterFooter hasNext={false} chapterTitle={null} onLayout={jest.fn()} t={t} />);

    expect(getByText('Fim do capítulo {0}')).toBeTruthy();
  });

  it('mostra label "Proximo:" e preview do proximo capitulo quando hasNext e true', () => {
    const { getByText } = render(
      <ChapterFooter hasNext chapterTitle="2. A Fuga" onLayout={jest.fn()} t={t} />,
    );

    expect(getByText('Próximo:')).toBeTruthy();
    expect(getByText('2. A Fuga')).toBeTruthy();
  });

  it('nao mostra preview quando hasNext e false', () => {
    const { queryByText } = render(
      <ChapterFooter hasNext={false} chapterTitle="2. A Fuga" onLayout={jest.fn()} t={t} />,
    );

    expect(queryByText('2. A Fuga')).toBeNull();
  });

  it('propaga a altura via onLayout', () => {
    const onLayout = jest.fn();
    const { getByTestId } = render(<ChapterFooter hasNext={false} chapterTitle={null} onLayout={onLayout} t={t} />);

    getByTestId('chapter-footer-root').props.onLayout({
      nativeEvent: { layout: { height: 100, width: 400, x: 0, y: 0 } },
    });

    expect(onLayout).toHaveBeenCalledWith(100);
  });
});
