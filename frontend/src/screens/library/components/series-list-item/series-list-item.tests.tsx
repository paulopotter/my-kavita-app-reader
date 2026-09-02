import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SeriesListItem, type SeriesListItemProps } from './series-list-item.component';

function props(over: Partial<SeriesListItemProps> = {}): SeriesListItemProps {
  return {
    id: 's1',
    name: 'Some Series',
    coverUrl: 'http://cover',
    progressFraction: 0.25,
    progressLabel: '25%',
    isFollowed: true,
    onToggleFollow: jest.fn(),
    onPress: jest.fn(),
    ...over,
  };
}

describe('SeriesListItem', () => {
  it('renders name and progress label', () => {
    const { getByText } = render(<SeriesListItem {...props()} />);
    expect(getByText('Some Series')).toBeTruthy();
    expect(getByText('25%')).toBeTruthy();
  });

  it('renders chapter-count and downloaded labels only when provided', () => {
    const { getByText } = render(
      <SeriesListItem {...props({ chapterCountLabel: '1/4 chs.', downloadedLabel: '4/10 chs.' })} />,
    );
    expect(getByText('1/4 chs.')).toBeTruthy();
    expect(getByText('4/10 chs.')).toBeTruthy();

    const { queryByText } = render(<SeriesListItem {...props()} />);
    expect(queryByText('1/4 chs.')).toBeNull();
    expect(queryByText('4/10 chs.')).toBeNull();
  });

  it('fires onPress with the id', () => {
    const onPress = jest.fn();
    const { getByText } = render(<SeriesListItem {...props({ onPress })} />);
    fireEvent.press(getByText('Some Series'));
    expect(onPress).toHaveBeenCalledWith('s1');
  });

  it('fires onToggleFollow from the star button', () => {
    const onToggleFollow = jest.fn();
    const { UNSAFE_getAllByType } = render(<SeriesListItem {...props({ onToggleFollow })} />);
    const { TouchableOpacity } = require('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(touchables[touchables.length - 1]);
    expect(onToggleFollow).toHaveBeenCalledWith('s1');
  });
});
