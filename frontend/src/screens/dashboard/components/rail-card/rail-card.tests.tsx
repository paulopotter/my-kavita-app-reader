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

  it('blurs the cover, name and caption only when asked', () => {
    const { Image } = require('react-native');
    const { UNSAFE_getByType, getByText, rerender } = render(<RailCard {...base} caption="Ch. 10" />);
    expect(UNSAFE_getByType(Image).props.blurRadius).toBe(0);
    expect(JSON.stringify(getByText('One Piece').props.style)).not.toContain('transparent');
    rerender(<RailCard {...base} caption="Ch. 10" blurred />);
    expect(UNSAFE_getByType(Image).props.blurRadius).toBeGreaterThan(0);
    expect(JSON.stringify(getByText('One Piece').props.style)).toContain('transparent');
    expect(JSON.stringify(getByText('Ch. 10').props.style)).toContain('transparent');
  });

  it('draws a badge on the cover only when it has one', () => {
    const { getByText, queryByTestId, rerender } = render(<RailCard {...base} badge="Novel" />);
    expect(getByText('Novel')).toBeTruthy();
    rerender(<RailCard {...base} />);
    expect(queryByTestId('rail-card-badge')).toBeNull();
  });
});
