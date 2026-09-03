import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ScrollToTopButton } from './scroll-to-top-button.component';

describe('ScrollToTopButton', () => {
  it('renders the up arrow', () => {
    const { getByText } = render(<ScrollToTopButton onPress={jest.fn()} />);
    expect(getByText('↑')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<ScrollToTopButton onPress={onPress} />);
    fireEvent.press(getByText('↑'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('applies the right offset (default 16, overridable)', () => {
    const { UNSAFE_getByType, rerender } = render(<ScrollToTopButton onPress={jest.fn()} />);
    const { TouchableOpacity } = require('react-native');
    expect(UNSAFE_getByType(TouchableOpacity).props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ right: 16 })]),
    );
    rerender(<ScrollToTopButton onPress={jest.fn()} right={40} />);
    expect(UNSAFE_getByType(TouchableOpacity).props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ right: 40 })]),
    );
  });
});
