import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ChevronUp } from 'lucide-react-native';
import { View } from 'react-native';
import { getStrings } from '../../shared/i18n/strings';
import { NavigationTool } from '../../shared/tools/navigation';
import { chapterEvents, serieEvents, type ActionContract, type Serie, type SerieChapter } from '../../shared';

const t = getStrings('pt-BR');

// The ⋮ chapter menu button measures its own on-screen position (View.measureInWindow) before
// opening, to anchor the menu under it (see serie.screen.tsx's openChapterMenu). RNTL's test
// renderer never actually lays anything out, so the real method never calls its callback —
// this stands in with a fixed, arbitrary-but-valid measurement so the menu can open in tests.
jest.spyOn(View.prototype, 'measureInWindow').mockImplementation(function (this: unknown, cb: any) {
  cb(300, 100, 24, 24);
});

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
const mockSelectRange = jest.fn();
const mockExitSelectionMode = jest.fn();
const mockMarkSelectedRead = jest.fn();
const mockMarkSelectedUnread = jest.fn();
// realize(action) — the real thing decides navigate/goBack/reset via NavigationTool.go against
// this same mocked `navigation`, so these tests exercise the actual rule, not a stubbed decision.
const mockRealize = jest.fn((action: ActionContract) => {
  const target = action.navigate.to ?? action.navigate.back;
  return () => {
    if (target) {NavigationTool.go({ goBack: mockGoBack, canGoBack: mockCanGoBack, navigate: mockNavigate, reset: mockReset }, target);}
  };
});
const mockHideScrollTop = jest.fn();

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
    action: { navigate: { to: { route: 'reader/:seriesId/:chapterId', params: { seriesId: 's1', chapterId: 'c1' } } } },
    events: chapterEvents({ seriesId: 's1', chapterId: 'c1' }),
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
    events: serieEvents({ seriesId: 's1' }),
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
    readCount: 0,
    actionLabel: t.seriesDetailStartReading,
    isFollowed: false,
    sortMode: 'ASCENDING',
    sortFixedThreshold: undefined,
    sortProgressPercent: 50,
    hasSeriesSortOverride: false,
    selectionMode: false,
    selectedIds: new Set<string>(),
    realize: mockRealize,
    backAction: { navigate: { back: { route: 'library', canUseGoBack: true, canResetStack: true } } } as ActionContract,
    refresh: mockRefresh,
    toggleFollow: mockToggleFollow,
    toggleSortOrder: mockToggleSortOrder,
    updateSortPrefs: mockUpdateSortPrefs,
    resetSortPrefs: mockResetSortPrefs,
    onChapterLongPress: mockOnChapterLongPress,
    onChapterClick: mockOnChapterClick,
    selectAll: mockSelectAll,
    invertSelection: mockInvertSelection,
    selectRange: mockSelectRange,
    exitSelectionMode: mockExitSelectionMode,
    markSelectedRead: mockMarkSelectedRead,
    markSelectedUnread: mockMarkSelectedUnread,
    showScrollTop: false,
    handleScroll: jest.fn(),
    hideScrollTop: mockHideScrollTop,
    onHeaderLayout: jest.fn(),
  };
});

// Opens the ⋮ chapter menu and taps the given item, landing on whichever modal it opens
// (seriesDetailChapterMenuSort → sort config, seriesDetailChapterMenuRange → range picker).
// Both the sort config modal and the range modal are reached exclusively through this menu now.
function openChapterMenuAndSelect(item: 'sort' | 'range') {
  mockSerieState.loading = false;
  mockSerieState.serie = makeSerie();
  const utils = render(<SerieScreen />);
  fireEvent.press(utils.getByLabelText(t.seriesDetailChapterMenuLabel));
  fireEvent.press(utils.getByText(item === 'sort' ? t.seriesDetailChapterMenuSort : t.seriesDetailChapterMenuRange));
  return utils;
}

