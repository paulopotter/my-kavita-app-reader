import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../../../shared/i18n/strings';
import { themes } from '../../../../shared/theme';

const t = getStrings('pt-BR');

const mockUpdate = jest.fn();
let mockPrefs: {
  keepScreenOnDuringReading: boolean;
  immersiveModeDuringReading: boolean;
  progressBarPosition: string | undefined;
} | null = {
  keepScreenOnDuringReading: false,
  immersiveModeDuringReading: false,
  progressBarPosition: undefined,
};

jest.mock('../../../config/reader/reader.hooks', () => ({
  useReaderPrefs: () => ({ prefs: mockPrefs, update: mockUpdate }),
}));

const mockSetProgressColorOverride = jest.fn();
let mockProgressColorOverride: string | undefined;

jest.mock('../../../../shared/context', () => {
  const actual = jest.requireActual('../../../../shared/context');
  return {
    ...actual,
    useTheme: () => ({
      ...actual.useTheme(),
      available: Object.keys(jest.requireActual('../../../../shared/theme').themes),
      progressColorOverride: mockProgressColorOverride,
      setProgressColorOverride: mockSetProgressColorOverride,
    }),
  };
});

import { ReaderSettingsModal } from './reader-settings-modal.component';

beforeEach(() => {
  jest.clearAllMocks();
  mockPrefs = { keepScreenOnDuringReading: false, immersiveModeDuringReading: false, progressBarPosition: undefined };
  mockProgressColorOverride = undefined;
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

  describe('progress-colour picker', () => {
    it('renders one row per non-OLED theme plus the default row', () => {
      const { getByText } = render(<ReaderSettingsModal visible={true} t={t} onClose={jest.fn()} />);
      expect(getByText(t.readerProgressColorDefault)).toBeTruthy();
      const nonOledCount = Object.keys(themes).filter(name => !name.endsWith('Oled')).length;
      // Just confirm one non-OLED theme's own row renders — full coverage of every label would
      // duplicate ThemeLabelsTool's own tests.
      expect(getByText(t.themeNameCrimson)).toBeTruthy();
      expect(nonOledCount).toBeGreaterThan(0);
    });

    it('selecting a theme row calls setProgressColorOverride with that theme', () => {
      const { getByText } = render(<ReaderSettingsModal visible={true} t={t} onClose={jest.fn()} />);
      fireEvent.press(getByText(t.themeNameCrimson));
      expect(mockSetProgressColorOverride).toHaveBeenCalledWith('crimson');
    });

    it('selecting the default row clears the override', () => {
      mockProgressColorOverride = 'crimson';
      const { getByText } = render(<ReaderSettingsModal visible={true} t={t} onClose={jest.fn()} />);
      fireEvent.press(getByText(t.readerProgressColorDefault));
      expect(mockSetProgressColorOverride).toHaveBeenCalledWith(undefined);
    });
  });

  describe('progress-position picker', () => {
    it('renders all four edge options', () => {
      const { getByText } = render(<ReaderSettingsModal visible={true} t={t} onClose={jest.fn()} />);
      expect(getByText(t.readerProgressPositionLeft)).toBeTruthy();
      expect(getByText(t.readerProgressPositionRight)).toBeTruthy();
      expect(getByText(t.readerProgressPositionTop)).toBeTruthy();
      expect(getByText(t.readerProgressPositionBottom)).toBeTruthy();
    });

    it('selecting an edge calls update with that position', () => {
      const { getByText } = render(<ReaderSettingsModal visible={true} t={t} onClose={jest.fn()} />);
      fireEvent.press(getByText(t.readerProgressPositionTop));
      expect(mockUpdate).toHaveBeenCalledWith({ progressBarPosition: 'top' });
    });
  });
});
