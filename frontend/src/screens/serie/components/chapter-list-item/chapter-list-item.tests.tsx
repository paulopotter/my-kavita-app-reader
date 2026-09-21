import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { chapterEvents, type SerieChapter } from '../../../../shared';
import { ChapterListItem } from './chapter-list-item.component';
import { CHAPTER_ROW_HEIGHT } from './chapter-list-item.styles';
import { line, spacing } from '../../../../shared/theme';

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
    action: { navigate: { to: { route: 'reader/:seriesId/:chapterId', params: {} } } },
    events: chapterEvents({ seriesId: '10', chapterId: '1' }),
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

  // The list places rows by this number instead of measuring them, so if the row's own styles
  // drift away from it, every row past the first lands in the wrong place while scrolling.
  it('declares a row height that matches what the row is made of', () => {
    expect(CHAPTER_ROW_HEIGHT).toBe(spacing[5] * 2 + line.height[4]);
  });

  // A long series renders hundreds of these, so the memo is what keeps a list update from
  // re-rendering every row (RN flagged ~10s for one update on a 914-chapter series on device).
  it('is memoized', () => {
    expect((ChapterListItem as unknown as { $$typeof?: symbol }).$$typeof).toBe(Symbol.for('react.memo'));
  });

  // The memo only holds while props stay referentially stable, which is why the handlers take an
  // id instead of the caller wrapping them in `() => onPress(chapter)`.
  it('takes handlers that receive the id, so callers need no per-row closure', () => {
    const onPress = jest.fn();
    const chapter = makeChapter({ id: '42' });
    const { getByText, rerender } = render(
      <ChapterListItem chapter={chapter} title="Capítulo 9" index={0} selectionMode={false} selected={false} onPress={onPress} onLongPress={jest.fn()} />,
    );

    // Same handler reference across renders — what a memoized row needs to skip re-rendering.
    rerender(
      <ChapterListItem chapter={chapter} title="Capítulo 9" index={0} selectionMode={false} selected={false} onPress={onPress} onLongPress={jest.fn()} />,
    );

    fireEvent.press(getByText('Capítulo 9'));
    expect(onPress).toHaveBeenCalledWith('42');
  });

  it('renders without crashing at an odd index (zebra), when read, and when selected', () => {
    const { getByText } = render(
      <ChapterListItem chapter={makeChapter({ readStatus: 'READ' })} title="1. A Chegada" index={1} selectionMode selected onPress={jest.fn()} onLongPress={jest.fn()} />,
    );
    expect(getByText('1. A Chegada')).toBeTruthy();
  });
});
