import React from 'react';
import { render } from '@testing-library/react-native';
import { FreshnessBanner } from './freshness-banner.component';

describe('FreshnessBanner', () => {
  it('renders the text it is given', () => {
    const { getByText } = render(<FreshnessBanner variant="stale" text="Atualizado há 1 hora(s)" />);
    expect(getByText('Atualizado há 1 hora(s)')).toBeTruthy();
  });

  it('is memoized (the screen re-renders it on every hook tick)', () => {
    expect((FreshnessBanner as unknown as { $$typeof?: symbol }).$$typeof).toBe(Symbol.for('react.memo'));
  });
});
