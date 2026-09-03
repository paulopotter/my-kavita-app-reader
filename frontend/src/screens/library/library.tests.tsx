import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../shared/i18n/strings';
import type { LibraryEntry } from './library.types';

const t = getStrings('pt-BR');

const mockNavigate = jest.fn();
let mockRouteParams: { mode?: string } = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: mockRouteParams }),
}));

const mockToggleFollow = jest.fn();
jest.mock('../../shared/tools/series', () => {
  const actual = jest.requireActual('../../shared/tools/series');
  return { ...actual, SerieTool: { ...actual.SerieTool, toggleFollow: (...a: unknown[]) => mockToggleFollow(...a) } };
});

import type { LibraryBannerState } from './hooks';

const mockHookState: {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  bannerState: LibraryBannerState;
  data: LibraryEntry[];
  paddedData: (LibraryEntry | null)[];
  viewMode: 'GRID' | 'LIST';
  sortMode: 'RECENTLY_UPDATED' | 'ALPHABETICAL';
  alphabetIndex: Map<string, number>;
  showScrollTop: boolean;
} = {
  loading: false,
  refreshing: false,
  error: null,
  bannerState: { kind: 'none' },
  data: [],
  paddedData: [],
  viewMode: 'GRID',
  sortMode: 'RECENTLY_UPDATED',
  alphabetIndex: new Map(),
  showScrollTop: false,
};
const mockRefresh = jest.fn();
const mockToggleSortMode = jest.fn();
const mockToggleViewMode = jest.fn();
const mockHandleScroll = jest.fn();
const mockHideScrollTop = jest.fn();

jest.mock('./hooks', () => ({
  useLibrary: () => ({
    ...mockHookState,
    refresh: mockRefresh,
    toggleSortMode: mockToggleSortMode,
    toggleViewMode: mockToggleViewMode,
    handleScroll: mockHandleScroll,
    hideScrollTop: mockHideScrollTop,
  }),
}));

jest.mock('../../shared/i18n/i18n.hooks', () => ({ useStrings: () => require('../../shared/i18n/strings').getStrings('pt-BR') }));

import { LibraryScreen } from './library.screen';

function entry(over: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    id: 's1',
    name: 'Alpha',
    coverUrl: 'c1',
    progressFraction: 0.5,
    readStatus: 'IN_PROGRESS',
    isFollowed: false,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = {};
  Object.assign(mockHookState, {
    loading: false,
    refreshing: false,
    error: null,
    bannerState: { kind: 'none' },
    data: [],
    paddedData: [],
    viewMode: 'GRID',
    sortMode: 'RECENTLY_UPDATED',
    alphabetIndex: new Map(),
    showScrollTop: false,
  });
});

