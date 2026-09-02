import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../../native/OtaModule', () => ({
  OtaModule: { getVersions: jest.fn() },
}));

import { OtaModule } from '../../../native/OtaModule';
import { AppVersions } from './app-versions.component';
import type { Strings } from '../../i18n/strings';

const getVersions = OtaModule.getVersions as jest.Mock;

const t = {
  versionBackend: 'backend',
  versionApp: 'app',
  versionFrontend: 'frontend',
} as unknown as Strings;

beforeEach(() => {
  jest.clearAllMocks();
  getVersions.mockResolvedValue({ backend: 'K1', app: 'A1', frontend: 'F1' });
});

describe('AppVersions', () => {
  it('renders nothing until the native versions resolve', () => {
    getVersions.mockReturnValue(new Promise(() => {}));
    const { toJSON } = render(<AppVersions t={t} />);
    expect(toJSON()).toBeNull();
  });

  it('renders the three version strings once loaded', async () => {
    const { getByText } = render(<AppVersions t={t} />);
    await waitFor(() => expect(getByText('K1')).toBeTruthy());
    expect(getByText('A1')).toBeTruthy();
    expect(getByText('F1')).toBeTruthy();
  });

  it('fires onDebugUnlocked after 5 taps on the app column', async () => {
    const onDebugUnlocked = jest.fn();
    const { getByText } = render(<AppVersions t={t} onDebugUnlocked={onDebugUnlocked} />);
    await waitFor(() => expect(getByText('A1')).toBeTruthy());
    for (let i = 0; i < 5; i++) { fireEvent.press(getByText('A1')); }
    expect(onDebugUnlocked).toHaveBeenCalledTimes(1);
  });

  it('does not fire onDebugUnlocked before the 5th tap', async () => {
    const onDebugUnlocked = jest.fn();
    const { getByText } = render(<AppVersions t={t} onDebugUnlocked={onDebugUnlocked} />);
    await waitFor(() => expect(getByText('A1')).toBeTruthy());
    for (let i = 0; i < 4; i++) { fireEvent.press(getByText('A1')); }
    expect(onDebugUnlocked).not.toHaveBeenCalled();
  });
});
