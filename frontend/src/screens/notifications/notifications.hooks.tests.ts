import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../../shared/i18n/i18n.hooks', () => ({
  useStrings: () => require('../../shared/i18n/strings').getStrings('en'),
}));

const mockHistoryList = jest.fn();
const mockUnreadCount = jest.fn();
const mockMarkRead = jest.fn();
const mockMarkUnread = jest.fn();
const mockMarkAllRead = jest.fn();
const mockDelete = jest.fn();
const mockGetCollapse = jest.fn();
const mockGetCollapseWindowMs = jest.fn();
const mockSerialGet = jest.fn();

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
      markUnread: (...a: unknown[]) => mockMarkUnread(...a),
      markAllRead: (...a: unknown[]) => mockMarkAllRead(...a),
      delete: (...a: unknown[]) => mockDelete(...a),
    },
    collapseSerialChaptersNotification: {
      get: (...a: unknown[]) => mockGetCollapse(...a),
    },
    collapseWindowMs: {
      get: (...a: unknown[]) => mockGetCollapseWindowMs(...a),
    },
  },
}));

jest.mock('../../shared/services/serials', () => ({
  SerialService: {
    get: (...a: unknown[]) => mockSerialGet(...a),
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
  chapterId: undefined,
  chapterNumber: '1050',
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
  mockGetCollapse.mockResolvedValue(false);
  mockGetCollapseWindowMs.mockResolvedValue(900000);
  mockMarkRead.mockResolvedValue(undefined);
  mockMarkUnread.mockResolvedValue(undefined);
  mockDelete.mockResolvedValue(undefined);
  mockSerialGet.mockResolvedValue({ isSuccess: true, coverImage: { url: 'https://cover/s1' } });
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
        ids: ['h1'],
        seriesId: 's1',
        seriesName: 'One Piece',
        chapterId: undefined,
        chapterNumbers: ['1050'],
        bodyText: 'Chapter 1050 available',
        detectedAtMs: expect.any(Number),
        read: false,
      },
    ]);
    expect(result.current.unreadCount).toBe(1);
  });

  it('builds the unnumbered body text when no chapter number is known', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ chapterNumber: undefined, chapterId: undefined })]);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows[0].bodyText).toBe('New chapter available');
  });

  it('carries chapterId when the notification resolved to a known chapter', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ chapterId: 'c1' })]);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows[0].chapterId).toBe('c1');
  });

  it('leaves chapterId undefined when no chapter id is known at all', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ chapterId: undefined })]);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows[0].chapterId).toBeUndefined();
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

  it('markRead calls the service once per id and reloads', async () => {
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.markRead(['h1', 'h2']);
    });
    expect(mockMarkRead).toHaveBeenCalledWith({ id: 'h1' });
    expect(mockMarkRead).toHaveBeenCalledWith({ id: 'h2' });
  });

  it('markAllRead calls the service and reloads', async () => {
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.markAllRead();
    });
    expect(mockMarkAllRead).toHaveBeenCalledWith();
  });

  it('deleteItem calls the service once per id and reloads', async () => {
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.deleteItem(['h1']);
    });
    expect(mockDelete).toHaveBeenCalledWith({ id: 'h1' });
  });
  it('keeps rows separate when the collapse preference is off, even for close items of the same serial', async () => {
    const now = Date.now();
    mockHistoryList.mockResolvedValue([
      historyItem({ id: 'h2', detectedAtMs: now, chapterNumber: '1051' }),
      historyItem({ id: 'h1', detectedAtMs: now - 60_000, chapterNumber: '1050' }),
    ]);
    mockGetCollapse.mockResolvedValue(false);

    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toHaveLength(2);
    expect(result.current.rows.map(row => row.ids)).toEqual([['h2'], ['h1']]);
  });

  it('collapses rows for the same serial within the window when the preference is on', async () => {
    const now = Date.now();
    mockHistoryList.mockResolvedValue([
      historyItem({ id: 'h2', detectedAtMs: now, chapterNumber: '1051' }),
      historyItem({ id: 'h1', detectedAtMs: now - 60_000, chapterNumber: '1050' }),
    ]);
    mockGetCollapse.mockResolvedValue(true);
    mockGetCollapseWindowMs.mockResolvedValue(900_000);

    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0]).toEqual({
      id: 'h2',
      ids: ['h2', 'h1'],
      seriesId: 's1',
      seriesName: 'One Piece',
      chapterId: undefined,
      chapterNumbers: ['1050', '1051'],
      bodyText: '2 new chapters available',
      detectedAtMs: now,
      read: false,
    });
  });

  it('does not collapse rows outside the window even when the preference is on', async () => {
    const now = Date.now();
    mockHistoryList.mockResolvedValue([
      historyItem({ id: 'h2', detectedAtMs: now, chapterNumber: '1051' }),
      historyItem({ id: 'h1', detectedAtMs: now - 1_000_000, chapterNumber: '1050' }),
    ]);
    mockGetCollapse.mockResolvedValue(true);
    mockGetCollapseWindowMs.mockResolvedValue(900_000);

    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toHaveLength(2);
  });

  it('does not collapse rows from different serials even when close together', async () => {
    const now = Date.now();
    mockHistoryList.mockResolvedValue([
      historyItem({ id: 'h2', seriesId: 's2', detectedAtMs: now }),
      historyItem({ id: 'h1', seriesId: 's1', detectedAtMs: now - 60_000 }),
    ]);
    mockGetCollapse.mockResolvedValue(true);
    mockGetCollapseWindowMs.mockResolvedValue(900_000);

    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toHaveLength(2);
  });

  // ── selection mode ───────────────────────────────────────────────────────────
  it('onRowLongPress enters selection mode with just that row selected', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ id: 'h1' }), historyItem({ id: 'h2' })]);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.onRowLongPress('h1'));

    expect(result.current.selectionMode).toBe(true);
    expect(result.current.selectedIds).toEqual(new Set(['h1']));
  });

  it('onRowPress toggles selection while in selection mode, without affecting other rows', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ id: 'h1' }), historyItem({ id: 'h2' })]);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.onRowLongPress('h1'));
    act(() => result.current.onRowPress('h2'));
    expect(result.current.selectedIds).toEqual(new Set(['h1', 'h2']));

    act(() => result.current.onRowPress('h1'));
    expect(result.current.selectedIds).toEqual(new Set(['h2']));
  });

  it('onRowPress is a no-op outside selection mode', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ id: 'h1' })]);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.onRowPress('h1'));

    expect(result.current.selectionMode).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('deselecting the last row exits selection mode', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ id: 'h1' })]);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.onRowLongPress('h1'));
    act(() => result.current.onRowPress('h1'));

    expect(result.current.selectionMode).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('selectAll selects every row currently loaded', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ id: 'h1' }), historyItem({ id: 'h2' })]);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.selectAll());

    expect(result.current.selectedIds).toEqual(new Set(['h1', 'h2']));
  });

  it('exitSelectionMode clears selection and leaves selection mode', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ id: 'h1' })]);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.onRowLongPress('h1'));
    act(() => result.current.exitSelectionMode());

    expect(result.current.selectionMode).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });

  // ── batch actions over the current selection ────────────────────────────────
  it('markSelectedRead marks every item behind the selected rows (including a collapsed group) and exits selection mode', async () => {
    const now = Date.now();
    mockHistoryList.mockResolvedValue([
      historyItem({ id: 'h2', detectedAtMs: now, chapterNumber: '1051' }),
      historyItem({ id: 'h1', detectedAtMs: now - 60_000, chapterNumber: '1050' }),
      historyItem({ id: 'h3', seriesId: 's2', detectedAtMs: now - 500_000 }),
    ]);
    mockGetCollapse.mockResolvedValue(true);
    mockGetCollapseWindowMs.mockResolvedValue(900_000);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows).toHaveLength(2); // h1+h2 collapsed, h3 on its own

    act(() => result.current.onRowLongPress(result.current.rows[0].id));
    await act(() => result.current.markSelectedRead());

    expect(mockMarkRead).toHaveBeenCalledWith({ id: 'h2' });
    expect(mockMarkRead).toHaveBeenCalledWith({ id: 'h1' });
    expect(result.current.selectionMode).toBe(false);
  });

  it('markSelectedRead does nothing when nothing is selected', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ id: 'h1' })]);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.markSelectedRead());

    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it('markSelectedUnread marks every selected item unread and exits selection mode', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ id: 'h1' })]);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.onRowLongPress('h1'));
    await act(() => result.current.markSelectedUnread());

    expect(mockMarkUnread).toHaveBeenCalledWith({ id: 'h1' });
    expect(result.current.selectionMode).toBe(false);
  });

  it('deleteSelected deletes every selected item and exits selection mode', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ id: 'h1' })]);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.onRowLongPress('h1'));
    await act(() => result.current.deleteSelected());

    expect(mockDelete).toHaveBeenCalledWith({ id: 'h1' });
    expect(result.current.selectionMode).toBe(false);
  });

  // ── markUnread (single/plural) ───────────────────────────────────────────────
  it('markUnread calls the bridge for every id and reloads', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ id: 'h1' })]);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.markUnread(['h1', 'h2']));

    expect(mockMarkUnread).toHaveBeenCalledWith({ id: 'h1' });
    expect(mockMarkUnread).toHaveBeenCalledWith({ id: 'h2' });
  });

  // ── lazy per-viewport cover enrichment ───────────────────────────────────────
  it('onViewableIndices fetches the cover for a visible row missing one', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ id: 'h1', seriesId: 's1' })]);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.onViewableIndices(0, 0));
    await waitFor(() => expect(mockSerialGet).toHaveBeenCalledWith({ seriesId: 's1' }));
    await waitFor(() => expect(result.current.rows[0].coverUrl).toBe('https://cover/s1'));
  });

  it('onViewableIndices does not re-fetch a row already enriched', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ id: 'h1', seriesId: 's1' })]);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.onViewableIndices(0, 0));
    await waitFor(() => expect(result.current.rows[0].coverUrl).toBe('https://cover/s1'));
    mockSerialGet.mockClear();

    act(() => result.current.onViewableIndices(0, 0));
    expect(mockSerialGet).not.toHaveBeenCalled();
  });

  it('onViewableIndices does nothing when there are no rows', async () => {
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.onViewableIndices(0, 5));

    expect(mockSerialGet).not.toHaveBeenCalled();
  });

  it('onViewableIndices leaves coverUrl unset when SerialService.get fails', async () => {
    mockSerialGet.mockRejectedValue(new Error('network error'));
    mockHistoryList.mockResolvedValue([historyItem({ id: 'h1', seriesId: 's1' })]);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.onViewableIndices(0, 0);
      await Promise.resolve();
    });

    expect(result.current.rows[0].coverUrl).toBeUndefined();
  });

  // A reload triggered by marking/deleting a notification (or the unreadCountChanged listener)
  // must not throw away covers the viewport already fetched — otherwise every such action
  // re-fetches every visible cover from scratch (the "images reload every time the screen
  // refreshes" bug).
  it('a reload after markRead keeps the already-fetched cover without re-fetching it', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ id: 'h1', seriesId: 's1' })]);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.onViewableIndices(0, 0));
    await waitFor(() => expect(result.current.rows[0].coverUrl).toBe('https://cover/s1'));
    mockSerialGet.mockClear();

    await act(() => result.current.markRead(['h1']));

    expect(result.current.rows[0].coverUrl).toBe('https://cover/s1');
    expect(mockSerialGet).not.toHaveBeenCalled();
  });

  it('a reload triggered by unreadCountChanged keeps already-fetched covers too', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ id: 'h1', seriesId: 's1' })]);
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.onViewableIndices(0, 0));
    await waitFor(() => expect(result.current.rows[0].coverUrl).toBe('https://cover/s1'));
    mockSerialGet.mockClear();

    await act(async () => {
      eventListeners.forEach(cb => cb(0));
      await Promise.resolve();
    });

    expect(result.current.rows[0].coverUrl).toBe('https://cover/s1');
    expect(mockSerialGet).not.toHaveBeenCalled();
  });

  it('a reload still enriches a genuinely new row (different series) that has no known cover yet', async () => {
    mockHistoryList.mockResolvedValue([historyItem({ id: 'h1', seriesId: 's1' })]);
    const { result, rerender } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.onViewableIndices(0, 0));
    await waitFor(() => expect(result.current.rows[0].coverUrl).toBe('https://cover/s1'));

    mockHistoryList.mockResolvedValue([historyItem({ id: 'h1', seriesId: 's1' }), historyItem({ id: 'h2', seriesId: 's2' })]);
    mockSerialGet.mockImplementation(({ seriesId }: { seriesId: string }) =>
      Promise.resolve({ isSuccess: true, coverImage: { url: `https://cover/${seriesId}` } }),
    );
    await act(() => result.current.reload());
    rerender({});

    expect(result.current.rows.find(r => r.id === 'h1')?.coverUrl).toBe('https://cover/s1');
    expect(result.current.rows.find(r => r.id === 'h2')?.coverUrl).toBeUndefined();

    act(() => result.current.onViewableIndices(0, 1));
    await waitFor(() => expect(result.current.rows.find(r => r.id === 'h2')?.coverUrl).toBe('https://cover/s2'));
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
