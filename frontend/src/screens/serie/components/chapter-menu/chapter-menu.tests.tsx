import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../../../shared/i18n/strings';
import { ChapterMenu } from './chapter-menu.component';

const t = getStrings('pt-BR');
const anchor = { top: 100, right: 16 };

describe('ChapterMenu', () => {
  it('renders nothing while not visible', () => {
    const { queryByText } = render(
      <ChapterMenu visible={false} anchor={anchor} t={t} onClose={jest.fn()} onSelectSort={jest.fn()} onSelectRange={jest.fn()} />,
    );
    expect(queryByText(t.seriesDetailChapterMenuSort)).toBeNull();
  });

  it('renders nothing while the anchor has not been measured yet, even if visible', () => {
    const { queryByText } = render(
      <ChapterMenu visible={true} anchor={null} t={t} onClose={jest.fn()} onSelectSort={jest.fn()} onSelectRange={jest.fn()} />,
    );
    expect(queryByText(t.seriesDetailChapterMenuSort)).toBeNull();
  });

  it('shows both items while visible with a measured anchor', () => {
    const { getByText } = render(
      <ChapterMenu visible={true} anchor={anchor} t={t} onClose={jest.fn()} onSelectSort={jest.fn()} onSelectRange={jest.fn()} />,
    );
    expect(getByText(t.seriesDetailChapterMenuSort)).toBeTruthy();
    expect(getByText(t.seriesDetailChapterMenuRange)).toBeTruthy();
  });

  it('closes and calls onSelectSort when the sort item is pressed', () => {
    const onClose = jest.fn();
    const onSelectSort = jest.fn();
    const { getByText } = render(
      <ChapterMenu visible={true} anchor={anchor} t={t} onClose={onClose} onSelectSort={onSelectSort} onSelectRange={jest.fn()} />,
    );
    fireEvent.press(getByText(t.seriesDetailChapterMenuSort));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelectSort).toHaveBeenCalledTimes(1);
  });

  it('closes and calls onSelectRange when the range item is pressed', () => {
    const onClose = jest.fn();
    const onSelectRange = jest.fn();
    const { getByText } = render(
      <ChapterMenu visible={true} anchor={anchor} t={t} onClose={onClose} onSelectSort={jest.fn()} onSelectRange={onSelectRange} />,
    );
    fireEvent.press(getByText(t.seriesDetailChapterMenuRange));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelectRange).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is pressed', () => {
    const onClose = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <ChapterMenu visible={true} anchor={anchor} t={t} onClose={onClose} onSelectSort={jest.fn()} onSelectRange={jest.fn()} />,
    );
    const Pressable = require('react-native').Pressable;
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]); // backdrop is the outermost Pressable
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
