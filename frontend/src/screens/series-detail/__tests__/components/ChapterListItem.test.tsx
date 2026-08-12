import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Chapter } from '../../../../shared/bridge/series';
import { ChapterListItem } from '../../components/ChapterListItem';

function makeChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: '1',
    seriesId: '10',
    title: 'A Chegada',
    number: '1',
    pageCount: 20,
    sortOrder: 1,
    readStatus: 'UNREAD',
    pagesRead: 0,
    updatedAtLocalMs: null,
    ...overrides,
  };
}

describe('ChapterListItem', () => {
  it('renderiza o titulo do capitulo', () => {
    const { getByText } = render(
      <ChapterListItem
        chapter={makeChapter()}
        index={0}
        selectionMode={false}
        selected={false}
        onPress={jest.fn()}
        onLongPress={jest.fn()}
      />,
    );
    expect(getByText('Cap. 1 — A Chegada')).toBeTruthy();
  });

  it('chama onPress com o id do capitulo ao tocar', () => {
    const onPress = jest.fn();
    const chapter = makeChapter({ id: '42' });
    const { getByText } = render(
      <ChapterListItem
        chapter={chapter}
        index={0}
        selectionMode={false}
        selected={false}
        onPress={onPress}
        onLongPress={jest.fn()}
      />,
    );
    fireEvent.press(getByText('Cap. 1 — A Chegada'));
    expect(onPress).toHaveBeenCalledWith('42');
  });

  it('chama onLongPress com o id do capitulo', () => {
    const onLongPress = jest.fn();
    const chapter = makeChapter({ id: '42' });
    const { getByText } = render(
      <ChapterListItem
        chapter={chapter}
        index={0}
        selectionMode={false}
        selected={false}
        onPress={jest.fn()}
        onLongPress={onLongPress}
      />,
    );
    fireEvent(getByText('Cap. 1 — A Chegada'), 'longPress');
    expect(onLongPress).toHaveBeenCalledWith('42');
  });
});
