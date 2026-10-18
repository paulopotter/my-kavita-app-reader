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

const mockBookAppearanceGet = jest.fn();
const mockBookAppearanceSet = jest.fn();
const mockBookModeGet = jest.fn();
const mockBookModeSet = jest.fn();
jest.mock('../../../shared/tools/books', () => {
  const actual = jest.requireActual('../../../shared/tools/books');
  return {
    ...actual,
    BookPrefs: {
      ...actual.BookPrefs,
      appearance: {
        get: (...a: unknown[]) => mockBookAppearanceGet(...a),
        set: (...a: unknown[]) => mockBookAppearanceSet(...a),
      },
      mode: { get: (...a: unknown[]) => mockBookModeGet(...a), set: (...a: unknown[]) => mockBookModeSet(...a) },
    },
  };
});

import { getStrings } from '../../../shared/i18n/strings';
import { DEFAULT_BOOK_APPEARANCE } from '../../../shared/tools/books/book-prefs.tool';
import { useBookReadingPrefs, useReaderPrefs } from './reader.hooks';
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
  mockBookAppearanceGet.mockResolvedValue({ ...DEFAULT_BOOK_APPEARANCE });
  mockBookAppearanceSet.mockResolvedValue(undefined);
  mockBookModeGet.mockResolvedValue('infinite');
  mockBookModeSet.mockResolvedValue(undefined);
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

describe('useBookReadingPrefs', () => {
  it('loads the saved look and mode', async () => {
    mockBookAppearanceGet.mockResolvedValue({ ...DEFAULT_BOOK_APPEARANCE, theme: 'night' });
    mockBookModeGet.mockResolvedValue('paged');
    const { result } = renderHook(() => useBookReadingPrefs());
    expect(result.current.ready).toBe(false);

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.appearance.theme).toBe('night');
    expect(result.current.mode).toBe('paged');
  });

  it('keeps the defaults, and is ready, when the saved values cannot be read', async () => {
    mockBookAppearanceGet.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useBookReadingPrefs());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.appearance).toEqual(DEFAULT_BOOK_APPEARANCE);
    expect(result.current.mode).toBe('infinite');
  });

  it('changes one preference and saves it', async () => {
    const { result } = renderHook(() => useBookReadingPrefs());
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => result.current.changeAppearance('margin', 'wide'));

    expect(result.current.appearance.margin).toBe('wide');
    expect(mockBookAppearanceSet).toHaveBeenCalledWith({ key: 'margin', value: 'wide' });
  });

  it('changes the mode and saves it', async () => {
    const { result } = renderHook(() => useBookReadingPrefs());
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => result.current.changeMode('paged'));

    expect(result.current.mode).toBe('paged');
    expect(mockBookModeSet).toHaveBeenCalledWith('paged');
  });
});

describe('ReaderPrefsScreen — novel block', () => {
  it('shows the novel reading block under the reader toggles', async () => {
    const { getByText, getByTestId } = render(<ReaderPrefsScreen onBack={jest.fn()} />);
    await waitFor(() => expect(getByTestId('config-book-reading')).toBeTruthy());
    expect(getByText(t.configBookReadingTitle)).toBeTruthy();
    expect(getByText(t.bookReaderThemeLabel)).toBeTruthy();
    expect(getByText(t.bookReaderModeLabel)).toBeTruthy();
  });

  it('saves a choice made in the block', async () => {
    const { getByLabelText, getByTestId } = render(<ReaderPrefsScreen onBack={jest.fn()} />);
    await waitFor(() => expect(getByTestId('config-book-reading')).toBeTruthy());

    fireEvent.press(getByLabelText(t.bookReaderThemeSepia));

    expect(mockBookAppearanceSet).toHaveBeenCalledWith({ key: 'theme', value: 'sepia' });
  });
});