describe('SerieScreen', () => {
  it('mounts without crashing while loading', () => {
    expect(() => render(<SerieScreen />)).not.toThrow();
  });

  it('shows the loading state', () => {
    const { getByText } = render(<SerieScreen />);
    expect(getByText(t.seriesDetailLoading)).toBeTruthy();
  });

  // Only the generic friendly title is shown — the raw exception message (e.g. a
  // kotlinx.serialization parse error leaking JSON offsets/paths) is never rendered directly, so a
  // technical error string never reaches the user as-is.
  it('shows the error state when loading failed with nothing loaded yet', () => {
    mockSerieState.loading = false;
    mockSerieState.error = 'network down';
    const { getByText, queryByText } = render(<SerieScreen />);
    expect(getByText(t.seriesDetailError)).toBeTruthy();
    expect(queryByText('network down')).toBeNull();
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
    expect(mockNavigate).toHaveBeenCalledWith('reader/:seriesId/:chapterId', {
      seriesId: 's1', chapterId: 'c1', origin: 'LIBRARY', seriesName: 'One Piece',
    });
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

  it('opens the sort config modal from the chapter menu', () => {
    const { getByText } = openChapterMenuAndSelect('sort');
    expect(getByText(t.seriesDetailSortConfigTitle)).toBeTruthy();
  });

  it('navigates to the reader from the header action when there is a continueChapter', () => {
    const chapters = [makeChapter({ readStatus: 'READ' }), makeChapter({ id: 'c2', number: 2 })];
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie({ chapters });
    mockSerieState.chapters = chapters;
    mockSerieState.continueChapter = chapters[1];
    mockSerieState.actionLabel = t.seriesDetailContinueReading.replace('{0}', '2');
    const { getByText } = render(<SerieScreen />);
    fireEvent.press(getByText(t.seriesDetailContinueReading.replace('{0}', '2')));
    expect(mockNavigate).toHaveBeenCalledWith('reader/:seriesId/:chapterId', {
      seriesId: 's1', chapterId: 'c2', origin: 'LIBRARY', seriesName: 'One Piece',
    });
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

  it('saves sort prefs and closes the sort modal on Save', () => {
    const { getByText, queryByText } = openChapterMenuAndSelect('sort');
    expect(getByText(t.seriesDetailSortConfigTitle)).toBeTruthy();
    fireEvent.press(getByText(t.seriesDetailSortConfigSave));
    expect(mockUpdateSortPrefs).toHaveBeenCalledWith({ mode: 'ASCENDING', fixedThreshold: undefined, progressPercent: 50 });
    expect(queryByText(t.seriesDetailSortConfigTitle)).toBeNull();
  });

  it('closes the modal via cancel without saving', () => {
    const { getByText, queryByText } = openChapterMenuAndSelect('sort');
    fireEvent.press(getByText(t.seriesDetailSortConfigCancel));
    expect(mockUpdateSortPrefs).not.toHaveBeenCalled();
    expect(queryByText(t.seriesDetailSortConfigTitle)).toBeNull();
  });

  it('resets sort prefs and closes the modal when a series override exists', () => {
    mockSerieState.hasSeriesSortOverride = true;
    const { getByText, queryByText } = openChapterMenuAndSelect('sort');
    fireEvent.press(getByText(t.seriesDetailSortConfigReset));
    expect(mockResetSortPrefs).toHaveBeenCalledTimes(1);
    expect(queryByText(t.seriesDetailSortConfigTitle)).toBeNull();
  });

  it('wires the FlatList scroll / header layout to the hook callbacks', () => {
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie();
    const { UNSAFE_getByType } = render(<SerieScreen />);
    const FlatList = require('react-native').FlatList;
    const list = UNSAFE_getByType(FlatList);

    // onScroll goes straight to the hook; the header wrapper's onLayout is the hook's callback.
    expect(list.props.onScroll).toBe(mockSerieState.handleScroll);
    expect(list.props.ListHeaderComponent.props.onLayout).toBe(mockSerieState.onHeaderLayout);
  });

  it('renders the scroll-to-top button only when the hook says so, and hides it on press', () => {
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie();

    const hidden = render(<SerieScreen />);
    expect(hidden.UNSAFE_queryByType(ChevronUp)).toBeNull();
    hidden.unmount();

    mockSerieState.showScrollTop = true;
    const { UNSAFE_getByType } = render(<SerieScreen />);
    const { TouchableOpacity } = require('react-native');
    // ScrollToTopButton is the only place in this screen that renders ChevronUp — walk up to its
    // enclosing TouchableOpacity, the button itself.
    let node = UNSAFE_getByType(ChevronUp).parent;
    while (node && node.type !== TouchableOpacity) {
      node = node.parent;
    }
    fireEvent.press(node);
    expect(mockHideScrollTop).toHaveBeenCalledTimes(1);
  });

  it('anchors the chapter menu card under the measured position of its own ⋮ button', () => {
    // measureInWindow is mocked at module scope to call back with (x=300, y=100, width=24,
    // height=24) — the card should land right under that (top = y + height) and flush with its
    // right edge (right = screenWidth - (x + width); RNTL's default test window is 750 wide).
    mockSerieState.loading = false;
    mockSerieState.serie = makeSerie();
    const { getByLabelText, UNSAFE_getAllByType } = render(<SerieScreen />);
    fireEvent.press(getByLabelText(t.seriesDetailChapterMenuLabel));
    // ChapterMenu's card is the only View in the tree whose style carries the measured anchor
    // (an inline { top, right } merged alongside the shared card style array/object).
    const flatStyles = UNSAFE_getAllByType(View).map(n => [].concat(n.props.style).filter(Boolean));
    const anchored = flatStyles.find(styles => styles.some((s: any) => s.top === 124 && s.right === 426));
    expect(anchored).toBeTruthy();
  });

  describe('chapter range modal', () => {
    function openRangeModal() {
      return openChapterMenuAndSelect('range');
    }

    it('opens the range modal from the chapter menu', () => {
      const { getByText } = openRangeModal();
      expect(getByText(t.seriesDetailRangeTitle)).toBeTruthy();
    });

    it('closes the modal via cancel without calling selectRange', () => {
      const { getByText, queryByText } = openRangeModal();
      fireEvent.press(getByText(t.seriesDetailRangeCancel));
      expect(mockSelectRange).not.toHaveBeenCalled();
      expect(queryByText(t.seriesDetailRangeTitle)).toBeNull();
    });

    it('shows the invalid message and does not close when applied with an incomplete range', () => {
      const { getByText, queryByText } = openRangeModal();
      fireEvent.press(getByText(t.seriesDetailRangeApply));
      expect(mockSelectRange).not.toHaveBeenCalled();
      expect(getByText(t.seriesDetailRangeInvalid)).toBeTruthy();
      expect(queryByText(t.seriesDetailRangeTitle)).toBeTruthy();
    });

    it('shows the invalid message when selectRange finds nothing to select', () => {
      mockSelectRange.mockReturnValue(false);
      const { getByText, getAllByDisplayValue } = openRangeModal();
      const [fromInput, toInput] = getAllByDisplayValue('');
      fireEvent.changeText(fromInput, '100');
      fireEvent.changeText(toInput, '200');
      fireEvent.press(getByText(t.seriesDetailRangeApply));
      expect(mockSelectRange).toHaveBeenCalledWith({ from: 100, to: 200 });
      expect(getByText(t.seriesDetailRangeInvalid)).toBeTruthy();
    });

    it('calls selectRange and closes the modal when applied with a valid range', () => {
      mockSelectRange.mockReturnValue(true);
      const { getByText, queryByText, getAllByDisplayValue } = openRangeModal();
      const [fromInput, toInput] = getAllByDisplayValue('');
      fireEvent.changeText(fromInput, '5');
      fireEvent.changeText(toInput, '10');
      fireEvent.press(getByText(t.seriesDetailRangeApply));
      expect(mockSelectRange).toHaveBeenCalledWith({ from: 5, to: 10 });
      expect(queryByText(t.seriesDetailRangeTitle)).toBeNull();
    });
  });
});
