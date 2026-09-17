import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ChevronLeft } from 'lucide-react-native';
import { BackChevron } from './back-chevron.component';

describe('BackChevron', () => {
  it('renders the chevron-left icon', () => {
    const { UNSAFE_getByType } = render(<BackChevron onPress={jest.fn()} />);
    expect(UNSAFE_getByType(ChevronLeft)).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { UNSAFE_getByType } = render(<BackChevron onPress={onPress} />);
    const { TouchableOpacity } = require('react-native');
    fireEvent.press(UNSAFE_getByType(TouchableOpacity));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
