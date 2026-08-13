import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Chapter } from '../../../../shared/bridge/series';
import { getStrings } from '../../../../shared/i18n/strings';
import { ChapterListItem } from '../../components/ChapterListItem';

const t = getStrings('pt-BR');

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
        t={t}
        onPress={jest.fn()}
        onLongPress={jest.fn()}
      />,
    );
    expect(getByText('1. A Chegada')).toBeTruthy();
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
        t={t}
        onPress={onPress}
        onLongPress={jest.fn()}
      />,
    );
    fireEvent.press(getByText('1. A Chegada'));
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
        t={t}
        onPress={jest.fn()}
        onLongPress={onLongPress}
      />,
    );
    fireEvent(getByText('1. A Chegada'), 'longPress');
    expect(onLongPress).toHaveBeenCalledWith('42');
  });

  it('usa "Capitulo N" quando titulo e redundante com o numero', () => {
    const chapter = makeChapter({ number: '3', title: '3' });
    const { getByText } = render(
      <ChapterListItem
        chapter={chapter}
        index={0}
        selectionMode={false}
        selected={false}
        t={t}
        onPress={jest.fn()}
        onLongPress={jest.fn()}
      />,
    );
    expect(getByText('Capítulo 3')).toBeTruthy();
  });
});
