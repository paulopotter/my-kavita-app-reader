import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { HistoryItem, type HistoryItemProps } from './history-item.component';

const props = (over: Partial<HistoryItemProps> = {}): HistoryItemProps => ({
  seriesName: 'One Piece',
  bodyText: 'Chapter 1050 available',
  timestampLabel: '2h ago',
  read: false,
  onPress: jest.fn(),
  onDelete: jest.fn(),
  deleteLabel: 'Delete',
  ...over,
});

describe('HistoryItem', () => {
  it('renders series name, body, and timestamp', () => {
    const { getByText } = render(<HistoryItem {...props()} />);
    expect(getByText('One Piece')).toBeTruthy();
    expect(getByText('Chapter 1050 available')).toBeTruthy();
    expect(getByText('2h ago')).toBeTruthy();
  });

  it('calls onPress when the row is tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<HistoryItem {...props({ onPress })} />);
    fireEvent.press(getByText('One Piece'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when the delete button is tapped', () => {
    const onDelete = jest.fn();
    const { getByText } = render(<HistoryItem {...props({ onDelete })} />);
    fireEvent.press(getByText('✕'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('renders without crashing when read is true', () => {
    const { getByText } = render(<HistoryItem {...props({ read: true })} />);
    expect(getByText('One Piece')).toBeTruthy();
  });
});
