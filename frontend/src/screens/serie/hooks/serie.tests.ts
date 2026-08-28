import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: () => {},
}));

jest.mock('../../../shared', () => ({
  SerialService: { get: jest.fn() },
  SerieTool: {
    normalize: jest.fn(),
    isFollowed: jest.fn(),
    toggleFollow: jest.fn(),
  },
  ChapterTool: {
    mark: {
      read: jest.fn(),
      unread: jest.fn(),
      toggle: jest.fn(),
    },
  },
  useAction: () => ({ realize: jest.fn() }),
}));

jest.mock('../../../shared/managers/preferences', () => ({
  PreferencesManager: {
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

import { useSerie } from './serie.hooks';
import { ChapterTool, SerialService, SerieTool } from '../../../shared';
import { PreferencesManager } from '../../../shared/managers/preferences';

const mockGet = SerialService.get as jest.Mock;
const mockNormalize = SerieTool.normalize as jest.Mock;
const mockIsFollowed = SerieTool.isFollowed as jest.Mock;
const mockToggleFollow = SerieTool.toggleFollow as jest.Mock;
const mockMarkRead = ChapterTool.mark.read as jest.Mock;
const mockMarkUnread = ChapterTool.mark.unread as jest.Mock;
const mockMarkToggle = ChapterTool.mark.toggle as jest.Mock;
const mockPrefsGet = PreferencesManager.get as jest.Mock;
const mockPrefsPut = PreferencesManager.put as jest.Mock;
const mockPrefsDelete = PreferencesManager.delete as jest.Mock;

const digestSuccess = { isSuccess: true, id: 's1', name: 'Series One' };
const serie = {
  id: 's1',
  name: 'Series One',
  chapters: [
    { id: 'c1', number: 1, title: 'Chapter 1', readStatus: 'UNREAD' },
    { id: 'c2', number: 2, title: 'Chapter 2', readStatus: 'UNREAD' },
  ],
};

describe('useSerie', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue(digestSuccess);
    mockNormalize.mockReturnValue(serie);
    mockIsFollowed.mockResolvedValue(false);
    mockPrefsGet.mockResolvedValue(null);
    mockPrefsPut.mockResolvedValue(undefined);
    mockPrefsDelete.mockResolvedValue(undefined);
  });

  it('starts in loading state', async () => {
    mockGet.mockReturnValue(new Promise(() => {})); // never settles — keeps this render in "loading"
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    expect(result.current.loading).toBe(true);
    expect(result.current.serie).toBeNull();
    expect(result.current.continueChapter).toBeNull();
  });

  it('loads the series on mount, ending with loading false and the normalized serie', async () => {
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith({ seriesId: 's1', force: false });
    expect(mockNormalize).toHaveBeenCalledWith({ digest: digestSuccess });
    expect(result.current.serie).toBe(serie);
    expect(result.current.error).toBeNull();
  });

  it('reads isFollowed after loading the series', async () => {
    mockIsFollowed.mockResolvedValue(true);
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockIsFollowed).toHaveBeenCalledWith('s1');
    expect(result.current.isFollowed).toBe(true);
  });

  it('sets error and stops loading when the digest fails', async () => {
    mockGet.mockResolvedValue({ isSuccess: false, error: { message: 'not found' } });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('not found');
  });

  it('falls back to a default message when the digest failure has none', async () => {
    mockGet.mockResolvedValue({ isSuccess: false, error: {} });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('unknown error');
  });

  it('surfaces a thrown error message as-is', async () => {
    mockGet.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('boom');
    expect(result.current.serie).toBeNull();
  });

  it('falls back to a default message when the rejection has no message at all', async () => {
    mockGet.mockRejectedValue({} as Error);
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('unknown error');
  });

  it('refresh re-triggers the same load sequence, forcing past the cache', async () => {
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    mockGet.mockClear();
    await act(async () => {
      await result.current.refresh();
    });
    expect(mockGet).toHaveBeenCalledWith({ seriesId: 's1', force: true });
  });

  it('markRead delegates to ChapterTool.mark.read with an onUpdate that applies to local state', async () => {
    mockMarkRead.mockImplementation(({ onUpdate }) => {
      onUpdate({ seriesId: 's1', chapterId: 'c1', readStatus: 'READ' });
      return Promise.resolve({ seriesId: 's1', chapterId: 'c1', readStatus: 'READ' });
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.markRead({ chapterId: 'c1' });
    });
    expect(mockMarkRead).toHaveBeenCalledWith(expect.objectContaining({ seriesId: 's1', chapterId: 'c1' }));
    expect(result.current.chapters[0].readStatus).toBe('READ');
    expect(result.current.chapters[1].readStatus).toBe('UNREAD'); // untouched
  });

  it('markUnread delegates to ChapterTool.mark.unread with an onUpdate that applies to local state', async () => {
    mockMarkUnread.mockImplementation(({ onUpdate }) => {
      onUpdate({ seriesId: 's1', chapterId: 'c1', readStatus: 'UNREAD' });
      return Promise.resolve({ seriesId: 's1', chapterId: 'c1', readStatus: 'UNREAD' });
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.markUnread({ chapterId: 'c1' });
    });
    expect(mockMarkUnread).toHaveBeenCalledWith(expect.objectContaining({ seriesId: 's1', chapterId: 'c1' }));
  });

  it('toggleRead delegates to ChapterTool.mark.toggle', async () => {
    mockMarkToggle.mockImplementation(({ onUpdate }) => {
      onUpdate({ seriesId: 's1', chapterId: 'c1', readStatus: 'READ' });
      return Promise.resolve({ seriesId: 's1', chapterId: 'c1', readStatus: 'READ' });
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.toggleRead({ chapterId: 'c1' });
    });
    expect(mockMarkToggle).toHaveBeenCalledWith(expect.objectContaining({ seriesId: 's1', chapterId: 'c1' }));
    expect(result.current.chapters[0].readStatus).toBe('READ');
  });

  it('toggleFollow delegates to SerieTool.toggleFollow with the current isFollowed as prevValue', async () => {
    mockToggleFollow.mockImplementation(({ onUpdate }) => {
      onUpdate(true);
      return Promise.resolve(true);
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.toggleFollow();
    });
    expect(mockToggleFollow).toHaveBeenCalledWith(expect.objectContaining({ seriesId: 's1', prevValue: false }));
    expect(result.current.isFollowed).toBe(true);
  });

  it('exposes realize from useAction', async () => {
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.realize).toBe('function');
  });
});

