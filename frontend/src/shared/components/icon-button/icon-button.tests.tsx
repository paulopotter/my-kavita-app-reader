import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { ChevronLeft, Circle } from 'lucide-react-native';
import { IconButton } from './icon-button.component';
import { GLYPH_INSET } from './icon-button.glyphs';

// RN flattens the style array onto one object by the time it reaches the host node.
const pull = (r: ReturnType<typeof render>): number | undefined =>
  r.getByRole('button').props.style?.marginLeft;

describe('IconButton', () => {
  it('draws the icon at the size it is given and calls onPress', () => {
    const onPress = jest.fn();
    const { UNSAFE_getByType, getByRole } = render(
      <IconButton icon={ChevronLeft} glyph="chevron" size={28} color="#fff" onPress={onPress} accessibilityLabel="Voltar" />,
    );
    expect(UNSAFE_getByType(ChevronLeft).props.size).toBe(28);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });

  it('sits where it is put when alignStroke is off', () => {
    const r = render(<IconButton icon={ChevronLeft} glyph="chevron" size={28} color="#fff" accessibilityLabel="Voltar" />);
    expect(pull(r)).toBeUndefined();
  });

  // The point of the component: the stroke, not the box around it, lines up with its neighbours.
  it('pulls itself out by the glyph’s own empty margin when alignStroke is on', () => {
    const r = render(<IconButton icon={ChevronLeft} glyph="chevron" size={28} color="#fff" accessibilityLabel="Voltar" alignStroke />);
    expect(pull(r)).toBe(-Math.round(28 * GLYPH_INSET.chevron));
  });

  // Which is why the amount is per glyph: a circle nearly fills its box, a chevron does not.
  it('pulls less for a glyph that fills more of its box', () => {
    const chevron = render(<IconButton icon={ChevronLeft} glyph="chevron" size={24} color="#fff" accessibilityLabel="Voltar" alignStroke />);
    const circle = render(<IconButton icon={Circle} glyph="circle" size={24} color="#fff" accessibilityLabel="Círculo" alignStroke />);
    expect(Math.abs(pull(circle)!)).toBeLessThan(Math.abs(pull(chevron)!));
  });

  it('scales the pull with the size it is drawn at', () => {
    const small = render(<IconButton icon={ChevronLeft} glyph="chevron" size={16} color="#fff" accessibilityLabel="Voltar" alignStroke />);
    const large = render(<IconButton icon={ChevronLeft} glyph="chevron" size={28} color="#fff" accessibilityLabel="Voltar" alignStroke />);
    expect(Math.abs(pull(small)!)).toBeLessThan(Math.abs(pull(large)!));
  });

  it('carries the label as the accessible name', () => {
    const { getByLabelText } = render(
      <IconButton icon={ChevronLeft} glyph="chevron" size={24} color="#fff" accessibilityLabel="Voltar" />,
    );
    expect(getByLabelText('Voltar')).toBeTruthy();
  });

  it('shows the label as a tooltip on long-press, staying up after release and auto-dismissing after its timer', () => {
    // measureInWindow's callback fires asynchronously off native layout — not implemented by
    // RN's test renderer, so it's stubbed to resolve synchronously with a fixed anchor.
    const measureSpy = jest
      .spyOn(require('react-native').View.prototype, 'measureInWindow')
      .mockImplementation(((cb: (x: number, y: number, width: number, height: number) => void) =>
        cb(10, 20, 30, 40)) as never);

    jest.useFakeTimers();
    const { getByLabelText, queryByText } = render(
      <IconButton icon={ChevronLeft} glyph="chevron" size={24} color="#fff" accessibilityLabel="Voltar" />,
    );
    const button = getByLabelText('Voltar');
    expect(queryByText('Voltar')).toBeNull();
    fireEvent(button, 'longPress');
    expect(queryByText('Voltar')).toBeTruthy();

    // Releasing the finger is exactly when the tooltip becomes readable — it must not vanish then.
    fireEvent(button, 'pressOut');
    expect(queryByText('Voltar')).toBeTruthy();

    // Only the auto-dismiss timer (plus its fade) takes it away.
    act(() => {
      jest.advanceTimersByTime(2300);
    });
    expect(queryByText('Voltar')).toBeNull();

    jest.useRealTimers();
    measureSpy.mockRestore();
  });

  it('clamps the tooltip inside the screen when the button sits right at the edge', () => {
    const { width: screenWidth } = Dimensions.get('window');
    // A button hugging the right edge — centering the tooltip on it would push most of the box
    // off-screen without the clamp.
    const measureSpy = jest
      .spyOn(require('react-native').View.prototype, 'measureInWindow')
      .mockImplementation(((cb: (x: number, y: number, width: number, height: number) => void) =>
        cb(screenWidth - 20, 20, 20, 20)) as never);

    const { getByLabelText, getByText } = render(
      <IconButton icon={ChevronLeft} glyph="chevron" size={20} color="#fff" accessibilityLabel="Ordenar" />,
    );
    fireEvent(getByLabelText('Ordenar'), 'longPress');

    let node = getByText('Ordenar').parent;
    while (node && node.props.style?.left === undefined) {
      node = node.parent;
    }
    expect(node?.props.style?.left).toBeGreaterThanOrEqual(0);

    measureSpy.mockRestore();
  });
});
