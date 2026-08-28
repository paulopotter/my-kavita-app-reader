import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../shared/i18n/strings';
import type { Serie, SerieChapter } from '../../shared';

const t = getStrings('pt-BR');

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn().mockReturnValue(true);
const mockReset = jest.fn();

// useFocusEffect runs the real effect (via React's own useEffect) instead of a no-op — needed to
// exercise the BackHandler.addEventListener wiring inside it, mirroring the pattern used in
// useSeriesDetail-focus-race.test.ts.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
    reset: mockReset,
    navigate: mockNavigate,
  }),
  useRoute: () => ({ params: { seriesId: 's1', origin: 'LIBRARY' } }),
  useFocusEffect: (effect: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(effect);
  },
}));

const mockRefresh = jest.fn();
const mockToggleFollow = jest.fn();
const mockToggleSortOrder = jest.fn();
const mockUpdateSortPrefs = jest.fn();
const mockResetSortPrefs = jest.fn();
const mockOnChapterLongPress = jest.fn();
const mockOnChapterClick = jest.fn();
const mockSelectAll = jest.fn();
const mockInvertSelection = jest.fn();
const mockExitSelectionMode = jest.fn();
const mockMarkSelectedRead = jest.fn();
const mockMarkSelectedUnread = jest.fn();
const mockRealize = jest.fn();

function makeChapter(overrides: Partial<SerieChapter> = {}): SerieChapter {
  return {
    id: 'c1',
    seriesId: 's1',
    title: 'A Chegada',
    number: 1,
    readStatus: 'UNREAD',
    coverImage: {} as SerieChapter['coverImage'],
    pages: { list: [] },
    resolvedAtEpochMs: 0,
    server: {} as SerieChapter['server'],
    action: { method: 'navigate', route: 'reader/:seriesId/:chapterId', params: { seriesId: 's1', chapterId: 'c1' } },
    ...overrides,
  };
}

function makeSerie(overrides: Partial<Serie> = {}): Serie {
  return {
    id: 's1',
    name: 'One Piece',
    coverImage: { url: 'https://example.invalid/cover.jpg' } as Serie['coverImage'],
    chapters: [],
    resolvedAtEpochMs: 0,
    server: {} as Serie['server'],
    ...overrides,
  };
}

let mockSerieState: any;

jest.mock('./hooks', () => ({
  useSerie: () => mockSerieState,
}));

import { SerieScreen } from './serie.screen';

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack.mockReturnValue(true);
  mockSerieState = {
    loading: true,
    refreshing: false,
    error: null,
    serie: null,
    chapters: [],
    continueChapter: null,
    isFollowed: false,
    sortMode: 'ASCENDING',
    sortFixedThreshold: undefined,
    sortProgressPercent: 50,
    hasSeriesSortOverride: false,
    selectionMode: false,
    selectedIds: new Set<string>(),
    realize: mockRealize,
    refresh: mockRefresh,
    toggleFollow: mockToggleFollow,
    toggleSortOrder: mockToggleSortOrder,
    updateSortPrefs: mockUpdateSortPrefs,
    resetSortPrefs: mockResetSortPrefs,
    onChapterLongPress: mockOnChapterLongPress,
    onChapterClick: mockOnChapterClick,
    selectAll: mockSelectAll,
    invertSelection: mockInvertSelection,
    exitSelectionMode: mockExitSelectionMode,
    markSelectedRead: mockMarkSelectedRead,
    markSelectedUnread: mockMarkSelectedUnread,
  };
});

