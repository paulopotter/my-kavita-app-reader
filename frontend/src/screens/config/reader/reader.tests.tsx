import React from 'react';
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../../../shared/i18n/useStrings', () => ({
  useStrings: () => require('../../../shared/i18n/strings').getStrings('en'),
}));

const mockGetUiPreferences = jest.fn();
const mockUpsertUiPreferences = jest.fn();
jest.mock('../../../shared/bridge/config', () => ({
  ConfigRepository: {
    getUiPreferences: (...a: unknown[]) => mockGetUiPreferences(...a),
    upsertUiPreferences: (...a: unknown[]) => mockUpsertUiPreferences(...a),
  },
}));

import { getStrings } from '../../../shared/i18n/strings';
import { useReaderPrefs } from './reader.hooks';
import { ReaderPrefsScreen } from './reader.screen';

const t = getStrings('en');
const PREFS = { keepScreenOnDuringReading: false, immersiveModeDuringReading: true };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUiPreferences.mockResolvedValue(PREFS);
  mockUpsertUiPreferences.mockResolvedValue(undefined);
});

describe('useReaderPrefs', () => {
  it('loads the current UiPreferences', async () => {
    const { result } = renderHook(() => useReaderPrefs());
    await waitFor(() => expect(result.current.prefs).toEqual(PREFS));
  });

  it('update() optimistically patches state and persists the patch', async () => {
    const { result } = renderHook(() => useReaderPrefs());
    await waitFor(() => expect(result.current.prefs).toEqual(PREFS));

    act(() => result.current.update({ keepScreenOnDuringReading: true }));

    expect(result.current.prefs).toEqual({ ...PREFS, keepScreenOnDuringReading: true });
    expect(mockUpsertUiPreferences).toHaveBeenCalledWith({ keepScreenOnDuringReading: true });
  });

  it('update() is a no-op on state before prefs have loaded', () => {
    mockGetUiPreferences.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useReaderPrefs());
    act(() => result.current.update({ keepScreenOnDuringReading: true }));
    expect(result.current.prefs).toBeNull();
    expect(mockUpsertUiPreferences).toHaveBeenCalledWith({ keepScreenOnDuringReading: true });
  });
});

describe('ReaderPrefsScreen', () => {
  it('renders the two labelled toggles once prefs load', async () => {
    const { getByText } = render(<ReaderPrefsScreen onBack={jest.fn()} />);
    await waitFor(() => expect(getByText(t.configKeepScreenOn)).toBeTruthy());
    expect(getByText(t.configImmersiveMode)).toBeTruthy();
  });

  it('flipping a Switch calls upsertUiPreferences with that field', async () => {
    const { getByText, UNSAFE_getAllByType } = render(<ReaderPrefsScreen onBack={jest.fn()} />);
    await waitFor(() => expect(getByText(t.configKeepScreenOn)).toBeTruthy());
    const { Switch } = require('react-native');
    const [keepSwitch] = UNSAFE_getAllByType(Switch);
    await act(async () => {
      fireEvent(keepSwitch, 'valueChange', true);
    });
    expect(mockUpsertUiPreferences).toHaveBeenCalledWith({ keepScreenOnDuringReading: true });
  });

  it('the back chevron calls onBack', async () => {
    const onBack = jest.fn();
    const { getByText } = render(<ReaderPrefsScreen onBack={onBack} />);
    await waitFor(() => expect(getByText(t.configKeepScreenOn)).toBeTruthy());
    fireEvent.press(getByText('‹'));
    expect(onBack).toHaveBeenCalled();
  });
});