describe('LibraryScreen', () => {
  it('shows the loading state', () => {
    mockHookState.loading = true;
    const { getByText } = render(<LibraryScreen />);
    expect(getByText(t.libraryLoading)).toBeTruthy();
  });

  it('shows the error state with a retry that calls refresh', () => {
    mockHookState.error = 'boom';
    const { getByText } = render(<LibraryScreen />);
    expect(getByText(t.libraryError)).toBeTruthy();
    expect(getByText('boom')).toBeTruthy();
    fireEvent.press(getByText(t.libraryRetry));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('shows the library empty state by default', () => {
    const { getByText } = render(<LibraryScreen />);
    expect(getByText(t.libraryEmpty)).toBeTruthy();
  });

  it('shows the following empty state when route param mode=following', () => {
    mockRouteParams = { mode: 'following' };
    const { getByText } = render(<LibraryScreen />);
    expect(getByText(t.followingEmpty)).toBeTruthy();
  });

  it('renders grid cards and forwards press → navigate', () => {
    const e = entry({ id: 's7', name: 'Bravo' });
    mockHookState.data = [e];
    mockHookState.paddedData = [e, null];
    const { getByText } = render(<LibraryScreen />);
    expect(getByText('Bravo')).toBeTruthy();
    expect(getByText(`1 ${t.librarySeriesCount}`)).toBeTruthy();
    fireEvent.press(getByText('Bravo'));
    expect(mockNavigate).toHaveBeenCalledWith('series/:seriesId', { seriesId: 's7', origin: 'LIBRARY' });
  });

  it('forwards origin=FOLLOWING when route param mode=following', () => {
    mockRouteParams = { mode: 'following' };
    const e = entry({ id: 's7', name: 'Bravo' });
    mockHookState.data = [e];
    mockHookState.paddedData = [e, null];
    const { getByText } = render(<LibraryScreen />);
    fireEvent.press(getByText('Bravo'));
    expect(mockNavigate).toHaveBeenCalledWith('series/:seriesId', { seriesId: 's7', origin: 'FOLLOWING' });
  });

  it('renders the freshness banner from bannerState (stale → relative "Atualizado há ...")', () => {
    const e = entry();
    mockHookState.data = [e];
    mockHookState.paddedData = [e, null];
    mockHookState.bannerState = { kind: 'stale', sinceEpochMs: Date.now() - 20 * 60 * 1000 };
    const { getByText } = render(<LibraryScreen />);
    expect(getByText(/^Atualizado há \d+ minuto\(s\)$/)).toBeTruthy();
  });

  it('renders the confirmed banner (absolute time) from bannerState', () => {
    const e = entry();
    mockHookState.data = [e];
    mockHookState.paddedData = [e, null];
    mockHookState.bannerState = { kind: 'confirmed', atEpochMs: new Date(2026, 0, 1, 14, 30, 51).getTime() };
    const { getByText } = render(<LibraryScreen />);
    expect(getByText('Atualizado às 14:30:51')).toBeTruthy();
  });

  it('renders no banner when bannerState is "none"', () => {
    const e = entry();
    mockHookState.data = [e];
    mockHookState.paddedData = [e, null];
    const { queryByText } = render(<LibraryScreen />);
    expect(queryByText(/^Atualizado há/)).toBeNull();
    expect(queryByText(/^Atualizado às/)).toBeNull();
  });

  it('renders list rows in LIST mode with chapter-count and downloaded labels', () => {
    const e = entry({ readChapters: 3, chapterCount: 12, downloadedChapters: 10, totalChapters: 40 });
    mockHookState.viewMode = 'LIST';
    mockHookState.data = [e];
    mockHookState.paddedData = [e];
    const { getByText } = render(<LibraryScreen />);
    expect(getByText(`3/12 ${t.chaptersFormat}`)).toBeTruthy();
    expect(getByText(`10/40 ${t.chaptersFormat}`)).toBeTruthy();
  });

  it('renders publication + errors badges on the card', () => {
    const e = entry({ publicationStatus: 'ONGOING', hasErrors: true });
    mockHookState.data = [e];
    mockHookState.paddedData = [e, null];
    const { getByText } = render(<LibraryScreen />);
    expect(getByText(t.publicationOngoing)).toBeTruthy();
    expect(getByText(t.hasErrors)).toBeTruthy();
  });

  it('the sort and view toggles call the hook', () => {
    const e = entry();
    mockHookState.data = [e];
    mockHookState.paddedData = [e, null];
    const { getByText } = render(<LibraryScreen />);
    fireEvent.press(getByText(t.librarySortRecentlyUpdated));
    expect(mockToggleSortMode).toHaveBeenCalled();
    fireEvent.press(getByText('☰'));
    expect(mockToggleViewMode).toHaveBeenCalled();
  });

  it('renders the alphabet rail in LIST + ALPHABETICAL', () => {
    const a = entry({ id: 'a', name: 'Ada' });
    const b = entry({ id: 'b', name: 'Bob' });
    mockHookState.viewMode = 'LIST';
    mockHookState.sortMode = 'ALPHABETICAL';
    mockHookState.data = [a, b];
    mockHookState.paddedData = [a, b];
    mockHookState.alphabetIndex = new Map([
      ['A', 0],
      ['B', 1],
    ]);
    const { getByText } = render(<LibraryScreen />);
    expect(getByText('A')).toBeTruthy();
    expect(getByText('B')).toBeTruthy();
  });

  it('tapping an alphabet letter jumps the list, and a failed jump does not crash (onScrollToIndexFailed)', () => {
    const a = entry({ id: 'a', name: 'Ada' });
    const z = entry({ id: 'z', name: 'Zed' });
    mockHookState.viewMode = 'LIST';
    mockHookState.sortMode = 'ALPHABETICAL';
    mockHookState.data = [a, z];
    mockHookState.paddedData = [a, z];
    mockHookState.alphabetIndex = new Map([
      ['A', 0],
      ['Z', 1],
    ]);
    const { getByText, UNSAFE_getByType } = render(<LibraryScreen />);
    const FlatList = require('react-native').FlatList;
    const list = UNSAFE_getByType(FlatList);

    // The rail is wired to scrollToIndex; the FlatList must carry the failure fallback so an
    // offscreen index never throws the "Invariant Violation" that crashed the app on device.
    expect(typeof list.props.onScrollToIndexFailed).toBe('function');
    expect(() =>
      list.props.onScrollToIndexFailed({ index: 1, averageItemLength: 80, highestMeasuredFrameIndex: 0 }),
    ).not.toThrow();
    // Tapping a letter still fires the jump.
    fireEvent.press(getByText('Z'));
  });

  it('the card star fires SerieTool.toggleFollow', () => {
    const e = entry({ id: 's3' });
    mockHookState.data = [e];
    mockHookState.paddedData = [e, null];
    const { UNSAFE_getAllByType } = render(<LibraryScreen />);
    const { TouchableOpacity } = require('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    // topBar has 2 touchables (sort, view); then the card, then its star.
    fireEvent.press(touchables[touchables.length - 1]);
    expect(mockToggleFollow).toHaveBeenCalledWith({ seriesId: 's3' });
  });
});
