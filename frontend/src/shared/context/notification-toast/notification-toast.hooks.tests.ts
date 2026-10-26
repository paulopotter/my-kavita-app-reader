import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../../i18n/i18n.hooks', () => ({
  useStrings: () => require('../../i18n/strings').getStrings('pt-BR'),
}));

const mockAdult = jest.fn((items: unknown[]) => items);
jest.mock('../adult-filter', () => ({
  useAdultFiltered: ({ items, idOf }: { items: unknown[]; idOf: (item: unknown) => string }) => {
    items.forEach(item => idOf(item));
    return mockAdult(items);
  },
}));

const mockSerialGet = jest.fn();
jest.mock('../../services/serials', () => ({
  SerialService: { get: (...a: unknown[]) => mockSerialGet(...a) },
}));

const mockHistoryList = jest.fn();
jest.mock('../../services/notifications', () => ({
  NotificationsService: { history: { list: (...a: unknown[]) => mockHistoryList(...a) } },
}));

const listeners: Array<(event?: { historyIds: string[] }) => void> = [];
const mockRemove = jest.fn();
jest.mock('../../bridge', () => ({
  NotificationsEventEmitter: {
    addListener: (_event: string, cb: (event?: { historyIds: string[] }) => void) => {
      listeners.push(cb);
      return { remove: mockRemove };
    },
  },
}));

import { NOTIFICATION_TOAST_VISIBLE_MS, useNotificationToast } from './notification-toast.hooks';

const row = (over: Record<string, unknown> = {}) => ({
  id: 'h1',
  seriesId: 's1',
  seriesName: 'One Piece',
  chapterId: 'c1',
  chapterNumber: '1050',
  detectedAtMs: 1,
  read: false,
  createdAtLocalMs: 1,
  ...over,
});

async function arrive(historyIds: string[]) {
  await act(async () => {
    listeners.forEach(l => l({ historyIds }));
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  listeners.length = 0;
  mockAdult.mockImplementation((items: unknown[]) => items);
  mockHistoryList.mockResolvedValue([row()]);
  mockSerialGet.mockResolvedValue({ isSuccess: true, coverImage: { url: 'https://cover/s1' } });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useNotificationToast', () => {
  it('is hidden until something arrives', () => {
    const { result } = renderHook(() => useNotificationToast());
    expect(result.current.visible).toBe(false);
    expect(result.current.groups).toEqual([]);
  });

  it('shows the pill for what arrived — only the rows named by the event', async () => {
    mockHistoryList.mockResolvedValue([row(), row({ id: 'old', seriesId: 'other', seriesName: 'Outra' })]);
    const { result } = renderHook(() => useNotificationToast());

    await arrive(['h1']);

    expect(result.current.visible).toBe(true);
    expect(result.current.headline).toEqual({ title: 'One Piece', subtitle: 'Capítulo 1050 disponível', blurred: false });
    expect(result.current.groups).toHaveLength(1);
  });

  it('goes away by itself after the visible time', async () => {
    const { result } = renderHook(() => useNotificationToast());
    await arrive(['h1']);

    act(() => {
      jest.advanceTimersByTime(NOTIFICATION_TOAST_VISIBLE_MS);
    });

    expect(result.current.visible).toBe(false);
  });

  it('a second arrival keeps the same pill, counts both, and restarts the clock', async () => {
    const { result } = renderHook(() => useNotificationToast());
    await arrive(['h1']);
    act(() => {
      jest.advanceTimersByTime(NOTIFICATION_TOAST_VISIBLE_MS - 500);
    });

    mockHistoryList.mockResolvedValue([row(), row({ id: 'h2', seriesId: 's2', seriesName: 'Naruto' })]);
    await arrive(['h2']);
    act(() => {
      jest.advanceTimersByTime(NOTIFICATION_TOAST_VISIBLE_MS - 500);
    });

    expect(result.current.visible).toBe(true);
    expect(result.current.headline.title).toBe('2 novas notificações');
    expect(result.current.groups.map(g => g.seriesId)).toEqual(['s1', 's2']);
  });

  it('expanding stops the clock; dismissing closes everything and forgets the burst', async () => {
    const { result } = renderHook(() => useNotificationToast());
    await arrive(['h1']);

    act(() => result.current.expand());
    act(() => {
      jest.advanceTimersByTime(NOTIFICATION_TOAST_VISIBLE_MS * 5);
    });
    expect(result.current.visible).toBe(true);
    expect(result.current.expanded).toBe(true);

    act(() => result.current.dismiss());
    expect(result.current.visible).toBe(false);
    expect(result.current.expanded).toBe(false);

    // The next burst starts clean: only its own rows, not the dismissed one.
    mockHistoryList.mockResolvedValue([row(), row({ id: 'h3', seriesId: 's3', seriesName: 'Bleach' })]);
    await arrive(['h3']);
    await waitFor(() => expect(result.current.groups.map(g => g.seriesId)).toEqual(['s3']));
  });

  it('fills in each series’ cover once, and survives a series without one', async () => {
    mockHistoryList.mockResolvedValue([row(), row({ id: 'h2', seriesId: 's2', seriesName: 'Naruto' })]);
    mockSerialGet.mockImplementation(({ seriesId }: { seriesId: string }) =>
      seriesId === 's1' ? Promise.resolve({ isSuccess: true, coverImage: { url: 'https://cover/s1' } }) : Promise.reject(new Error('no')),
    );
    const { result } = renderHook(() => useNotificationToast());

    await arrive(['h1', 'h2']);
    await waitFor(() => expect(result.current.groups[0].coverUrl).toBe('https://cover/s1'));

    expect(result.current.groups[1].coverUrl).toBeUndefined();
    await arrive(['h1']);
    expect(mockSerialGet).toHaveBeenCalledTimes(2);
  });

  it('ignores a cover the provider could not read', async () => {
    mockSerialGet.mockResolvedValue({ isSuccess: false });
    const { result } = renderHook(() => useNotificationToast());

    await arrive(['h1']);

    expect(result.current.groups[0].coverUrl).toBeUndefined();
  });

  it('stays hidden when the content filter hides every row', async () => {
    mockAdult.mockReturnValue([]);
    const { result } = renderHook(() => useNotificationToast());

    await arrive(['h1']);

    expect(result.current.visible).toBe(false);
  });

  it('marks blurred rows through to the pill', async () => {
    mockAdult.mockImplementation((items: unknown[]) => items.map(i => ({ ...(i as object), blurred: true })));
    const { result } = renderHook(() => useNotificationToast());

    await arrive(['h1']);

    expect(result.current.headline.blurred).toBe(true);
  });

  it('ignores an event with no ids and survives a failing history read', async () => {
    const { result } = renderHook(() => useNotificationToast());
    await arrive([]);
    expect(result.current.visible).toBe(false);

    mockHistoryList.mockRejectedValue(new Error('boom'));
    await arrive(['h1']);
    expect(result.current.visible).toBe(false);
  });

  it('stops listening and clears the clock on unmount', async () => {
    const { unmount } = renderHook(() => useNotificationToast());
    await arrive(['h1']);

    unmount();

    expect(mockRemove).toHaveBeenCalled();
  });
});
