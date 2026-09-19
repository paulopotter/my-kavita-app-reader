import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
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
      <IconButton icon={ChevronLeft} glyph="chevron" size={28} color="#fff" onPress={onPress} />,
    );
    expect(UNSAFE_getByType(ChevronLeft).props.size).toBe(28);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });

  it('sits where it is put when alignStroke is off', () => {
    const r = render(<IconButton icon={ChevronLeft} glyph="chevron" size={28} color="#fff" />);
    expect(pull(r)).toBeUndefined();
  });

  // The point of the component: the stroke, not the box around it, lines up with its neighbours.
  it('pulls itself out by the glyph’s own empty margin when alignStroke is on', () => {
    const r = render(<IconButton icon={ChevronLeft} glyph="chevron" size={28} color="#fff" alignStroke />);
    expect(pull(r)).toBe(-Math.round(28 * GLYPH_INSET.chevron));
  });

  // Which is why the amount is per glyph: a circle nearly fills its box, a chevron does not.
  it('pulls less for a glyph that fills more of its box', () => {
    const chevron = render(<IconButton icon={ChevronLeft} glyph="chevron" size={24} color="#fff" alignStroke />);
    const circle = render(<IconButton icon={Circle} glyph="circle" size={24} color="#fff" alignStroke />);
    expect(Math.abs(pull(circle)!)).toBeLessThan(Math.abs(pull(chevron)!));
  });

  it('scales the pull with the size it is drawn at', () => {
    const small = render(<IconButton icon={ChevronLeft} glyph="chevron" size={16} color="#fff" alignStroke />);
    const large = render(<IconButton icon={ChevronLeft} glyph="chevron" size={28} color="#fff" alignStroke />);
    expect(Math.abs(pull(small)!)).toBeLessThan(Math.abs(pull(large)!));
  });
});
