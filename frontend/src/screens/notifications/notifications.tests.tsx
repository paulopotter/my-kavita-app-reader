import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('../../shared/i18n/i18n.hooks', () => ({
  useStrings: () => require('../../shared/i18n/strings').getStrings('en'),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockUseNotificationHistory = jest.fn();
jest.mock('./notifications.hooks', () => ({
  useNotificationHistory: (...a: unknown[]) => mockUseNotificationHistory(...a),
}));

import { getStrings } from '../../shared/i18n/strings';
import { NotificationsScreen } from './notifications.screen';

const t = getStrings('en');

function historyHook(over: Partial<Record<string, unknown>> = {}) {
  return {
    loading: false,
    rows: [],
    unreadCount: 0,
    markRead: jest.fn().mockResolvedValue(undefined),
    markAllRead: jest.fn().mockResolvedValue(undefined),
    deleteItem: jest.fn().mockResolvedValue(undefined),
    reload: jest.fn(),
    ...over,
  };
}

const row = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'h1',
  ids: ['h1'],
  seriesId: 's1',
  seriesName: 'One Piece',
  bodyText: 'Chapter 1050 available',
  detectedAtMs: Date.now(),
  read: false,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseNotificationHistory.mockReturnValue(historyHook());
});

describe('NotificationsScreen', () => {
  it('shows the empty message when there are no rows', () => {
    const { getByText } = render(<NotificationsScreen />);
    expect(getByText(t.notificationsHistoryEmpty)).toBeTruthy();
  });

  it('hides the mark-all-read button when there are no rows', () => {
    const { queryByText } = render(<NotificationsScreen />);
    expect(queryByText(t.notificationsHistoryMarkAllRead)).toBeNull();
  });

  it('renders a row per history item and shows mark-all-read', () => {
    mockUseNotificationHistory.mockReturnValue(historyHook({ rows: [row()] }));
    const { getByText, queryByText } = render(<NotificationsScreen />);
    expect(getByText('One Piece')).toBeTruthy();
    expect(getByText('Chapter 1050 available')).toBeTruthy();
    expect(queryByText(t.notificationsHistoryMarkAllRead)).toBeTruthy();
  });

  it('markAllRead is called when the button is pressed', () => {
    const markAllRead = jest.fn().mockResolvedValue(undefined);
    mockUseNotificationHistory.mockReturnValue(historyHook({ rows: [row()], markAllRead }));
    const { getByText } = render(<NotificationsScreen />);
    fireEvent.press(getByText(t.notificationsHistoryMarkAllRead));
    expect(markAllRead).toHaveBeenCalledTimes(1);
  });

  it('tapping an unread row marks it read and navigates to the series detail', async () => {
    const markRead = jest.fn().mockResolvedValue(undefined);
    mockUseNotificationHistory.mockReturnValue(historyHook({ rows: [row({ read: false })], markRead }));
    const { getByText } = render(<NotificationsScreen />);
    fireEvent.press(getByText('One Piece'));
    await Promise.resolve();
    expect(markRead).toHaveBeenCalledWith(['h1']);
    expect(mockNavigate).toHaveBeenCalledWith('series/:seriesId', { seriesId: 's1', origin: 'LIBRARY' });
  });

  it('tapping an already-read row navigates without calling markRead again', async () => {
    const markRead = jest.fn().mockResolvedValue(undefined);
    mockUseNotificationHistory.mockReturnValue(historyHook({ rows: [row({ read: true })], markRead }));
    const { getByText } = render(<NotificationsScreen />);
    fireEvent.press(getByText('One Piece'));
    await Promise.resolve();
    expect(markRead).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('series/:seriesId', { seriesId: 's1', origin: 'LIBRARY' });
  });

  it('tapping a row with a single known chapter navigates straight into the reader, not the series', async () => {
    mockUseNotificationHistory.mockReturnValue(historyHook({ rows: [row({ chapterId: 'c1' })] }));
    const { getByText } = render(<NotificationsScreen />);
    fireEvent.press(getByText('One Piece'));
    await Promise.resolve();
    expect(mockNavigate).toHaveBeenCalledWith('reader/:seriesId/:chapterId', {
      seriesId: 's1', chapterId: 'c1', origin: 'LIBRARY', seriesName: 'One Piece',
    });
  });

  it('deleteItem is called when a row delete button is pressed', () => {
    const deleteItem = jest.fn().mockResolvedValue(undefined);
    mockUseNotificationHistory.mockReturnValue(historyHook({ rows: [row()], deleteItem }));
    const { getByText } = render(<NotificationsScreen />);
    fireEvent.press(getByText('✕'));
    expect(deleteItem).toHaveBeenCalledWith(['h1']);
  });
});
