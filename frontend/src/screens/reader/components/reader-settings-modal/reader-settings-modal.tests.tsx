import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../../../shared/i18n/strings';

const t = getStrings('pt-BR');

const mockUpdate = jest.fn();
let mockPrefs: { keepScreenOnDuringReading: boolean; immersiveModeDuringReading: boolean } | null = {
  keepScreenOnDuringReading: false,
  immersiveModeDuringReading: false,
};

jest.mock('../../../config/reader/reader.hooks', () => ({
  useReaderPrefs: () => ({ prefs: mockPrefs, update: mockUpdate }),
}));

import { ReaderSettingsModal } from './reader-settings-modal.component';

beforeEach(() => {
  jest.clearAllMocks();
  mockPrefs = { keepScreenOnDuringReading: false, immersiveModeDuringReading: false };
});

describe('ReaderSettingsModal', () => {
  it('shows both reading-preference toggles, reusing Ajustes > Reading\'s own hook', () => {
    const { getByText } = render(<ReaderSettingsModal visible={true} t={t} onClose={jest.fn()} />);
    expect(getByText(t.configKeepScreenOn)).toBeTruthy();
    expect(getByText(t.configImmersiveMode)).toBeTruthy();
  });

  it('toggling a row calls update with the flipped value', () => {
    const { getByText } = render(<ReaderSettingsModal visible={true} t={t} onClose={jest.fn()} />);
    fireEvent.press(getByText(t.configKeepScreenOn));
    expect(mockUpdate).toHaveBeenCalledWith({ keepScreenOnDuringReading: true });
  });

  it('renders no toggles while prefs have not loaded yet', () => {
    mockPrefs = null;
    const { queryByText } = render(<ReaderSettingsModal visible={true} t={t} onClose={jest.fn()} />);
    expect(queryByText(t.configKeepScreenOn)).toBeNull();
  });

  it('closes via the close button and the backdrop', () => {
    const onClose = jest.fn();
    const { getByText, UNSAFE_getAllByType } = render(<ReaderSettingsModal visible={true} t={t} onClose={onClose} />);
    fireEvent.press(getByText(t.readerSettingsCloseButtonLabel));
    expect(onClose).toHaveBeenCalledTimes(1);

    const Pressable = require('react-native').Pressable;
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]); // backdrop
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
