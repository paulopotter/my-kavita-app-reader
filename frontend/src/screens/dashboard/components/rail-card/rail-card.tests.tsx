import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { RailCard } from './rail-card.component';

const base = { id: 's1', name: 'One Piece', coverUrl: 'c', onPress: jest.fn() };

describe('RailCard', () => {
  it('shows the name, the caption and a bar only when there is progress', () => {
    const { getByText, queryByTestId, rerender } = render(<RailCard {...base} caption="Ch. 10" progressFraction={0.5} />);
    expect(getByText('One Piece')).toBeTruthy();
    expect(getByText('Ch. 10')).toBeTruthy();
    expect(queryByTestId('rail-card-progress')).not.toBeNull();
    rerender(<RailCard {...base} />);
    expect(queryByTestId('rail-card-progress')).toBeNull();
  });

  it('reports the press with its id', () => {
    const onPress = jest.fn();
    const { getByText } = render(<RailCard {...base} onPress={onPress} />);
    fireEvent.press(getByText('One Piece'));
    expect(onPress).toHaveBeenCalledWith('s1');
  });
});
