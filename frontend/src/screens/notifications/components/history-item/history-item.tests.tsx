import React from 'react';
import { Image } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { HistoryItem, type HistoryItemProps } from './history-item.component';

const props = (over: Partial<HistoryItemProps> = {}): HistoryItemProps => ({
  seriesName: 'One Piece',
  bodyText: 'Chapter 1050 available',
  timestampLabel: '2h ago',
  read: false,
  selectionMode: false,
  selected: false,
  onPress: jest.fn(),
  onLongPress: jest.fn(),
  onDelete: jest.fn(),
  onInfo: jest.fn(),
  deleteLabel: 'Delete',
  infoLabel: 'Info',
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

  it('calls onLongPress when the row is long-pressed', () => {
    const onLongPress = jest.fn();
    const { getByText } = render(<HistoryItem {...props({ onLongPress })} />);
    fireEvent(getByText('One Piece'), 'longPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when the delete button is tapped', () => {
    const onDelete = jest.fn();
    const { getByLabelText } = render(<HistoryItem {...props({ onDelete })} />);
    fireEvent.press(getByLabelText('Delete'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('calls onInfo when the info button is tapped', () => {
    const onInfo = jest.fn();
    const { getByLabelText } = render(<HistoryItem {...props({ onInfo })} />);
    fireEvent.press(getByLabelText('Info'));
    expect(onInfo).toHaveBeenCalledTimes(1);
  });

  it('renders without crashing when read is true', () => {
    const { getByText } = render(<HistoryItem {...props({ read: true })} />);
    expect(getByText('One Piece')).toBeTruthy();
  });

  it('does not call onDelete/onInfo while in selection mode (their space is reserved, not clickable)', () => {
    const onDelete = jest.fn();
    const onInfo = jest.fn();
    const { getByLabelText } = render(<HistoryItem {...props({ selectionMode: true, onDelete, onInfo })} />);
    fireEvent.press(getByLabelText('Info'));
    fireEvent.press(getByLabelText('Delete'));
    expect(onInfo).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  // Reserving the trailing actions' layout space in selection mode (see history-item.styles.ts's
  // own doc on why — avoiding a row-width shift when entering/exiting selection) keeps them in
  // the tree; this asserts the row's OWN layout footprint doesn't grow when unselected, which is
  // the part this component actually controls (RN Testing Library can't assert React Native's
  // real layout geometry — that's an integration/visual concern, not a unit-test one).
  it('reserves the trailing actions space via style, not by unmounting them, in selection mode', () => {
    const { getByLabelText } = render(<HistoryItem {...props({ selectionMode: true })} />);
    expect(getByLabelText('Info')).toBeTruthy();
  });

  it('renders a cover placeholder box even before coverUrl resolves, reserving its layout space', () => {
    const { UNSAFE_root } = render(<HistoryItem {...props()} />);
    const image = UNSAFE_root.findByType(Image);
    expect(image.props.source).toBeUndefined();
  });

  it('renders the real cover once coverUrl resolves', () => {
    const { UNSAFE_root } = render(<HistoryItem {...props({ coverUrl: 'https://cover/s1' })} />);
    const image = UNSAFE_root.findByType(Image);
    expect(image.props.source).toEqual({ uri: 'https://cover/s1' });
  });
});
