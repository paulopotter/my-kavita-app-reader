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

import { StartupProvider, useStartup } from './startup.context';

function Probe() {
  const s = useStartup();
  return (
    <Text>
      {`${s.hasServerConfigured}|${s.hasFollowedSeries}|${s.unreadNotificationCount}`}
    </Text>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHasServerConfigured.mockResolvedValue(false);
  mockHasFollowedSeries.mockResolvedValue(false);
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
    await waitFor(() => expect(getByText('true|true|0')).toBeTruthy());
  });

  it('falls back to all-false when a bridge call rejects', async () => {
    mockHasServerConfigured.mockRejectedValue(new Error('bridge down'));
    const { getByText } = render(
      <StartupProvider>
        <Probe />
      </StartupProvider>,
    );
    await waitFor(() => expect(mockHasServerConfigured).toHaveBeenCalled());
    expect(getByText('false|false|0')).toBeTruthy();
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
    expect(getByText('false|false|0')).toBeTruthy();
  });
});
