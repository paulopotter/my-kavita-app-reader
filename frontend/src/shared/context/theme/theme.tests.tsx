import React from 'react';
import { Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from './theme.context';
import { themes, defaultThemeName } from '../../theme/themes';
import { PreferencesManager } from '../../managers/preferences';

jest.mock('../../managers/preferences', () => ({
  PreferencesManager: { get: jest.fn(), put: jest.fn() },
}));

const mockGet = PreferencesManager.get as jest.Mock;
const mockPut = PreferencesManager.put as jest.Mock;

function Probe() {
  const { themeName, colors, available, ready, setTheme } = useTheme();
  return (
    <>
      <Text testID="name">{themeName}</Text>
      <Text testID="surface">{colors.surface.primary}</Text>
      <Text testID="available">{available.join(',')}</Text>
      <Text testID="ready">{String(ready)}</Text>
      <Text testID="switch" onPress={() => setTheme(defaultThemeName)}>
        switch
      </Text>
    </>
  );
}

const setup = () =>
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue(null);
    mockPut.mockResolvedValue({});
  });

  it('starts on the default theme when nothing is stored', async () => {
    const { getByTestId } = setup();
    await waitFor(() => expect(getByTestId('ready').props.children).toBe('true'));
    expect(getByTestId('name').props.children).toBe(defaultThemeName);
    expect(getByTestId('surface').props.children).toBe(themes[defaultThemeName].surface.primary);
  });

  it('restores the stored theme at boot', async () => {
    mockGet.mockResolvedValue({ value: defaultThemeName, updatedAtEpochMs: 1 });
    const { getByTestId } = setup();
    await waitFor(() => expect(getByTestId('ready').props.children).toBe('true'));
    expect(getByTestId('name').props.children).toBe(defaultThemeName);
    expect(mockGet).toHaveBeenCalledWith({ key: 'theme' });
  });

  // A theme removed between releases must not leave the app unpainted.
  it('falls back to the default when the stored theme no longer exists', async () => {
    mockGet.mockResolvedValue({ value: 'a-theme-that-was-deleted', updatedAtEpochMs: 1 });
    const { getByTestId } = setup();
    await waitFor(() => expect(getByTestId('ready').props.children).toBe('true'));
    expect(getByTestId('name').props.children).toBe(defaultThemeName);
  });

  it('exposes every registered theme for a picker to list', async () => {
    const { getByTestId } = setup();
    await waitFor(() => expect(getByTestId('ready').props.children).toBe('true'));
    expect(getByTestId('available').props.children).toBe(Object.keys(themes).join(','));
  });

  it('persists the choice when the theme changes', async () => {
    const { getByTestId } = setup();
    await waitFor(() => expect(getByTestId('ready').props.children).toBe('true'));
    await act(async () => {
      getByTestId('switch').props.onPress();
    });
    expect(mockPut).toHaveBeenCalledWith({
      key: 'theme',
      value: defaultThemeName,
      domain: 'ui',
    });
  });

  // The switch should feel instant, so a failed write costs the choice being forgotten on the next
  // boot — never the app refusing to repaint.
  it('still switches when persisting fails', async () => {
    mockPut.mockRejectedValue(new Error('room is unhappy'));
    const { getByTestId } = setup();
    await waitFor(() => expect(getByTestId('ready').props.children).toBe('true'));
    await act(async () => {
      getByTestId('switch').props.onPress();
    });
    expect(getByTestId('name').props.children).toBe(defaultThemeName);
  });

  it('becomes ready even when the stored value cannot be read', async () => {
    mockGet.mockRejectedValue(new Error('no room'));
    const { getByTestId } = setup();
    await waitFor(() => expect(getByTestId('ready').props.children).toBe('true'));
    expect(getByTestId('name').props.children).toBe(defaultThemeName);
  });
});