describe('SerieScreen', () => {
  it('mounts without crashing while loading', () => {
    expect(() => render(<SerieScreen />)).not.toThrow();
  });

  it('shows the loading state', () => {
    const { getByText } = render(<SerieScreen />);
    expect(getByText(t.seriesDetailLoading)).toBeTruthy();
  });

  it('shows the error state when loading failed with nothing loaded yet', () => {
    mockSerieState.loading = false;
    mockSerieState.error = 'network down';
    const { getByText } = render(<SerieScreen />);
    expect(getByText('network down')).toBeTruthy();
  });

  it('retries by calling refresh from the error state', () => {
    mockSerieState.loading = false;
    mockSerieState.error = 'network down';
    const { getByText } = render(<SerieScreen />);
    fireEvent.press(getByText(t.seriesDetailRetry));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders the series and chapters once loaded', () => {
    const chapters = [makeChapter()];
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie({ chapters });
    mockSerieState.chapters = chapters;
    const { getByText } = render(<SerieScreen />);
    expect(getByText('One Piece')).toBeTruthy();
    expect(getByText('1. A Chegada')).toBeTruthy();
  });

  it('navigates to the reader when a chapter is pressed outside selection mode', () => {
    const chapters = [makeChapter()];
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie({ chapters });
    mockSerieState.chapters = chapters;
    const { getByText } = render(<SerieScreen />);
    fireEvent.press(getByText('1. A Chegada'));
    expect(mockNavigate).toHaveBeenCalledWith('reader/:seriesId/:chapterId', { seriesId: 's1', chapterId: 'c1', origin: 'LIBRARY' });
  });

  it('delegates to onChapterClick when a chapter is pressed in selection mode', () => {
    const chapters = [makeChapter()];
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie({ chapters });
    mockSerieState.chapters = chapters;
    mockSerieState.selectionMode = true;
    const { getByText } = render(<SerieScreen />);
    fireEvent.press(getByText('1. A Chegada'));
    expect(mockOnChapterClick).toHaveBeenCalledWith('c1');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('calls onChapterLongPress on long press', () => {
    const chapters = [makeChapter()];
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie({ chapters });
    mockSerieState.chapters = chapters;
    const { getByText } = render(<SerieScreen />);
    fireEvent(getByText('1. A Chegada'), 'longPress');
    expect(mockOnChapterLongPress).toHaveBeenCalledWith('c1');
  });

  it('shows the SelectionBottomBar in selection mode and wires its actions', () => {
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie();
    mockSerieState.selectionMode = true;
    const { getByText } = render(<SerieScreen />);
    fireEvent.press(getByText(t.seriesDetailSelectionMarkRead));
    expect(mockMarkSelectedRead).toHaveBeenCalledTimes(1);
    fireEvent.press(getByText(t.seriesDetailSelectionMarkUnread));
    expect(mockMarkSelectedUnread).toHaveBeenCalledTimes(1);
    fireEvent.press(getByText(t.seriesDetailSelectionSelectAll));
    expect(mockSelectAll).toHaveBeenCalledTimes(1);
    fireEvent.press(getByText(t.seriesDetailSelectionInvert));
    expect(mockInvertSelection).toHaveBeenCalledTimes(1);
  });

  it('exits selection mode when the back button is pressed while selecting', () => {
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie();
    mockSerieState.selectionMode = true;
    const { UNSAFE_getAllByType } = render(<SerieScreen />);
    const TouchableOpacity = require('react-native').TouchableOpacity;
    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[0]);
    expect(mockExitSelectionMode).toHaveBeenCalledTimes(1);
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('goes back when the back button is pressed outside selection mode', () => {
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie();
    const { UNSAFE_getAllByType } = render(<SerieScreen />);
    const TouchableOpacity = require('react-native').TouchableOpacity;
    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[0]);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('resets navigation when it cannot go back', () => {
    mockCanGoBack.mockReturnValue(false);
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie();
    const { UNSAFE_getAllByType } = render(<SerieScreen />);
    const TouchableOpacity = require('react-native').TouchableOpacity;
    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[0]);
    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'library' }] });
  });

  it('calls toggleFollow when the follow star is pressed', () => {
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie();
    const { UNSAFE_getAllByType } = render(<SerieScreen />);
    const TouchableOpacity = require('react-native').TouchableOpacity;
    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[1]);
    expect(mockToggleFollow).toHaveBeenCalledTimes(1);
  });

  it('opens the sort config modal from the settings button', () => {
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie();
    const { getByText, UNSAFE_getAllByType } = render(<SerieScreen />);
    const TouchableOpacity = require('react-native').TouchableOpacity;
    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[2]);
    expect(getByText(t.seriesDetailSortConfigTitle)).toBeTruthy();
  });

  it('navigates to the reader from the header action when there is a continueChapter', () => {
    const chapters = [makeChapter({ readStatus: 'READ' }), makeChapter({ id: 'c2', number: 2 })];
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie({ chapters });
    mockSerieState.chapters = chapters;
    mockSerieState.continueChapter = chapters[1];
    const { getByText } = render(<SerieScreen />);
    fireEvent.press(getByText(t.seriesDetailContinueReading.replace('{0}', '2')));
    expect(mockNavigate).toHaveBeenCalledWith('reader/:seriesId/:chapterId', { seriesId: 's1', chapterId: 'c2', origin: 'LIBRARY' });
  });

  it('does nothing on header action press when there is no continueChapter and no chapters', () => {
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie({ chapters: [] });
    mockSerieState.chapters = [];
    const { getByText } = render(<SerieScreen />);
    fireEvent.press(getByText(t.seriesDetailStartReading));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('exits selection mode via the hardware back handler while selecting', () => {
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie();
    mockSerieState.selectionMode = true;
    const BackHandler = require('react-native').BackHandler;
    const addSpy = jest.spyOn(BackHandler, 'addEventListener');
    render(<SerieScreen />);
    const handler = addSpy.mock.calls[0][1] as () => boolean;
    expect(handler()).toBe(true);
    expect(mockExitSelectionMode).toHaveBeenCalledTimes(1);
    addSpy.mockRestore();
  });

  it('lets the hardware back press fall through when not in selection mode', () => {
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie();
    const BackHandler = require('react-native').BackHandler;
    const addSpy = jest.spyOn(BackHandler, 'addEventListener');
    render(<SerieScreen />);
    const handler = addSpy.mock.calls[0][1] as () => boolean;
    expect(handler()).toBe(false);
    expect(mockExitSelectionMode).not.toHaveBeenCalled();
    addSpy.mockRestore();
  });

  it('shows every sort mode label via the sort toggle button', () => {
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie();
    mockSerieState.sortMode = 'DESCENDING';
    const { getByText, rerender } = render(<SerieScreen />);
    expect(getByText(t.seriesDetailSortDescending)).toBeTruthy();

    mockSerieState.sortMode = 'AUTO_FIXED';
    mockSerieState.sortFixedThreshold = 3;
    rerender(<SerieScreen />);
    expect(getByText(t.seriesDetailSortAutoFixed.replace('{0}', '3'))).toBeTruthy();

    mockSerieState.sortMode = 'AUTO_PROGRESS';
    rerender(<SerieScreen />);
    expect(getByText(t.seriesDetailSortAutoProgress.replace('{0}', '50'))).toBeTruthy();
  });

  it('calls toggleSortOrder when the sort toggle is pressed', () => {
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie();
    const { getByText } = render(<SerieScreen />);
    fireEvent.press(getByText(t.seriesDetailSortAscending));
    expect(mockToggleSortOrder).toHaveBeenCalledTimes(1);
  });

  it('saves sort prefs and closes the modal from ChapterSortConfigModal', () => {
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie();
    const { getByText, UNSAFE_getAllByType, queryByText } = render(<SerieScreen />);
    const TouchableOpacity = require('react-native').TouchableOpacity;
    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[2]);
    expect(getByText(t.seriesDetailSortConfigTitle)).toBeTruthy();
    fireEvent.press(getByText(t.seriesDetailSortConfigSave));
    expect(mockUpdateSortPrefs).toHaveBeenCalledWith({ mode: 'ASCENDING', fixedThreshold: undefined, progressPercent: 50 });
    expect(queryByText(t.seriesDetailSortConfigTitle)).toBeNull();
  });

  it('closes the modal via cancel without saving', () => {
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie();
    const { getByText, UNSAFE_getAllByType, queryByText } = render(<SerieScreen />);
    const TouchableOpacity = require('react-native').TouchableOpacity;
    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[2]);
    fireEvent.press(getByText(t.seriesDetailSortConfigCancel));
    expect(mockUpdateSortPrefs).not.toHaveBeenCalled();
    expect(queryByText(t.seriesDetailSortConfigTitle)).toBeNull();
  });

  it('resets sort prefs and closes the modal when a series override exists', () => {
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie();
    mockSerieState.hasSeriesSortOverride = true;
    const { getByText, UNSAFE_getAllByType, queryByText } = render(<SerieScreen />);
    const TouchableOpacity = require('react-native').TouchableOpacity;
    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[2]);
    fireEvent.press(getByText(t.seriesDetailSortConfigReset));
    expect(mockResetSortPrefs).toHaveBeenCalledTimes(1);
    expect(queryByText(t.seriesDetailSortConfigTitle)).toBeNull();
  });

  it('shows the scroll-to-top button after scrolling up past the header, and scrolls to the top when pressed', () => {
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie();
    const { getByText, queryByText, UNSAFE_getByType } = render(<SerieScreen />);
    const FlatList = require('react-native').FlatList;
    const list = UNSAFE_getByType(FlatList);

    // Reports the header's real rendered height, same onLayout the screen wires on its list
    // header wrapper — needed before a scroll-up is recognized as "past the header".
    fireEvent(list.props.ListHeaderComponent, 'layout', { nativeEvent: { layout: { height: 200 } } });

    fireEvent(list, 'onScroll', { nativeEvent: { contentOffset: { y: 500 } } });
    fireEvent(list, 'onScroll', { nativeEvent: { contentOffset: { y: 100 } } });

    fireEvent.press(getByText('↑'));
    expect(queryByText('↑')).toBeNull(); // pressing it hides the button again
  });
});
