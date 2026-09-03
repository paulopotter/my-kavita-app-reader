import React from 'react';
import { render } from '@testing-library/react-native';

const mockReset = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ reset: mockReset }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../native/OtaModule', () => ({
  OtaModule: { applyOtaUpdate: jest.fn(), getVersions: jest.fn().mockResolvedValue(null) },
}));

jest.mock('./hooks', () => ({ useSplash: jest.fn() }));

import { useSplash } from './hooks';
import { SplashScreen } from './splash.screen';

const useSplashMock = useSplash as jest.Mock;

const base = {
  progress: 0,
  progressLabel: undefined as string | undefined,
  otaUpdateReady: false,
  otaAlert: null as null | { title: string; message: string; buttons: unknown[]; dismissible: boolean },
  navigate: null as null | { index: number; routes: Array<{ name: string }> },
};

beforeEach(() => {
  jest.clearAllMocks();
  useSplashMock.mockReturnValue(base);
});

describe('SplashScreen', () => {
  it('renders the logo and progress bar, no update button, no alert', () => {
    const { queryByText, UNSAFE_getAllByType } = render(<SplashScreen />);
    // update button label absent
    expect(queryByText('Aplicar atualização')).toBeNull();
    // at least an Image (logo) rendered
    const { Image } = require('react-native');
    expect(UNSAFE_getAllByType(Image).length).toBeGreaterThan(0);
  });

  it('shows the update button only when otaUpdateReady', () => {
    useSplashMock.mockReturnValue({ ...base, otaUpdateReady: true });
    const { getByText } = render(<SplashScreen />);
    expect(getByText('Aplicar atualização')).toBeTruthy();
  });

  it('renders the OTA alert when otaAlert is set', () => {
    useSplashMock.mockReturnValue({
      ...base,
      otaAlert: { title: 'T', message: 'M', buttons: [{ label: 'OK', onPress: () => {} }], dismissible: true },
    });
    const { getByText } = render(<SplashScreen />);
    expect(getByText('T')).toBeTruthy();
    expect(getByText('M')).toBeTruthy();
  });

  it('does not navigate while navigate is null', () => {
    render(<SplashScreen />);
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('calls navigation.reset with the hook\'s navigate object once it is set', () => {
    const action = { index: 0, routes: [{ name: 'hub' }] };
    useSplashMock.mockReturnValue({ ...base, navigate: action });
    render(<SplashScreen />);
    expect(mockReset).toHaveBeenCalledWith(action);
  });
});
