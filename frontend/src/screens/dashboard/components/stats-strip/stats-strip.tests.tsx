import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('../../../../shared/i18n', () => ({
  useStrings: () => require('../../../../shared/i18n/strings').getStrings('en'),
}));

import { StatsStrip } from './stats-strip.component';

describe('StatsStrip', () => {
  it('shows the three counters with their labels', () => {
    const { getByText } = render(<StatsStrip stats={{ series: 120, followed: 7, inProgress: 3 }} />);
    expect(getByText('120')).toBeTruthy();
    expect(getByText('Series')).toBeTruthy();
    expect(getByText('7')).toBeTruthy();
    expect(getByText('Following')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(getByText('In progress')).toBeTruthy();
  });
});
