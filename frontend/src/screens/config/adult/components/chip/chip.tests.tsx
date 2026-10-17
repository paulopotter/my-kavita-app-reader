import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '../../../../../shared/context';

jest.mock('../../../../../shared/managers/preferences', () => ({
  PreferencesManager: { get: jest.fn().mockResolvedValue(null), put: jest.fn().mockResolvedValue({}) },
}));

import { Chip } from './chip.component';

const renderChip = (props: Partial<React.ComponentProps<typeof Chip>> = {}) =>
  render(
    <ThemeProvider>
      <Chip label="Gore" onPress={jest.fn()} {...props} />
    </ThemeProvider>,
  );

describe('Chip', () => {
  it('shows its label and reports the press', async () => {
    const onPress = jest.fn();
    const { findByText } = renderChip({ onPress });
    fireEvent.press(await findByText('Gore'));
    expect(onPress).toHaveBeenCalled();
  });

  it('a selected chip is announced by its remove label, a plain one by its own', async () => {
    const plain = renderChip();
    expect(await plain.findByLabelText('Gore')).toBeTruthy();
    plain.unmount();
    const selected = renderChip({ selected: true, removeLabel: 'Remove Gore' });
    expect(await selected.findByLabelText('Remove Gore')).toBeTruthy();
  });
});
