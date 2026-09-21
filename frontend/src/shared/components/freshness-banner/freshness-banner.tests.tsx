import React from 'react';
import { render } from '@testing-library/react-native';
import { FreshnessBanner } from './freshness-banner.component';

describe('FreshnessBanner', () => {
  it('renders the text it is given', () => {
    const { getByText } = render(<FreshnessBanner variant="stale" text="Atualizado há 1 hora(s)" />);
    expect(getByText('Atualizado há 1 hora(s)')).toBeTruthy();
  });

  // Every variant must resolve to a real background — one that fell through to no style would
  // render an invisible strip instead of failing loudly. `offline` and `bad` deliberately share
  // banner.alert (both mean "needs attention"), so this asserts presence, not uniqueness.
  it('paints a background for every variant', () => {
    const backgrounds = (['stale', 'offline', 'confirmed', 'bad'] as const).map(variant => {
      const { toJSON } = render(<FreshnessBanner variant={variant} text="x" />);
      return JSON.stringify(toJSON()).match(/backgroundColor[^,}]*/)?.[0];
    });

    expect(backgrounds.every(Boolean)).toBe(true);
    // Three semantic levels, not four: `offline` and `bad` both mean "something is wrong" and
    // deliberately share banner.alert — their text is what tells them apart.
    expect(new Set(backgrounds).size).toBe(3);
  });

  it('is memoized (the screen re-renders it on every hook tick)', () => {
    expect((FreshnessBanner as unknown as { $$typeof?: symbol }).$$typeof).toBe(Symbol.for('react.memo'));
  });
});
