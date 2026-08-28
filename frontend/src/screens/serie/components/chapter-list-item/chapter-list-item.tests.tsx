import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../../../shared/i18n/strings';
import type { SerieChapter } from '../../../../shared';
import { ChapterListItem } from './chapter-list-item.component';

const t = getStrings('pt-BR');

function makeChapter(overrides: Partial<SerieChapter> = {}): SerieChapter {
  return {
    id: '1',
    seriesId: '10',
    title: 'A Chegada',
    number: 1,
    readStatus: 'UNREAD',
    coverImage: {} as SerieChapter['coverImage'],
    pages: { list: [] },
    resolvedAtEpochMs: 0,
    server: {} as SerieChapter['server'],
    action: { method: 'navigate', route: 'reader/:seriesId/:chapterId', params: {} },
    ...overrides,
  };
}

describe('ChapterListItem', () => {
  it('renders the chapter title', () => {
    const { getByText } = render(
      <ChapterListItem chapter={makeChapter()} index={0} selectionMode={false} selected={false} t={t} onPress={jest.fn()} onLongPress={jest.fn()} />,
    );
    expect(getByText('1. A Chegada')).toBeTruthy();
  });

  it('calls onPress with the chapter id when tapped', () => {
    const onPress = jest.fn();
    const chapter = makeChapter({ id: '42' });
    const { getByText } = render(
      <ChapterListItem chapter={chapter} index={0} selectionMode={false} selected={false} t={t} onPress={onPress} onLongPress={jest.fn()} />,
    );
    fireEvent.press(getByText('1. A Chegada'));
    expect(onPress).toHaveBeenCalledWith('42');
  });

  it('calls onLongPress with the chapter id', () => {
    const onLongPress = jest.fn();
    const chapter = makeChapter({ id: '42' });
    const { getByText } = render(
      <ChapterListItem chapter={chapter} index={0} selectionMode={false} selected={false} t={t} onPress={jest.fn()} onLongPress={onLongPress} />,
    );
    fireEvent(getByText('1. A Chegada'), 'longPress');
    expect(onLongPress).toHaveBeenCalledWith('42');
  });

  it('uses "Capítulo N" when the title is redundant with the number', () => {
    const chapter = makeChapter({ number: 3, title: '3' });
    const { getByText } = render(
      <ChapterListItem chapter={chapter} index={0} selectionMode={false} selected={false} t={t} onPress={jest.fn()} onLongPress={jest.fn()} />,
    );
    expect(getByText('Capítulo 3')).toBeTruthy();
  });

  it('shows the raw title when there is a real title but no number at all', () => {
    const chapter = makeChapter({ number: undefined, decimalNumber: undefined, title: 'A Chegada' });
    const { getByText } = render(
      <ChapterListItem chapter={chapter} index={0} selectionMode={false} selected={false} t={t} onPress={jest.fn()} onLongPress={jest.fn()} />,
    );
    expect(getByText('A Chegada')).toBeTruthy();
  });

  it('uses the untitled fallback when there is no title and no number', () => {
    const chapter = makeChapter({ number: undefined, title: '' });
    const { getByText } = render(
      <ChapterListItem chapter={chapter} index={0} selectionMode={false} selected={false} t={t} onPress={jest.fn()} onLongPress={jest.fn()} />,
    );
    expect(getByText('Sem título')).toBeTruthy();
  });

  it('shows the specialLabel instead of the title when the chapter is special', () => {
    const chapter = makeChapter({ isSpecial: true, specialLabel: 'Extra: Behind the Scenes', title: 'Should not show' });
    const { getByText } = render(
      <ChapterListItem chapter={chapter} index={0} selectionMode={false} selected={false} t={t} onPress={jest.fn()} onLongPress={jest.fn()} />,
    );
    expect(getByText('Extra: Behind the Scenes')).toBeTruthy();
  });

  it('falls back to the normal title path when isSpecial is true but there is no specialLabel', () => {
    const chapter = makeChapter({ isSpecial: true, specialLabel: undefined, title: 'A Chegada' });
    const { getByText } = render(
      <ChapterListItem chapter={chapter} index={0} selectionMode={false} selected={false} t={t} onPress={jest.fn()} onLongPress={jest.fn()} />,
    );
    expect(getByText('1. A Chegada')).toBeTruthy();
  });

  it('prefers decimalNumber over number in the displayed title', () => {
    const chapter = makeChapter({ number: 1, decimalNumber: 1.5, title: 'A Chegada' });
    const { getByText } = render(
      <ChapterListItem chapter={chapter} index={0} selectionMode={false} selected={false} t={t} onPress={jest.fn()} onLongPress={jest.fn()} />,
    );
    expect(getByText('1.5. A Chegada')).toBeTruthy();
  });

  it('renders without crashing at an odd index (zebra), when read, and when selected', () => {
    const chapter = makeChapter({ readStatus: 'READ' });
    const { getByText } = render(
      <ChapterListItem chapter={chapter} index={1} selectionMode selected t={t} onPress={jest.fn()} onLongPress={jest.fn()} />,
    );
    expect(getByText('1. A Chegada')).toBeTruthy();
  });
});
