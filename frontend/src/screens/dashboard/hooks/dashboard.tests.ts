import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../../../shared/i18n', () => ({
  useStrings: () => require('../../../shared/i18n/strings').getStrings('en'),
}));

// Run the focus callback once on mount, like a screen gaining focus.
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return { useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]) };
});

const mockSerialsGet = jest.fn();
const mockSerialGet = jest.fn();
jest.mock('../../../shared/services/serials', () => ({
  SerialsService: { get: (...a: unknown[]) => mockSerialsGet(...a) },
  SerialService: { get: (...a: unknown[]) => mockSerialGet(...a) },
}));

const mockFollowedIds = jest.fn();
jest.mock('../../../shared/services/followed-series', () => ({
  FollowedSeriesService: { ids: { get: (...a: unknown[]) => mockFollowedIds(...a) } },
}));

import { useDashboard } from './dashboard.hooks';

const NOW = 1_800_000_000_000;

function digest(id: string, extra: Record<string, unknown> = {}) {
  return {
    isSuccess: true,
    id,
    name: `Serie ${id}`,
    coverImage: { url: `cover-${id}` },
    resolvedAtEpochMs: 0,
    server: {},
    cache: null,
    ...extra,
  };
}

function serialsDigest() {
  return {
    isSuccess: true,
    lastUpdatedEpochMs: NOW,
    serials: [
      digest('1', { pages: { read: 5, total: 10 }, lastUpdatesUTC: { readDate: NOW, chapterAdded: NOW - 1000 } }),
      digest('2', { pages: { read: 0, total: 10 }, lastUpdatesUTC: { chapterAdded: NOW } }),
    ],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSerialsGet.mockResolvedValue(serialsDigest());
  mockFollowedIds.mockResolvedValue(['2']);
  mockSerialGet.mockImplementation(({ seriesId }: { seriesId: string }) =>
    Promise.resolve(
      digest(seriesId, {
        chapters: {
          total: 1,
          list: [],
          resumePoint: { stoppedAtChapterId: 'c1', stoppedAtChapterIndex: 0, status: 'UNREAD' },
        },
      }),
    ),
  );
});

describe('useDashboard', () => {
  it('loads the rails cache-first on focus', async () => {
    const { result } = renderHook(() => useDashboard());
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mockSerialsGet).toHaveBeenCalledWith({ force: false });
    expect(mockSerialGet).toHaveBeenCalledWith({ seriesId: '1', force: false });
    const data = result.current.data!;
    expect(data.continueReading.map(i => i.chapterId)).toEqual(['c1']);
    expect(data.latestChapters.map(i => i.seriesId)).toEqual(['2']);
    expect(data.stats).toEqual({ series: 2, followed: 1, inProgress: 1 });
  });

  it('skips a candidate whose digest fails and still renders the rest', async () => {
    mockSerialGet.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.data!.continueReading).toEqual([]);
    expect(result.current.data!.recentlyUpdated).toHaveLength(2);
  });

  it('tolerates a followed-ids failure by treating nothing as followed', async () => {
    mockFollowedIds.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.data!.stats.followed).toBe(0);
  });

  it('reports an error when the series list fails, and retry reloads', async () => {
    mockSerialsGet.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.status).toBe('error'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('reports an error when the list digest is a failure', async () => {
    mockSerialsGet.mockResolvedValueOnce({ isSuccess: false, error: { code: 'x', message: 'nope' } });
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('pull-to-refresh is the only force, and a failed reload keeps what is on screen', async () => {
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      await result.current.refresh();
    });
    expect(mockSerialsGet).toHaveBeenLastCalledWith({ force: true });
    expect(mockSerialGet).toHaveBeenLastCalledWith({ seriesId: '1', force: true });
    expect(result.current.refreshing).toBe(false);

    mockSerialsGet.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.status).toBe('ready');
    expect(result.current.data).not.toBeNull();
  });
});

describe('useDashboard — series refreshed after reading', () => {
  it('re-reads the cache when a series was re-fetched', async () => {
    const { EventBus } = require('../../../shared/managers/events');
    const { SerieEvents } = require('../../../shared/tools/serials');
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    mockSerialsGet.mockClear();
    await act(async () => {
      EventBus.emit(SerieEvents.refreshed, { seriesId: '1' });
    });
    await waitFor(() => expect(mockSerialsGet).toHaveBeenCalledWith({ force: false }));
  });
});
