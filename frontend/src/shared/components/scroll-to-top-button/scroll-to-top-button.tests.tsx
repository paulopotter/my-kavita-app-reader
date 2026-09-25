import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ChevronUp } from 'lucide-react-native';
import { ScrollToTopButton } from './scroll-to-top-button.component';

describe('ScrollToTopButton', () => {
  it('renders the chevron-up icon', () => {
    const { UNSAFE_getByType } = render(<ScrollToTopButton onPress={jest.fn()} accessibilityLabel="Voltar ao topo" />);
    expect(UNSAFE_getByType(ChevronUp)).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<ScrollToTopButton onPress={onPress} accessibilityLabel="Voltar ao topo" />);
    fireEvent.press(getByLabelText('Voltar ao topo'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('applies the right offset (default 16, overridable)', () => {
    const { getByLabelText, rerender } = render(
      <ScrollToTopButton onPress={jest.fn()} accessibilityLabel="Voltar ao topo" />,
    );
    expect(getByLabelText('Voltar ao topo').props.style).toEqual(expect.objectContaining({ right: 16 }));
    rerender(<ScrollToTopButton onPress={jest.fn()} right={40} accessibilityLabel="Voltar ao topo" />);
    expect(getByLabelText('Voltar ao topo').props.style).toEqual(expect.objectContaining({ right: 40 }));
  });
});
