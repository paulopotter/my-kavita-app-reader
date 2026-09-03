import React from 'react';
import { render } from '@testing-library/react-native';
import { FollowStar } from './follow-star.component';
import { colors } from '../../theme';

describe('FollowStar', () => {
  it('renders a hollow star when inactive', () => {
    const { getByText } = render(<FollowStar active={false} />);
    expect(getByText('☆')).toBeTruthy();
  });

  it('renders a filled star when active', () => {
    const { getByText } = render(<FollowStar active />);
    expect(getByText('★')).toBeTruthy();
  });

  it('uses the theme muted colour when inactive and starActive when active', () => {
    const { getByText, rerender } = render(<FollowStar active={false} />);
    expect(getByText('☆').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: colors.muted })]),
    );
    rerender(<FollowStar active />);
    expect(getByText('★').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: colors.starActive })]),
    );
  });

  it('honours size / color / activeColor overrides', () => {
    const { getByText } = render(<FollowStar active size={30} activeColor="#123456" />);
    expect(getByText('★').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontSize: 30, color: '#123456' })]),
    );
  });
});
