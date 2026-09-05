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
    // real impl — pure function, no deps; useSerie derives continueChapter through it
    resolveResumeChapterId: jest.requireActual('../../../shared/tools/series/serie.tool').SerieTool
      .resolveResumeChapterId,
  },
  ChapterTool: {
    mark: {
      read: jest.fn(),
      unread: jest.fn(),
      toggle: jest.fn(),
      readMany: jest.fn(),
      unreadMany: jest.fn(),
    },
    // real impl — pure; useSerie's actionLabel formats continueChapter through it
    format: jest.requireActual('../../../shared/tools/chapters/chapters.tool').ChapterTool.format,
  },
  ChaptersTool: {
    sort: {
      get: jest.fn(),
      put: jest.fn(),
      reset: jest.fn(),
    },
  },
  useAction: () => ({ realize: jest.fn() }),
}));

import { useSerie } from './serie.hooks';
import { ChapterTool, ChaptersTool, SerialService, SerieTool } from '../../../shared';
import { EventBus } from '../../../shared/managers/events';
import { ChapterEvents } from '../../../shared/tools/chapters';
import { getStrings } from '../../../shared/i18n/strings';

const mockGet = SerialService.get as jest.Mock;
const mockNormalize = SerieTool.normalize as jest.Mock;
const mockIsFollowed = SerieTool.isFollowed as jest.Mock;
const mockToggleFollow = SerieTool.toggleFollow as jest.Mock;
const mockMarkRead = ChapterTool.mark.read as jest.Mock;
const mockMarkUnread = ChapterTool.mark.unread as jest.Mock;
const mockMarkToggle = ChapterTool.mark.toggle as jest.Mock;
const mockMarkReadMany = ChapterTool.mark.readMany as jest.Mock;
const mockMarkUnreadMany = ChapterTool.mark.unreadMany as jest.Mock;
const mockSortGet = ChaptersTool.sort.get as jest.Mock;
const mockSortPut = ChaptersTool.sort.put as jest.Mock;
const mockSortReset = ChaptersTool.sort.reset as jest.Mock;

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
    mockSortGet.mockResolvedValue({ mode: 'ASCENDING', progressPercent: 50 });
    mockSortPut.mockResolvedValue(undefined);
    mockSortReset.mockResolvedValue({ mode: 'ASCENDING', progressPercent: 50 });
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

  describe('actionLabel / readCount (moved out of header.component.tsx)', () => {
    it('readCount counts READ chapters', async () => {
      mockNormalize.mockReturnValue({
        ...serie,
        chapters: [
          { id: 'c1', number: 1, title: 'Chapter 1', readStatus: 'READ' },
          { id: 'c2', number: 2, title: 'Chapter 2', readStatus: 'UNREAD' },
        ],
      });
      const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.readCount).toBe(1);
    });

    it('actionLabel is "start reading" when nothing is read yet', async () => {
      const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.actionLabel).toBe(getStrings('pt-BR').seriesDetailStartReading);
    });

    it('actionLabel is "reread from start" when every chapter is read and there is no resumePoint', async () => {
      mockNormalize.mockReturnValue({
        ...serie,
        resumePoint: undefined,
        chapters: [
          { id: 'c1', number: 1, title: 'Chapter 1', readStatus: 'READ' },
          { id: 'c2', number: 2, title: 'Chapter 2', readStatus: 'READ' },
        ],
      });
      const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.actionLabel).toBe(getStrings('pt-BR').seriesDetailRereadFromStart);
    });

    it('actionLabel formats the resume chapter through ChapterTool.format.title (same as the list)', async () => {
      mockNormalize.mockReturnValue({
        ...serie,
        chapters: [
          { id: 'c1', number: 1, title: 'Chapter 1', readStatus: 'READ' },
          // bare-number title on a fractional chapter → "Capítulo 2.5", not "2. 2"
          { id: 'c2', number: undefined, decimalNumber: 2.5, title: '2', readStatus: 'IN_PROGRESS' },
        ],
      });
      const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.actionLabel).toBe(
        getStrings('pt-BR').seriesDetailContinueReading.replace(
          '{0}',
          getStrings('pt-BR').seriesDetailChapterNumberLabel.replace('{0}', '2.5'),
        ),
      );
    });
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

  // A mark from another screen (the Reader, still-mounted serie underneath) reaches this hook via
  // ChapterEvents.readStatusChanged on the real EventBus — no focus reload needed.
  describe('reacts to ChapterEvents.readStatusChanged from another screen', () => {
    it('applies an optimistic READ for a chapter of THIS series in place', async () => {
      const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => {
        EventBus.emit(ChapterEvents.readStatusChanged, {
          chapter: { id: 'c2', seriesId: 's1' },
          changed: { readStatus: 'READ' },
          phase: 'optimistic',
        });
      });
      expect(result.current.chapters.find(c => c.id === 'c2')?.readStatus).toBe('READ');
      expect(result.current.chapters.find(c => c.id === 'c1')?.readStatus).toBe('UNREAD'); // untouched
    });

    it('applies the reverted status when the mark failed downstream', async () => {
      mockNormalize.mockReturnValue({
        ...serie,
        chapters: [
          { id: 'c1', number: 1, title: 'Chapter 1', readStatus: 'READ' },
          { id: 'c2', number: 2, title: 'Chapter 2', readStatus: 'UNREAD' },
        ],
      });
      const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => {
        EventBus.emit(ChapterEvents.readStatusChanged, {
          chapter: { id: 'c1', seriesId: 's1' },
          changed: { readStatus: 'UNREAD' },
          phase: 'reverted',
        });
      });
      expect(result.current.chapters.find(c => c.id === 'c1')?.readStatus).toBe('UNREAD');
    });

    it('ignores the confirmed phase (nothing visible changed since optimistic)', async () => {
      const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => {
        EventBus.emit(ChapterEvents.readStatusChanged, {
          chapter: { id: 'c2', seriesId: 's1' },
          changed: { readStatus: 'READ' },
          phase: 'confirmed',
        });
      });
      expect(result.current.chapters.find(c => c.id === 'c2')?.readStatus).toBe('UNREAD');
    });

    it('ignores a mark for a different series', async () => {
      const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => {
        EventBus.emit(ChapterEvents.readStatusChanged, {
          chapter: { id: 'cX', seriesId: 's2' },
          changed: { readStatus: 'READ' },
          phase: 'optimistic',
        });
      });
      expect(result.current.chapters.every(c => c.readStatus === 'UNREAD')).toBe(true);
    });
  });
});

