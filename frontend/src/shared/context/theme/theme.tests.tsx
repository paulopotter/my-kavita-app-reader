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

// Both the theme choice (key 'theme') and the progress-colour override (ReaderPrefs, key
// 'reader'/variant 'progressColorOverride') go through this same mocked PreferencesManager.get —
// tests that only care about one pin the other to null explicitly, so a coincidental match
// between the two doesn't silently pass a test that isn't actually exercising it.
function mockPreferences({ theme, progressOverride }: { theme?: string; progressOverride?: string } = {}) {
  mockGet.mockImplementation(({ key, variant }: { key: string; variant?: string }) => {
    if (key === 'theme') {return Promise.resolve(theme ? { value: theme, updatedAtEpochMs: 1 } : null);}
    if (key === 'reader' && variant === 'progressColorOverride') {
      return Promise.resolve(progressOverride ? { value: progressOverride, updatedAtEpochMs: 1 } : null);
    }
    return Promise.resolve(null);
  });
}

function Probe() {
  const { themeName, colors, available, ready, setTheme, progressColorOverride, setProgressColorOverride } =
    useTheme();
  return (
    <>
      <Text testID="name">{themeName}</Text>
      <Text testID="surface">{colors.surface.primary}</Text>
      <Text testID="progressReadingPrimary">{colors.progress.reading.primary}</Text>
      <Text testID="progressOverride">{progressColorOverride ?? ''}</Text>
      <Text testID="available">{available.join(',')}</Text>
      <Text testID="ready">{String(ready)}</Text>
      <Text testID="switch" onPress={() => setTheme(defaultThemeName)}>
        switch
      </Text>
      <Text testID="setOverrideCrimson" onPress={() => setProgressColorOverride('crimson')}>
        set override
      </Text>
      <Text testID="clearOverride" onPress={() => setProgressColorOverride(undefined)}>
        clear override
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
    mockPreferences();
    mockPut.mockResolvedValue({});
  });

  it('starts on the default theme when nothing is stored', async () => {
    const { getByTestId } = setup();
    await waitFor(() => expect(getByTestId('ready').props.children).toBe('true'));
    expect(getByTestId('name').props.children).toBe(defaultThemeName);
    expect(getByTestId('surface').props.children).toBe(themes[defaultThemeName].surface.primary);
  });

  it('restores the stored theme at boot', async () => {
    mockPreferences({ theme: 'crimson' });
    const { getByTestId } = setup();
    await waitFor(() => expect(getByTestId('ready').props.children).toBe('true'));
    expect(getByTestId('name').props.children).toBe('crimson');
    expect(mockGet).toHaveBeenCalledWith({ key: 'theme' });
  });

  // A theme removed between releases must not leave the app unpainted.
  it('falls back to the default when the stored theme no longer exists', async () => {
    mockPreferences({ theme: 'a-theme-that-was-deleted' });
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

describe('ThemeProvider — progress-colour override', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPreferences();
    mockPut.mockResolvedValue({});
  });

  it('uses the active theme\'s own progress colour when nothing is overridden', async () => {
    const { getByTestId } = setup();
    await waitFor(() => expect(getByTestId('ready').props.children).toBe('true'));
    expect(getByTestId('progressOverride').props.children).toBe('');
    expect(getByTestId('progressReadingPrimary').props.children).toBe(
      themes[defaultThemeName].progress.reading.primary,
    );
  });

  it('restores a stored override and applies its colour', async () => {
    mockPreferences({ progressOverride: 'crimson' });
    const { getByTestId } = setup();
    await waitFor(() => expect(getByTestId('ready').props.children).toBe('true'));
    expect(getByTestId('progressOverride').props.children).toBe('crimson');
    expect(getByTestId('progressReadingPrimary').props.children).toBe(themes.crimson.progress.reading.primary);
  });

  it('setting an override repaints immediately and persists it under ReaderPrefs', async () => {
    const { getByTestId } = setup();
    await waitFor(() => expect(getByTestId('ready').props.children).toBe('true'));
    await act(async () => {
      getByTestId('setOverrideCrimson').props.onPress();
    });
    expect(getByTestId('progressReadingPrimary').props.children).toBe(themes.crimson.progress.reading.primary);
    expect(mockPut).toHaveBeenCalledWith({
      key: 'reader',
      value: 'crimson',
      domain: 'readerPrefs',
      variant: 'progressColorOverride',
    });
  });

  it('clearing the override falls back to the active theme\'s own colour', async () => {
    mockPreferences({ progressOverride: 'crimson' });
    const { getByTestId } = setup();
    await waitFor(() => expect(getByTestId('progressOverride').props.children).toBe('crimson'));
    await act(async () => {
      getByTestId('clearOverride').props.onPress();
    });
    expect(getByTestId('progressOverride').props.children).toBe('');
    expect(getByTestId('progressReadingPrimary').props.children).toBe(
      themes[defaultThemeName].progress.reading.primary,
    );
  });

  it('an override does not touch any other token (e.g. surface stays the active theme\'s own)', async () => {
    mockPreferences({ progressOverride: 'crimson' });
    const { getByTestId } = setup();
    await waitFor(() => expect(getByTestId('ready').props.children).toBe('true'));
    expect(getByTestId('surface').props.children).toBe(themes[defaultThemeName].surface.primary);
  });

  it('an unrecognized stored override does not crash and leaves the active theme\'s colour in place', async () => {
    mockPreferences({ progressOverride: 'a-theme-that-was-deleted' });
    const { getByTestId } = setup();
    await waitFor(() => expect(getByTestId('ready').props.children).toBe('true'));
    expect(getByTestId('progressOverride').props.children).toBe('');
    expect(getByTestId('progressReadingPrimary').props.children).toBe(
      themes[defaultThemeName].progress.reading.primary,
    );
  });
});
