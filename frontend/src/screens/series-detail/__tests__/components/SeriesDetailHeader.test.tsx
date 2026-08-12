import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Chapter, SeriesDetail } from '../../../../shared/bridge/series';
import { getStrings } from '../../../../shared/i18n/strings';
import { SeriesDetailHeader } from '../../components/SeriesDetailHeader';

const t = getStrings('pt-BR');

const detail: SeriesDetail = {
  id: '10',
  name: 'One Piece',
  coverImageUrl: 'https://example.com/cover.jpg',
};

function makeChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: '1',
    seriesId: '10',
    title: '',
    number: '1',
    pageCount: 20,
    sortOrder: 1,
    readStatus: 'UNREAD',
    pagesRead: 0,
    updatedAtLocalMs: null,
    ...overrides,
  };
}

describe('SeriesDetailHeader', () => {
  it('renderiza nome da serie', () => {
    const { getByText } = render(
      <SeriesDetailHeader
        detail={detail}
        metadata={null}
        chapters={[]}
        continueChapter={null}
        isFollowed={false}
        t={t}
        onToggleFollow={jest.fn()}
        onActionPress={jest.fn()}
      />,
    );
    expect(getByText('One Piece')).toBeTruthy();
  });

  it('renderiza a sinopse vinda do metadata', () => {
    const { getByText } = render(
      <SeriesDetailHeader
        detail={detail}
        metadata={{ summary: 'Piratas em busca de tesouro', genres: [], tags: [] }}
        chapters={[]}
        continueChapter={null}
        isFollowed={false}
        t={t}
        onToggleFollow={jest.fn()}
        onActionPress={jest.fn()}
      />,
    );
    expect(getByText('Piratas em busca de tesouro')).toBeTruthy();
  });

  it('renderiza chips de generos e tags', () => {
    const { getByText } = render(
      <SeriesDetailHeader
        detail={detail}
        metadata={{ summary: null, genres: ['Aventura'], tags: ['Piratas'] }}
        chapters={[]}
        continueChapter={null}
        isFollowed={false}
        t={t}
        onToggleFollow={jest.fn()}
        onActionPress={jest.fn()}
      />,
    );
    expect(getByText('Aventura')).toBeTruthy();
    expect(getByText('Piratas')).toBeTruthy();
  });

  it('exibe estrela preenchida quando isFollowed=true', () => {
    const { getByText } = render(
      <SeriesDetailHeader
        detail={detail}
        metadata={null}
        chapters={[]}
        continueChapter={null}
        isFollowed={true}
        t={t}
        onToggleFollow={jest.fn()}
        onActionPress={jest.fn()}
      />,
    );
    expect(getByText('★')).toBeTruthy();
  });

  it('chama onToggleFollow ao tocar na estrela', () => {
    const onToggleFollow = jest.fn();
    const { getByText } = render(
      <SeriesDetailHeader
        detail={detail}
        metadata={null}
        chapters={[]}
        continueChapter={null}
        isFollowed={false}
        t={t}
        onToggleFollow={onToggleFollow}
        onActionPress={jest.fn()}
      />,
    );
    fireEvent.press(getByText('☆'));
    expect(onToggleFollow).toHaveBeenCalledTimes(1);
  });

  it('chama onActionPress ao tocar no botao de acao', () => {
    const onActionPress = jest.fn();
    const chapters = [makeChapter({ readStatus: 'UNREAD' })];
    const { getByText } = render(
      <SeriesDetailHeader
        detail={detail}
        metadata={null}
        chapters={chapters}
        continueChapter={chapters[0]}
        isFollowed={false}
        t={t}
        onToggleFollow={jest.fn()}
        onActionPress={onActionPress}
      />,
    );
    fireEvent.press(getByText(t.seriesDetailStartReading));
    expect(onActionPress).toHaveBeenCalledTimes(1);
  });

  it('exibe contagem de lidos/total', () => {
    const chapters = [
      makeChapter({ id: '1', readStatus: 'READ' }),
      makeChapter({ id: '2', readStatus: 'UNREAD' }),
    ];
    const { getByText } = render(
      <SeriesDetailHeader
        detail={detail}
        metadata={null}
        chapters={chapters}
        continueChapter={null}
        isFollowed={false}
        t={t}
        onToggleFollow={jest.fn()}
        onActionPress={jest.fn()}
      />,
    );
    expect(getByText('1/2')).toBeTruthy();
  });
});