describe('useSerie — continueChapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue(digestSuccess);
    mockIsFollowed.mockResolvedValue(false);
  });

  it('is null when the digest has no resumePoint', async () => {
    mockNormalize.mockReturnValue(serie);
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.continueChapter).toBeNull();
  });

  it('looks up the chapter named by resumePoint.stoppedAtChapterId', async () => {
    mockNormalize.mockReturnValue({
      ...serie,
      resumePoint: { stoppedAtChapterId: 'c2', stoppedAtChapterIndex: 1, status: 'IN_PROGRESS' },
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.continueChapter?.id).toBe('c2');
  });

  it('is null when resumePoint names a chapter no longer present', async () => {
    mockNormalize.mockReturnValue({
      ...serie,
      resumePoint: { stoppedAtChapterId: 'missing', stoppedAtChapterIndex: 0, status: 'UNREAD' },
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.continueChapter).toBeNull();
  });
});

describe('useSerie — sort', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue(digestSuccess);
    mockIsFollowed.mockResolvedValue(false);
  });

  it('starts in ASCENDING order', async () => {
    mockNormalize.mockReturnValue({
      ...serie,
      chapters: [
        { id: 'c2', number: 2, title: 'Chapter 2', readStatus: 'UNREAD' },
        { id: 'c1', number: 1, title: 'Chapter 1', readStatus: 'UNREAD' },
      ],
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sortMode).toBe('ASCENDING');
    expect(result.current.chapters.map(c => c.id)).toEqual(['c1', 'c2']);
  });

  it('toggleSortOrder cycles ASCENDING → DESCENDING → AUTO_FIXED → AUTO_PROGRESS → ASCENDING', async () => {
    mockNormalize.mockReturnValue(serie);
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.toggleSortOrder());
    expect(result.current.sortMode).toBe('DESCENDING');
    expect(result.current.chapters.map(c => c.id)).toEqual(['c2', 'c1']);

    act(() => result.current.toggleSortOrder());
    expect(result.current.sortMode).toBe('AUTO_FIXED');

    act(() => result.current.toggleSortOrder());
    expect(result.current.sortMode).toBe('AUTO_PROGRESS');

    act(() => result.current.toggleSortOrder());
    expect(result.current.sortMode).toBe('ASCENDING');
  });

  it('AUTO_FIXED falls back to ascending when no threshold is set', async () => {
    mockNormalize.mockReturnValue(serie);
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.toggleSortOrder()); // DESCENDING
    act(() => result.current.toggleSortOrder()); // AUTO_FIXED
    expect(result.current.chapters.map(c => c.id)).toEqual(['c1', 'c2']);
  });

  it('updateSortPrefs sets mode/fixedThreshold/progressPercent in one call', async () => {
    mockNormalize.mockReturnValue({
      ...serie,
      chapters: [
        { id: 'c1', number: 1, title: 'Chapter 1', readStatus: 'READ' },
        { id: 'c2', number: 2, title: 'Chapter 2', readStatus: 'UNREAD' },
      ],
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.updateSortPrefs({ mode: 'AUTO_FIXED', fixedThreshold: 0, progressPercent: 75 }));
    expect(result.current.sortMode).toBe('AUTO_FIXED');
    expect(result.current.sortFixedThreshold).toBe(0);
    expect(result.current.sortProgressPercent).toBe(75);
    // last read number (1) > fixedThreshold (0) → reversed
    expect(result.current.chapters.map(c => c.id)).toEqual(['c2', 'c1']);
  });

  it('updateSortPrefs keeps the current progressPercent when none is given', async () => {
    mockNormalize.mockReturnValue(serie);
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.updateSortPrefs({ mode: 'DESCENDING' }));
    expect(result.current.sortProgressPercent).toBe(50);
  });

  it('loads default sort prefs when neither a series override nor a global default was ever saved', async () => {
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(mockPrefsGet).toHaveBeenCalledWith({ key: 's1' }));
    await waitFor(() => expect(mockPrefsGet).toHaveBeenCalledWith({ key: 'global' }));
    expect(result.current.sortMode).toBe('ASCENDING');
    expect(result.current.hasSeriesSortOverride).toBe(false);
  });

  it('falls back to the global default when no series override was saved', async () => {
    mockPrefsGet.mockImplementation(({ key }: { key: string }) =>
      Promise.resolve(key === 'global' ? { value: JSON.stringify({ mode: 'DESCENDING', progressPercent: 50 }) } : null),
    );
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.sortMode).toBe('DESCENDING'));
    expect(result.current.hasSeriesSortOverride).toBe(false);
  });

  it('prefers a series override over the global default when both exist', async () => {
    mockPrefsGet.mockImplementation(({ key }: { key: string }) =>
      Promise.resolve(
        key === 's1'
          ? { value: JSON.stringify({ mode: 'AUTO_FIXED', fixedThreshold: 3, progressPercent: 50 }) }
          : { value: JSON.stringify({ mode: 'DESCENDING', progressPercent: 50 }) },
      ),
    );
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.sortMode).toBe('AUTO_FIXED'));
    expect(result.current.sortFixedThreshold).toBe(3);
    expect(result.current.hasSeriesSortOverride).toBe(true);
  });

  it('falls back to defaults when reading persisted sort prefs rejects', async () => {
    mockPrefsGet.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.sortMode).toBe('ASCENDING'));
    expect(result.current.hasSeriesSortOverride).toBe(false);
  });

  it('updateSortPrefs always writes a per-series override, marking hasSeriesSortOverride true', async () => {
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.updateSortPrefs({ mode: 'DESCENDING', progressPercent: 75 }));
    expect(mockPrefsPut).toHaveBeenCalledWith({
      key: 's1',
      value: JSON.stringify({ mode: 'DESCENDING', fixedThreshold: undefined, progressPercent: 75 }),
      domain: 'chapterSortPrefs',
    });
    expect(result.current.hasSeriesSortOverride).toBe(true);
  });

  it('resetSortPrefs deletes the series override and reapplies the global default', async () => {
    mockPrefsGet.mockImplementation(({ key }: { key: string }) =>
      Promise.resolve(
        key === 's1'
          ? { value: JSON.stringify({ mode: 'AUTO_FIXED', fixedThreshold: 3, progressPercent: 50 }) }
          : { value: JSON.stringify({ mode: 'DESCENDING', progressPercent: 50 }) },
      ),
    );
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.hasSeriesSortOverride).toBe(true));

    mockPrefsDelete.mockResolvedValue(undefined);
    await act(async () => {
      await result.current.resetSortPrefs();
    });

    expect(mockPrefsDelete).toHaveBeenCalledWith({ key: 's1' });
    expect(result.current.sortMode).toBe('DESCENDING');
    expect(result.current.hasSeriesSortOverride).toBe(false);
  });

  it('resetSortPrefs falls back to the hardcoded default when no global was ever saved either', async () => {
    mockPrefsGet.mockResolvedValueOnce({ value: JSON.stringify({ mode: 'AUTO_FIXED', fixedThreshold: 3, progressPercent: 50 }) });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.hasSeriesSortOverride).toBe(true));

    mockPrefsGet.mockResolvedValue(null);
    await act(async () => {
      await result.current.resetSortPrefs();
    });

    expect(result.current.sortMode).toBe('ASCENDING');
    expect(result.current.hasSeriesSortOverride).toBe(false);
  });

  it('falls back to title when neither chapter has a comparable number', async () => {
    mockNormalize.mockReturnValue({
      ...serie,
      chapters: [
        { id: 'c1', title: 'Bravo', readStatus: 'UNREAD' },
        { id: 'c2', title: 'Alpha', readStatus: 'UNREAD' },
      ],
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.chapters.map(c => c.id)).toEqual(['c2', 'c1']);
  });

  it('prefers decimalNumber over number when both are present', async () => {
    mockNormalize.mockReturnValue({
      ...serie,
      chapters: [
        { id: 'c1', number: 1, decimalNumber: 2.5, title: 'Chapter 1', readStatus: 'UNREAD' },
        { id: 'c2', number: 2, decimalNumber: 1.5, title: 'Chapter 2', readStatus: 'UNREAD' },
      ],
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.chapters.map(c => c.id)).toEqual(['c2', 'c1']);
  });

  it('sorts a chapter with no comparable number after one that has it', async () => {
    mockNormalize.mockReturnValue({
      ...serie,
      chapters: [
        { id: 'c1', title: 'Chapter 1', readStatus: 'UNREAD' }, // no number at all
        { id: 'c2', number: 1, title: 'Chapter 2', readStatus: 'UNREAD' },
      ],
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.chapters.map(c => c.id)).toEqual(['c2', 'c1']);
  });

  it('sorts a chapter with a comparable number before one that has none', async () => {
    mockNormalize.mockReturnValue({
      ...serie,
      chapters: [
        { id: 'c1', number: 1, title: 'Chapter 1', readStatus: 'UNREAD' },
        { id: 'c2', title: 'Chapter 2', readStatus: 'UNREAD' }, // no number at all
      ],
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.chapters.map(c => c.id)).toEqual(['c1', 'c2']);
  });

  it('AUTO_FIXED stays ascending when the last read number is at or below the threshold', async () => {
    mockNormalize.mockReturnValue({
      ...serie,
      chapters: [
        { id: 'c1', number: 1, title: 'Chapter 1', readStatus: 'READ' },
        { id: 'c2', number: 2, title: 'Chapter 2', readStatus: 'UNREAD' },
      ],
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.updateSortPrefs({ mode: 'AUTO_FIXED', fixedThreshold: 5 }));
    expect(result.current.chapters.map(c => c.id)).toEqual(['c1', 'c2']);
  });

  it('AUTO_PROGRESS reverses once read progress reaches the configured percent', async () => {
    mockNormalize.mockReturnValue({
      ...serie,
      chapters: [
        { id: 'c1', number: 1, title: 'Chapter 1', readStatus: 'READ' },
        { id: 'c2', number: 2, title: 'Chapter 2', readStatus: 'UNREAD' },
      ],
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.updateSortPrefs({ mode: 'AUTO_PROGRESS', progressPercent: 50 }));
    expect(result.current.chapters.map(c => c.id)).toEqual(['c2', 'c1']);
  });

  it('AUTO_PROGRESS stays ascending when read progress is below the configured percent', async () => {
    mockNormalize.mockReturnValue({
      ...serie,
      chapters: [
        { id: 'c1', number: 1, title: 'Chapter 1', readStatus: 'UNREAD' },
        { id: 'c2', number: 2, title: 'Chapter 2', readStatus: 'UNREAD' },
      ],
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.updateSortPrefs({ mode: 'AUTO_PROGRESS', progressPercent: 50 }));
    expect(result.current.chapters.map(c => c.id)).toEqual(['c1', 'c2']);
  });

  it('AUTO_FIXED uses decimalNumber over number when computing the last read chapter', async () => {
    mockNormalize.mockReturnValue({
      ...serie,
      chapters: [
        { id: 'c1', number: 1, decimalNumber: 10, title: 'Chapter 1', readStatus: 'READ' },
        { id: 'c2', number: 2, title: 'Chapter 2', readStatus: 'UNREAD' },
      ],
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.updateSortPrefs({ mode: 'AUTO_FIXED', fixedThreshold: 5 }));
    // ascending order is by decimalNumber/number (c2's number=2 < c1's decimalNumber=10), and
    // decimalNumber (10, from c1, READ) > fixedThreshold (5) → reversed from that ascending order
    expect(result.current.chapters.map(c => c.id)).toEqual(['c1', 'c2']);
  });

  it('AUTO_PROGRESS with no chapters stays empty and does not divide by zero', async () => {
    mockNormalize.mockReturnValue({ ...serie, chapters: [] });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.updateSortPrefs({ mode: 'AUTO_PROGRESS', progressPercent: 50 }));
    expect(result.current.chapters).toEqual([]);
  });

  it('AUTO_PROGRESS uses the default 50% threshold when toggled to via toggleSortOrder', async () => {
    mockNormalize.mockReturnValue({
      ...serie,
      chapters: [
        { id: 'c1', number: 1, title: 'Chapter 1', readStatus: 'READ' },
        { id: 'c2', number: 2, title: 'Chapter 2', readStatus: 'UNREAD' },
      ],
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.toggleSortOrder()); // DESCENDING
    act(() => result.current.toggleSortOrder()); // AUTO_FIXED
    act(() => result.current.toggleSortOrder()); // AUTO_PROGRESS
    expect(result.current.chapters.map(c => c.id)).toEqual(['c2', 'c1']);
  });
});

describe('useSerie — selection mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue(digestSuccess);
    mockNormalize.mockReturnValue(serie);
    mockIsFollowed.mockResolvedValue(false);
    mockMarkRead.mockResolvedValue({ seriesId: 's1', chapterId: 'c1', readStatus: 'READ' });
    mockMarkUnread.mockResolvedValue({ seriesId: 's1', chapterId: 'c1', readStatus: 'UNREAD' });
  });

  it('onChapterLongPress enters selection mode with that one chapter selected', async () => {
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.onChapterLongPress('c1'));
    expect(result.current.selectionMode).toBe(true);
    expect(result.current.selectedIds).toEqual(new Set(['c1']));
  });

  it('onChapterClick toggles a chapter in/out of the selection while in selection mode', async () => {
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.onChapterLongPress('c1'));
    act(() => result.current.onChapterClick('c2'));
    expect(result.current.selectedIds).toEqual(new Set(['c1', 'c2']));
    act(() => result.current.onChapterClick('c1'));
    expect(result.current.selectedIds).toEqual(new Set(['c2']));
  });

  it('onChapterClick exits selection mode once the last selected chapter is deselected', async () => {
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.onChapterLongPress('c1'));
    act(() => result.current.onChapterClick('c1'));
    expect(result.current.selectionMode).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('onChapterClick does nothing while not in selection mode', async () => {
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.onChapterClick('c1'));
    expect(result.current.selectionMode).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('selectAll selects every visible chapter', async () => {
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.selectAll());
    expect(result.current.selectedIds).toEqual(new Set(['c1', 'c2']));
  });

  it('invertSelection swaps selected/unselected chapters', async () => {
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.onChapterLongPress('c1'));
    act(() => result.current.invertSelection());
    expect(result.current.selectedIds).toEqual(new Set(['c2']));
  });

  it('exitSelectionMode clears selection state', async () => {
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.onChapterLongPress('c1'));
    act(() => result.current.exitSelectionMode());
    expect(result.current.selectionMode).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('markSelectedRead marks every selected chapter read and exits selection mode', async () => {
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.onChapterLongPress('c1'));
    act(() => result.current.onChapterClick('c2'));
    act(() => result.current.markSelectedRead());
    expect(mockMarkRead).toHaveBeenCalledWith(expect.objectContaining({ chapterId: 'c1' }));
    expect(mockMarkRead).toHaveBeenCalledWith(expect.objectContaining({ chapterId: 'c2' }));
    expect(result.current.selectionMode).toBe(false);
  });

  it('markSelectedUnread marks every selected chapter unread and exits selection mode', async () => {
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.onChapterLongPress('c1'));
    act(() => result.current.markSelectedUnread());
    expect(mockMarkUnread).toHaveBeenCalledWith(expect.objectContaining({ chapterId: 'c1' }));
    expect(result.current.selectionMode).toBe(false);
  });
});
