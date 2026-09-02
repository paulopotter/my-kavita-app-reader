import React from 'react';
import { render } from '@testing-library/react-native';
import { Progress } from './progress.component';

describe('Progress', () => {
  it('renders the bar without a caption when no label is given', () => {
    const { queryByText, toJSON } = render(<Progress progress={0.5} />);
    expect(toJSON()).toBeTruthy();
    // no text nodes at all
    expect(queryByText(/.+/)).toBeNull();
  });

  it('renders the caption when a label is given', () => {
    const { getByText } = render(<Progress progress={0.3} label="Carregando biblioteca" />);
    expect(getByText('Carregando biblioteca')).toBeTruthy();
  });

  it('clamps progress into 0..1 (no crash on out-of-range values)', () => {
    expect(() => render(<Progress progress={-2} />)).not.toThrow();
    expect(() => render(<Progress progress={5} />)).not.toThrow();
  });

  it('is memoized (the screen re-renders it on every hook tick)', () => {
    expect((Progress as unknown as { $$typeof?: symbol }).$$typeof).toBe(Symbol.for('react.memo'));
  });
});
