import React from 'react';
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { findPressableAncestor } from '../../../shared/test-utils/find-pressable-ancestor';

jest.mock('../../../shared/i18n/i18n.hooks', () => ({
  useStrings: () => require('../../../shared/i18n/strings').getStrings('en'),
}));

const mockGetKeepScreenOn = jest.fn();
const mockSetKeepScreenOn = jest.fn();
const mockGetImmersiveMode = jest.fn();
const mockSetImmersiveMode = jest.fn();
const mockGetProgressBarPosition = jest.fn();
const mockSetProgressBarPosition = jest.fn();
jest.mock('../../../shared/tools/reader', () => ({
  ReaderPrefs: {
    getKeepScreenOn: (...a: unknown[]) => mockGetKeepScreenOn(...a),
    setKeepScreenOn: (...a: unknown[]) => mockSetKeepScreenOn(...a),
    getImmersiveMode: (...a: unknown[]) => mockGetImmersiveMode(...a),
    setImmersiveMode: (...a: unknown[]) => mockSetImmersiveMode(...a),
    getProgressBarPosition: (...a: unknown[]) => mockGetProgressBarPosition(...a),
    setProgressBarPosition: (...a: unknown[]) => mockSetProgressBarPosition(...a),
  },
}));

import { getStrings } from '../../../shared/i18n/strings';
import { useReaderPrefs } from './reader.hooks';
import { ReaderPrefsScreen } from './reader.screen';

const t = getStrings('en');
// Stored state: keep-screen-on OFF, immersive ON, no progress-bar edge chosen.
beforeEach(() => {
  jest.clearAllMocks();
  mockGetKeepScreenOn.mockResolvedValue(false);
  mockGetImmersiveMode.mockResolvedValue(true);
  mockGetProgressBarPosition.mockResolvedValue(undefined);
  mockSetKeepScreenOn.mockResolvedValue(undefined);
  mockSetImmersiveMode.mockResolvedValue(undefined);
  mockSetProgressBarPosition.mockResolvedValue(undefined);
});

describe('useReaderPrefs', () => {
  it('loads both toggles from ReaderPrefs', async () => {
    const { result } = renderHook(() => useReaderPrefs());
    await waitFor(() =>
      expect(result.current.prefs).toEqual({
        keepScreenOnDuringReading: false,
        immersiveModeDuringReading: true,
        progressBarPosition: undefined,
      }),
    );
  });

  it('update() optimistically patches state and persists only the changed toggle', async () => {
    const { result } = renderHook(() => useReaderPrefs());
    await waitFor(() => expect(result.current.prefs).not.toBeNull());

    act(() => result.current.update({ keepScreenOnDuringReading: true }));

    expect(result.current.prefs).toEqual({
      keepScreenOnDuringReading: true,
      immersiveModeDuringReading: true,
      progressBarPosition: undefined,
    });
    expect(mockSetKeepScreenOn).toHaveBeenCalledWith(true);
    expect(mockSetImmersiveMode).not.toHaveBeenCalled();
    expect(mockSetProgressBarPosition).not.toHaveBeenCalled();
  });

  it('update() persists progressBarPosition, including clearing it to undefined', async () => {
    const { result } = renderHook(() => useReaderPrefs());
    await waitFor(() => expect(result.current.prefs).not.toBeNull());

    act(() => result.current.update({ progressBarPosition: 'top' }));
    expect(result.current.prefs?.progressBarPosition).toBe('top');
    expect(mockSetProgressBarPosition).toHaveBeenCalledWith('top');

    act(() => result.current.update({ progressBarPosition: undefined }));
    expect(result.current.prefs?.progressBarPosition).toBeUndefined();
    expect(mockSetProgressBarPosition).toHaveBeenCalledWith(undefined);
  });

  it('update() is a no-op on state before prefs have loaded, but still persists', () => {
    mockGetKeepScreenOn.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useReaderPrefs());
    act(() => result.current.update({ immersiveModeDuringReading: false }));
    expect(result.current.prefs).toBeNull();
    expect(mockSetImmersiveMode).toHaveBeenCalledWith(false);
  });
});

describe('ReaderPrefsScreen', () => {
  it('renders the two labelled toggles once prefs load', async () => {
    const { getByText } = render(<ReaderPrefsScreen onBack={jest.fn()} />);
    await waitFor(() => expect(getByText(t.configKeepScreenOn)).toBeTruthy());
    expect(getByText(t.configImmersiveMode)).toBeTruthy();
  });

  it('flipping the keep-screen-on Switch persists that toggle', async () => {
    const { getByText, UNSAFE_getAllByType } = render(<ReaderPrefsScreen onBack={jest.fn()} />);
    await waitFor(() => expect(getByText(t.configKeepScreenOn)).toBeTruthy());
    const { Switch } = require('react-native');
    const [keepSwitch] = UNSAFE_getAllByType(Switch);
    await act(async () => {
      fireEvent(keepSwitch, 'valueChange', true);
    });
    expect(mockSetKeepScreenOn).toHaveBeenCalledWith(true);
  });

  it('the back chevron calls onBack', async () => {
    const onBack = jest.fn();
    const { getByText, UNSAFE_getByType } = render(<ReaderPrefsScreen onBack={onBack} />);
    await waitFor(() => expect(getByText(t.configKeepScreenOn)).toBeTruthy());
    fireEvent.press(findPressableAncestor(UNSAFE_getByType(ChevronLeft), TouchableOpacity) as never);
    expect(onBack).toHaveBeenCalled();
  });
});