describe('useSerie — continueChapter (derived via SerieTool.resolveResumeChapterId)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue(digestSuccess);
    mockIsFollowed.mockResolvedValue(false);
  });

  it('is the first IN_PROGRESS chapter in reading order', async () => {
    mockNormalize.mockReturnValue({
      ...serie,
      chapters: [
        { id: 'c1', number: 1, title: 'Chapter 1', readStatus: 'READ' },
        { id: 'c2', number: 2, title: 'Chapter 2', readStatus: 'IN_PROGRESS' },
        { id: 'c3', number: 3, title: 'Chapter 3', readStatus: 'UNREAD' },
      ],
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.continueChapter?.id).toBe('c2');
  });

  it('falls back to the first UNREAD chapter in reading order when none is IN_PROGRESS', async () => {
    mockNormalize.mockReturnValue({
      ...serie,
      chapters: [
        { id: 'c1', number: 1, title: 'Chapter 1', readStatus: 'READ' },
        { id: 'c3', number: 3, title: 'Chapter 3', readStatus: 'UNREAD' },
        { id: 'c2', number: 2, title: 'Chapter 2', readStatus: 'UNREAD' },
      ],
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // reading order (by number ascending) — c2 comes before c3 even though the list is unsorted
    expect(result.current.continueChapter?.id).toBe('c2');
  });

  it('is null when every chapter is read', async () => {
    mockNormalize.mockReturnValue({
      ...serie,
      chapters: [
        { id: 'c1', number: 1, title: 'Chapter 1', readStatus: 'READ' },
        { id: 'c2', number: 2, title: 'Chapter 2', readStatus: 'READ' },
      ],
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.continueChapter).toBeNull();
  });

  it('recomputes immediately after an optimistic mark (no refetch)', async () => {
    mockNormalize.mockReturnValue({
      ...serie,
      chapters: [
        { id: 'c1', number: 1, title: 'Chapter 1', readStatus: 'READ' },
        { id: 'c2', number: 2, title: 'Chapter 2', readStatus: 'UNREAD' },
        { id: 'c3', number: 3, title: 'Chapter 3', readStatus: 'UNREAD' },
      ],
    });
    mockMarkRead.mockImplementation(({ chapterId, seriesId, onUpdate }: any) => {
      onUpdate?.({ chapterId, seriesId, readStatus: 'READ' });
      return Promise.resolve({ chapterId, seriesId, readStatus: 'READ' });
    });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.continueChapter?.id).toBe('c2');
    await act(async () => {
      await result.current.markRead({ chapterId: 'c2' });
    });
    expect(result.current.continueChapter?.id).toBe('c3');
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

  it('loads default sort prefs when ChaptersTool.sort.get resolves the plain global default', async () => {
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(mockSortGet).toHaveBeenCalledWith({ domain: 'series', seriesId: 's1' }));
    expect(result.current.sortMode).toBe('ASCENDING');
    expect(result.current.hasSeriesSortOverride).toBe(false);
  });

  it('applies the global default as-is when ChaptersTool.sort.get returns no isOverride', async () => {
    mockSortGet.mockResolvedValue({ mode: 'DESCENDING', progressPercent: 50 });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.sortMode).toBe('DESCENDING'));
    expect(result.current.hasSeriesSortOverride).toBe(false);
  });

  it('marks hasSeriesSortOverride true when ChaptersTool.sort.get returns isOverride', async () => {
    mockSortGet.mockResolvedValue({ mode: 'AUTO_FIXED', fixedThreshold: 3, progressPercent: 50, isOverride: true });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.sortMode).toBe('AUTO_FIXED'));
    expect(result.current.sortFixedThreshold).toBe(3);
    expect(result.current.hasSeriesSortOverride).toBe(true);
  });

  it('falls back to defaults when reading persisted sort prefs rejects', async () => {
    mockSortGet.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.sortMode).toBe('ASCENDING'));
    expect(result.current.hasSeriesSortOverride).toBe(false);
  });

  it('updateSortPrefs always writes a per-series override, marking hasSeriesSortOverride true', async () => {
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.updateSortPrefs({ mode: 'DESCENDING', progressPercent: 75 }));
    expect(mockSortPut).toHaveBeenCalledWith(
      { domain: 'series', seriesId: 's1' },
      { mode: 'DESCENDING', fixedThreshold: undefined, progressPercent: 75 },
    );
    expect(result.current.hasSeriesSortOverride).toBe(true);
  });

  it('resetSortPrefs deletes the series override and reapplies whatever ChaptersTool.sort.reset resolves', async () => {
    mockSortGet.mockResolvedValue({ mode: 'AUTO_FIXED', fixedThreshold: 3, progressPercent: 50, isOverride: true });
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.hasSeriesSortOverride).toBe(true));

    mockSortReset.mockResolvedValue({ mode: 'DESCENDING', progressPercent: 50 });
    await act(async () => {
      await result.current.resetSortPrefs();
    });

    expect(mockSortReset).toHaveBeenCalledWith({ seriesId: 's1' });
    expect(result.current.sortMode).toBe('DESCENDING');
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

  it('markSelectedRead makes ONE batch readMany call for the whole selection, then exits', async () => {
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.onChapterLongPress('c1'));
    act(() => result.current.onChapterClick('c2'));
    act(() => result.current.markSelectedRead());
    expect(mockMarkReadMany).toHaveBeenCalledTimes(1);
    expect(mockMarkReadMany).toHaveBeenCalledWith(
      expect.objectContaining({ seriesId: 's1', chapterIds: expect.arrayContaining(['c1', 'c2']) }),
    );
    // NOT a loop of the single-chapter mark (that's what saturated the server)
    expect(mockMarkRead).not.toHaveBeenCalled();
    expect(result.current.selectionMode).toBe(false);
  });

  it('markSelectedRead passes prevStatusById from the chapters in hand', async () => {
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.onChapterLongPress('c1'));
    act(() => result.current.markSelectedRead());
    const arg = mockMarkReadMany.mock.calls[0][0];
    expect(arg.prevStatusById).toHaveProperty('c1');
  });

  it('markSelectedUnread makes ONE batch unreadMany call, then exits', async () => {
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.onChapterLongPress('c1'));
    act(() => result.current.markSelectedUnread());
    expect(mockMarkUnreadMany).toHaveBeenCalledTimes(1);
    expect(mockMarkUnreadMany).toHaveBeenCalledWith(expect.objectContaining({ chapterIds: ['c1'] }));
    expect(mockMarkUnread).not.toHaveBeenCalled();
    expect(result.current.selectionMode).toBe(false);
  });

  it('an empty selection does not call the batch mark at all', async () => {
    const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // selectionMode on but nothing selected
    act(() => result.current.onChapterLongPress('c1'));
    act(() => result.current.onChapterClick('c1')); // deselect -> empty
    act(() => result.current.markSelectedRead());
    expect(mockMarkReadMany).not.toHaveBeenCalled();
  });

  // applyMarkUpdates (the onUpdateMany channel) folds the whole batch into ONE setSerie/.map()
  // pass instead of one per chapter — marking a large selection was calling the per-id
  // applyMarkUpdate once per chapter, each one re-copying the WHOLE chapters array, which is what
  // showed up as the UI freezing on a large "mark all read" selection. These tests exercise that
  // channel directly (readMany/unreadMany are mocked, so this simulates what the real
  // ChapterTool.mark.readMany does: call onUpdateMany once with the whole batch).
  describe('markSelectedRead / markSelectedUnread — batched local state via onUpdateMany', () => {
    it('applies every selected chapter’s new status from a single onUpdateMany call', async () => {
      mockMarkReadMany.mockImplementation(({ onUpdateMany }) => {
        onUpdateMany([
          { seriesId: 's1', chapterId: 'c1', readStatus: 'READ' },
          { seriesId: 's1', chapterId: 'c2', readStatus: 'READ' },
        ]);
        return Promise.resolve();
      });
      const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => result.current.onChapterLongPress('c1'));
      act(() => result.current.onChapterClick('c2'));
      act(() => result.current.markSelectedRead());
      expect(result.current.chapters.every(c => c.readStatus === 'READ')).toBe(true);
    });

    it('leaves an unselected chapter untouched after a batch mark', async () => {
      mockMarkReadMany.mockImplementation(({ onUpdateMany }) => {
        onUpdateMany([{ seriesId: 's1', chapterId: 'c1', readStatus: 'READ' }]);
        return Promise.resolve();
      });
      const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => result.current.onChapterLongPress('c1'));
      act(() => result.current.markSelectedRead());
      expect(result.current.chapters.find(c => c.id === 'c1')?.readStatus).toBe('READ');
      expect(result.current.chapters.find(c => c.id === 'c2')?.readStatus).toBe('UNREAD');
    });

    it('applies a batch unread the same way', async () => {
      mockNormalize.mockReturnValue({
        ...serie,
        chapters: [
          { id: 'c1', number: 1, title: 'Chapter 1', readStatus: 'READ' },
          { id: 'c2', number: 2, title: 'Chapter 2', readStatus: 'READ' },
        ],
      });
      mockMarkUnreadMany.mockImplementation(({ onUpdateMany }) => {
        onUpdateMany([
          { seriesId: 's1', chapterId: 'c1', readStatus: 'UNREAD' },
          { seriesId: 's1', chapterId: 'c2', readStatus: 'UNREAD' },
        ]);
        return Promise.resolve();
      });
      const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => result.current.onChapterLongPress('c1'));
      act(() => result.current.onChapterClick('c2'));
      act(() => result.current.markSelectedUnread());
      expect(result.current.chapters.every(c => c.readStatus === 'UNREAD')).toBe(true);
    });

    it('does nothing when onUpdateMany is called with an empty batch', async () => {
      mockMarkReadMany.mockImplementation(({ onUpdateMany }) => {
        onUpdateMany([]);
        return Promise.resolve();
      });
      const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      const before = result.current.chapters;
      act(() => result.current.onChapterLongPress('c1'));
      act(() => result.current.markSelectedRead());
      expect(result.current.chapters).toBe(before);
    });
  });

  describe('scroll-to-top button visibility', () => {
    const layout = (h: number) => ({ nativeEvent: { layout: { height: h } } }) as never;
    const scroll = (y: number) => ({ nativeEvent: { contentOffset: { y } } }) as never;

    it('stays hidden until the user scrolls up past the measured header', async () => {
      const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => result.current.onHeaderLayout(layout(200)));

      // scrolling DOWN past the header — still hidden
      act(() => result.current.handleScroll(scroll(500)));
      expect(result.current.showScrollTop).toBe(false);

      // now scrolling UP, still past the header — shown
      act(() => result.current.handleScroll(scroll(300)));
      expect(result.current.showScrollTop).toBe(true);
    });

    it('does not show while still within the header height, even when scrolling up', async () => {
      const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => result.current.onHeaderLayout(layout(200)));

      act(() => result.current.handleScroll(scroll(150)));
      act(() => result.current.handleScroll(scroll(50))); // scrolling up but header still visible
      expect(result.current.showScrollTop).toBe(false);
    });

    it('hideScrollTop forces it hidden', async () => {
      const { result } = renderHook(() => useSerie({ seriesId: 's1', origin: 'LIBRARY' }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => result.current.onHeaderLayout(layout(100)));
      act(() => result.current.handleScroll(scroll(500)));
      act(() => result.current.handleScroll(scroll(200)));
      expect(result.current.showScrollTop).toBe(true);
      act(() => result.current.hideScrollTop());
      expect(result.current.showScrollTop).toBe(false);
    });
  });
});
