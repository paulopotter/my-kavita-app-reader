import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../../shared/i18n/i18n.hooks', () => ({
  useStrings: () => require('../../shared/i18n/strings').getStrings('en'),
}));

const mockHistoryList = jest.fn();
const mockUnreadCount = jest.fn();
const mockMarkRead = jest.fn();
const mockMarkAllRead = jest.fn();
const mockDelete = jest.fn();

const eventListeners: Array<(count: number) => void> = [];
const mockAddListener = jest.fn((_event: string, cb: (count: number) => void) => {
  eventListeners.push(cb);
  return { remove: jest.fn() };
});

jest.mock('../../shared/services/notifications', () => ({
  NotificationsService: {
    history: {
      list: (...a: unknown[]) => mockHistoryList(...a),
      unreadCount: (...a: unknown[]) => mockUnreadCount(...a),
      markRead: (...a: unknown[]) => mockMarkRead(...a),
      markAllRead: (...a: unknown[]) => mockMarkAllRead(...a),
      delete: (...a: unknown[]) => mockDelete(...a),
    },
  },
}));

jest.mock('../../shared/bridge', () => ({
  NotificationsEventEmitter: { addListener: (event: string, cb: (count: number) => void) => mockAddListener(event, cb) },
}));

import { useNotificationHistory, useUnreadNotificationsCount } from './notifications.hooks';

const historyItem = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'h1',
  seriesId: 's1',
  seriesName: 'One Piece',
  chapterIds: undefined,
  chapterNumbers: ['1050'],
  detectedAtMs: Date.now(),
  read: false,
  createdAtLocalMs: Date.now(),
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  eventListeners.length = 0;
  mockHistoryList.mockResolvedValue([]);
  mockUnreadCount.mockResolvedValue(0);
});

describe('useNotificationHistory', () => {
  it('loads rows and unread count, building a body text per item', async () => {
    mockHistoryList.mockResolvedValue([historyItem()]);
    mockUnreadCount.mockResolvedValue(1);

    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toEqual([
      {
        id: 'h1',
        seriesId: 's1',
        seriesName: 'One Piece',
        bodyText: 'Chapter 1050 available',
        detectedAtMs: expect.any(Number),
        read: false,
      },
    ]);
    expect(result.current.unreadCount).toBe(1);
  });

  it('builds the batch body text for more than one chapter', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ chapterNumbers: ['1', '2', '3'] })]);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows[0].bodyText).toBe('3 new chapters available');
  });

  it('builds the unnumbered body text when no chapter number is known', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ chapterNumbers: undefined, chapterIds: undefined })]);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows[0].bodyText).toBe('New chapter available');
  });

  it('reloads when unreadCountChanged fires', async () => {
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockHistoryList).toHaveBeenCalledTimes(1);

    mockHistoryList.mockResolvedValue([historyItem()]);
    act(() => {
      eventListeners.forEach(cb => cb(1));
    });
    await waitFor(() => expect(result.current.rows.length).toBe(1));
  });

  it('markRead calls the service and reloads', async () => {
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.markRead('h1');
    });
    expect(mockMarkRead).toHaveBeenCalledWith({ id: 'h1' });
  });

  it('markAllRead calls the service and reloads', async () => {
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.markAllRead();
    });
    expect(mockMarkAllRead).toHaveBeenCalledWith();
  });

  it('deleteItem calls the service and reloads', async () => {
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.deleteItem('h1');
    });
    expect(mockDelete).toHaveBeenCalledWith({ id: 'h1' });
  });
});

describe('useUnreadNotificationsCount', () => {
  it('reads the initial unread count', async () => {
    mockUnreadCount.mockResolvedValue(3);
    const { result } = renderHook(() => useUnreadNotificationsCount());
    await waitFor(() => expect(result.current).toBe(3));
  });

  it('updates when unreadCountChanged fires', async () => {
    mockUnreadCount.mockResolvedValue(0);
    const { result } = renderHook(() => useUnreadNotificationsCount());
    await waitFor(() => expect(result.current).toBe(0));

    act(() => {
      eventListeners.forEach(cb => cb(5));
    });
    await waitFor(() => expect(result.current).toBe(5));
  });
});
