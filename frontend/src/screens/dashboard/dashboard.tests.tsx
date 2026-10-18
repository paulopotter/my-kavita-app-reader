import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('../../shared/i18n', () => ({
  useStrings: () => require('../../shared/i18n/strings').getStrings('en'),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));

let mockState: Record<string, unknown>;
jest.mock('./hooks', () => ({ useDashboard: () => mockState }));

import { Routes } from '../../navigation/routes';
import { DashboardScreen } from './dashboard.screen';
import { ThemeProvider } from '../../shared/context';

jest.mock('../../shared/managers/preferences', () => ({
  PreferencesManager: { get: jest.fn().mockResolvedValue(null), put: jest.fn().mockResolvedValue({}) },
}));

const data = {
  continueReading: [{ seriesId: 's1', chapterId: 'c1', name: 'Reading', coverUrl: 'c', caption: 'Ch. 1' }],
  followedUpdated: [],
  recentlyUpdated: [{ seriesId: 's2', name: 'Fresh', coverUrl: 'c' }],
  unreadFollowed: [],
  recentlyAdded: [],
  stats: { series: 9, followed: 2, inProgress: 1 },
};

function renderScreen() {
  return render(
    <ThemeProvider>
      <DashboardScreen />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState = { status: 'ready', data, refreshing: false, refresh: jest.fn(), retry: jest.fn() };
});

describe('DashboardScreen', () => {
  it('opens the reader on the chapter of a continue-reading tile', async () => {
    const { findByText } = renderScreen();
    fireEvent.press(await findByText('Reading'));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.READER, { seriesId: 's1', chapterId: 'c1', origin: 'DASHBOARD' });
  });

  it('opens the series from any other tile', async () => {
    const { findByText } = renderScreen();
    fireEvent.press(await findByText('Fresh'));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SERIES_DETAIL, { seriesId: 's2', origin: 'DASHBOARD' });
  });

  it('shows the rail titles and the empty message of a rail with nothing', async () => {
    const { findByText, getAllByText } = renderScreen();
    expect(await findByText('Continue reading')).toBeTruthy();
    expect(getAllByText('Nothing here yet').length).toBe(3);
  });

  it('shows a spinner while loading', async () => {
    mockState = { ...mockState, status: 'loading', data: null };
    const { queryByText } = renderScreen();
    expect(queryByText('Continue reading')).toBeNull();
  });

  it('shows the error with a retry', async () => {
    mockState = { ...mockState, status: 'error', data: null };
    const { findByText } = renderScreen();
    fireEvent.press(await findByText('Try again'));
    expect(mockState.retry).toHaveBeenCalled();
  });
});
