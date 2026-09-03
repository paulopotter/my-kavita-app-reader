import React from 'react';
import { BackHandler } from 'react-native';
import { act, fireEvent, render, renderHook } from '@testing-library/react-native';

const mockSetLanguage = jest.fn();
let mockLanguage = 'en';
jest.mock('../../shared/i18n/useStrings', () => ({
  useStrings: () => require('../../shared/i18n/strings').getStrings('en'),
  useLanguage: () => ({ language: mockLanguage, setLanguage: mockSetLanguage }),
}));

// Each sub-screen is tested in its own folder — stub them here so this file only asserts the
// router + menu wiring.
const stub = (label: string) => (props: { onBack?: () => void }) => {
  const { Text } = require('react-native');
  return (
    <Text testID={`stub-${label}`} onPress={props.onBack}>
      {label}
    </Text>
  );
};
jest.mock('./server', () => ({ ServerScreen: (p: { onBack?: () => void }) => stub('server')(p) }));
jest.mock('./reader', () => ({ ReaderPrefsScreen: (p: { onBack?: () => void }) => stub('reader')(p) }));
jest.mock('./serie', () => ({ SerieSortScreen: (p: { onBack?: () => void }) => stub('serie')(p) }));
jest.mock('./debug', () => ({ DebugScreen: (p: { onBack?: () => void }) => stub('debug')(p) }));

// AppVersions owns the debug-unlock tap gesture; stub it with a button that fires onDebugUnlocked.
jest.mock('../../shared/components/app-versions', () => ({
  AppVersions: (p: { onDebugUnlocked?: () => void }) => {
    const { Text } = require('react-native');
    return <Text testID="unlock-debug" onPress={p.onDebugUnlocked}>versions</Text>;
  },
}));

import { getStrings } from '../../shared/i18n/strings';
import { useConfigLanguage, useConfigMenu } from './config.hooks';
import { ConfigScreen } from './config.screen';

const t = getStrings('en');

beforeEach(() => {
  jest.clearAllMocks();
  mockLanguage = 'en';
});

describe('useConfigLanguage', () => {
  it('exposes the shared language + a changeLanguage that delegates to setLanguage', () => {
    const { result } = renderHook(() => useConfigLanguage());
    expect(result.current.language).toBe('en');
    result.current.changeLanguage('pt-BR');
    expect(mockSetLanguage).toHaveBeenCalledWith('pt-BR');
  });
});

describe('useConfigMenu', () => {
  it('starts locked and unlockDebug flips it', () => {
    const { result } = renderHook(() => useConfigMenu());
    expect(result.current.debugUnlocked).toBe(false);
    act(() => result.current.unlockDebug());
    expect(result.current.debugUnlocked).toBe(true);
  });
});

describe('ConfigScreen router', () => {
  it('shows the menu with the three always-on rows', () => {
    const { getByText, queryByText } = render(<ConfigScreen />);
    expect(getByText(t.configTitle)).toBeTruthy();
    expect(getByText(t.configMenuServer)).toBeTruthy();
    expect(getByText(t.configMenuReading)).toBeTruthy();
    expect(getByText(t.configMenuChapter)).toBeTruthy();
    expect(queryByText('Debug')).toBeNull(); // locked by default
  });

  it('navigates into a sub-screen and the back handler returns to the menu', () => {
    const onRegisterBackHandler = jest.fn();
    const { getByText, getByTestId, queryByText } = render(
      <ConfigScreen onRegisterBackHandler={onRegisterBackHandler} />,
    );
    fireEvent.press(getByText(t.configMenuServer));
    expect(getByTestId('stub-server')).toBeTruthy();
    // entering a sub-screen registers a back handler
    expect(onRegisterBackHandler).toHaveBeenLastCalledWith(expect.any(Function));

    fireEvent.press(getByTestId('stub-server')); // stub calls onBack on press
    expect(queryByText(t.configTitle)).toBeTruthy(); // back on the menu
  });

  it('reveals the Debug row only after the version footer unlocks it', () => {
    const { getByTestId, getByText, queryByText } = render(<ConfigScreen />);
    expect(queryByText('Debug')).toBeNull();
    fireEvent.press(getByTestId('unlock-debug'));
    expect(getByText('Debug')).toBeTruthy();
  });

  it('the hardware back press pops a sub-screen back to the menu', () => {
    let hwHandler: (() => boolean) | undefined;
    const spy = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((_evt, handler) => {
        hwHandler = handler as () => boolean;
        return { remove: jest.fn() };
      });

    const { getByText, queryByText } = render(<ConfigScreen />);
    fireEvent.press(getByText(t.configMenuReading));
    expect(queryByText(t.configTitle)).toBeNull();

    act(() => {
      hwHandler?.();
    });
    expect(queryByText(t.configTitle)).toBeTruthy();
    spy.mockRestore();
  });
});
