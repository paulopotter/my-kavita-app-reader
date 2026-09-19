import React from 'react';
import { render } from '@testing-library/react-native';
import { Star } from 'lucide-react-native';
import { FollowStar } from './follow-star.component';
import { colors } from '../../theme';

// The star is one lucide icon in two states, not two glyphs: `fill` is what makes it solid. So
// what is worth asserting is the fill and the tint — rendering the right character is no longer a
// thing that can go wrong.
describe('FollowStar', () => {
  it('renders a hollow star when inactive', () => {
    const { UNSAFE_getByType } = render(<FollowStar active={false} />);
    expect(UNSAFE_getByType(Star).props.fill).toBe('none');
  });

  it('fills the star with its own tint when active', () => {
    const { UNSAFE_getByType } = render(<FollowStar active />);
    const star = UNSAFE_getByType(Star);
    expect(star.props.fill).toBe(colors.icon.following);
    expect(star.props.color).toBe(colors.icon.following);
  });

  it('uses the inactive icon token when inactive and the following token when active', () => {
    const { UNSAFE_getByType, rerender } = render(<FollowStar active={false} />);
    expect(UNSAFE_getByType(Star).props.color).toBe(colors.icon.tertiary);
    rerender(<FollowStar active />);
    expect(UNSAFE_getByType(Star).props.color).toBe(colors.icon.following);
  });

  it('honours size / color / activeColor overrides', () => {
    const { UNSAFE_getByType } = render(<FollowStar active size={30} activeColor="#123456" />);
    const star = UNSAFE_getByType(Star);
    expect(star.props.size).toBe(30);
    expect(star.props.color).toBe('#123456');
    expect(star.props.fill).toBe('#123456');
  });

  it('honours the inactive colour override', () => {
    const { UNSAFE_getByType } = render(<FollowStar active={false} color="#654321" />);
    expect(UNSAFE_getByType(Star).props.color).toBe('#654321');
  });
});
