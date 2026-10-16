import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

const mockHasServerConfigured = jest.fn();
const mockHasFollowedSeries = jest.fn();
jest.mock('../../bridge/startup', () => ({
  StartupBridge: {
    hasServerConfigured: (...a: unknown[]) => mockHasServerConfigured(...a),
    hasFollowedSeries: (...a: unknown[]) => mockHasFollowedSeries(...a),
  },
}));

const mockStartScreenGet = jest.fn();
const mockIsUnlocked = jest.fn();
const mockUnlock = jest.fn();
jest.mock('../../tools/startup', () => ({
  ...jest.requireActual('../../tools/startup'),
  StartScreenPrefs: {
    ...jest.requireActual('../../tools/startup').StartScreenPrefs,
    get: (...a: unknown[]) => mockStartScreenGet(...a),
    isDashboardUnlocked: (...a: unknown[]) => mockIsUnlocked(...a),
    unlockDashboard: (...a: unknown[]) => mockUnlock(...a),
  },
}));

import { StartupProvider, useStartup } from './startup.context';

function Probe() {
  const s = useStartup();
  return (
    <Text>
      {`${s.hasServerConfigured}|${s.hasFollowedSeries}|${s.unreadNotificationCount}|${s.startTab}|${s.dashboardUnlocked}`}
    </Text>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHasServerConfigured.mockResolvedValue(false);
  mockHasFollowedSeries.mockResolvedValue(false);
  mockStartScreenGet.mockResolvedValue('dashboard');
  mockIsUnlocked.mockResolvedValue(false);
  mockUnlock.mockResolvedValue(undefined);
});

describe('StartupProvider / useStartup', () => {
  it('exposes the bridge results after load()', async () => {
    mockHasServerConfigured.mockResolvedValue(true);
    mockHasFollowedSeries.mockResolvedValue(true);
    const { getByText } = render(
      <StartupProvider>
        <Probe />
      </StartupProvider>,
    );
    await waitFor(() => expect(getByText('true|true|0|dashboard|true')).toBeTruthy());
  });

  it('falls back to all-false when a bridge call rejects', async () => {
    mockHasServerConfigured.mockRejectedValue(new Error('bridge down'));
    const { getByText } = render(
      <StartupProvider>
        <Probe />
      </StartupProvider>,
    );
    await waitFor(() => expect(mockHasServerConfigured).toHaveBeenCalled());
    expect(getByText('false|false|0|library|false')).toBeTruthy();
  });

  it('re-reads the bridge when refresh() is called', async () => {
    let refresh: () => void = () => {};
    function Grab() {
      refresh = useStartup().refresh;
      return null;
    }
    render(
      <StartupProvider>
        <Grab />
      </StartupProvider>,
    );
    await waitFor(() => expect(mockHasServerConfigured).toHaveBeenCalledTimes(1));

    mockHasServerConfigured.mockResolvedValue(true);
    refresh();
    await waitFor(() => expect(mockHasServerConfigured).toHaveBeenCalledTimes(2));
  });

  it('a consumer outside the provider gets the default (all false)', () => {
    const { getByText } = render(<Probe />);
    expect(getByText('false|false|0|library|false')).toBeTruthy();
  });

  it('opens on the dashboard once unlocked and unlocks for good when a series is followed', async () => {
    mockHasFollowedSeries.mockResolvedValue(true);
    mockStartScreenGet.mockResolvedValue('dashboard');
    const { getByText } = render(
      <StartupProvider>
        <Probe />
      </StartupProvider>,
    );
    await waitFor(() => expect(getByText('false|true|0|dashboard|true')).toBeTruthy());
    expect(mockUnlock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the library on a fresh install even when the dashboard is the choice', async () => {
    const { getByText } = render(
      <StartupProvider>
        <Probe />
      </StartupProvider>,
    );
    await waitFor(() => expect(mockStartScreenGet).toHaveBeenCalled());
    await waitFor(() => expect(getByText('false|false|0|library|false')).toBeTruthy());
    expect(mockUnlock).not.toHaveBeenCalled();
  });
});
