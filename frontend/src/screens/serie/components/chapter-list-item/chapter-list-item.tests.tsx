import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { SerieChapter } from '../../../../shared';
import { ChapterListItem } from './chapter-list-item.component';

// Dumb component: it renders the `title` string it's handed and wires the callbacks. The label
// composition (real title vs. "Capítulo N" vs. special-label) now lives in ChapterTool.format.title
// and is tested in shared/tools/chapters/chapters.tests.ts.

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
  it('renders the title string it is given', () => {
    const { getByText } = render(
      <ChapterListItem chapter={makeChapter()} title="1. A Chegada" index={0} selectionMode={false} selected={false} onPress={jest.fn()} onLongPress={jest.fn()} />,
    );
    expect(getByText('1. A Chegada')).toBeTruthy();
  });

  it('calls onPress with the chapter id when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ChapterListItem chapter={makeChapter({ id: '42' })} title="Capítulo 9" index={0} selectionMode={false} selected={false} onPress={onPress} onLongPress={jest.fn()} />,
    );
    fireEvent.press(getByText('Capítulo 9'));
    expect(onPress).toHaveBeenCalledWith('42');
  });

  it('calls onLongPress with the chapter id', () => {
    const onLongPress = jest.fn();
    const { getByText } = render(
      <ChapterListItem chapter={makeChapter({ id: '42' })} title="Capítulo 9" index={0} selectionMode={false} selected={false} onPress={jest.fn()} onLongPress={onLongPress} />,
    );
    fireEvent(getByText('Capítulo 9'), 'longPress');
    expect(onLongPress).toHaveBeenCalledWith('42');
  });

  it('renders without crashing at an odd index (zebra), when read, and when selected', () => {
    const { getByText } = render(
      <ChapterListItem chapter={makeChapter({ readStatus: 'READ' })} title="1. A Chegada" index={1} selectionMode selected onPress={jest.fn()} onLongPress={jest.fn()} />,
    );
    expect(getByText('1. A Chegada')).toBeTruthy();
  });
});
