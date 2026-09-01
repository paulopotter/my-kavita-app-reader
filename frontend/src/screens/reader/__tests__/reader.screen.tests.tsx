import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { LoadedChapterEntry, ReaderChapter } from '../reader.types';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: () => ({ params: { seriesId: 's1', chapterId: 'c1', origin: 'LIBRARY' } }),
}));

const mockOnScreenExit = jest.fn().mockResolvedValue(undefined);
const mockToggleOverlay = jest.fn();
const mockScrollToPage = jest.fn();
const mockOnNativePosition = jest.fn();
const mockHandleScrollRequestHandled = jest.fn();
const mockLoadChapter = jest.fn();
const mockGoToAdjacent = jest.fn();

let mockReaderState: any;

jest.mock('../hooks/reader.hooks', () => ({ useReader: () => mockReaderState }));

import { ReaderScreen } from '../reader.screen';

function makeChapter(over: Partial<ReaderChapter> = {}): ReaderChapter {
  return {
    id: 'c1',
    seriesId: 's1',
    number: 1,
    title: 'A Chegada',
    readStatus: 'UNREAD',
    pageCount: 2,
    pagesRead: 0,
    pageUrls: ['url0', 'url1'],
    pageAspectRatios: [1.5, 1.5],
    serverResume: null,
    ...over,
  };
}

function entry(over: Partial<ReaderChapter> = {}, status: LoadedChapterEntry['status'] = 'ready'): LoadedChapterEntry {
  return { chapter: makeChapter(over), status };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockReaderState = {
    loading: true,
    error: null,
    window: null,
    seriesName: 'Série',
    overlayVisible: false,
    currentVisiblePage: 0,
    scrollFraction: 0,
    chapterFraction: 0,
    offline: false,
    scrollRequest: null,
    readingMode: 'webtoon',
    order: [],
    hasPrevChapter: true,
    hasNextChapter: true,
    onScreenExit: mockOnScreenExit,
    toggleOverlay: mockToggleOverlay,
    scrollToPage: mockScrollToPage,
    onNativePosition: mockOnNativePosition,
    handleScrollRequestHandled: mockHandleScrollRequestHandled,
    loadChapter: mockLoadChapter,
    goToAdjacent: mockGoToAdjacent,
  };
});

function withWindow(entries: LoadedChapterEntry[], focusedIndex = 0) {
  mockReaderState = { ...mockReaderState, loading: false, window: { entries, focusedIndex } };
}

describe('ReaderScreen V2 — loading / error', () => {
  it('shows the loading label while there is no window', () => {
    const { getByText } = render(<ReaderScreen />);
    expect(getByText('Carregando...')).toBeTruthy();
  });

  it('shows the error state (message + retry) instead of a black screen', () => {
    mockReaderState = { ...mockReaderState, loading: false, error: 'Chapter not found' };
    const { getByText } = render(<ReaderScreen />);
    expect(getByText('Erro ao carregar o capítulo')).toBeTruthy();
    expect(getByText('Tentar novamente')).toBeTruthy();
  });

  it('retry calls loadChapter with the route chapterId', () => {
    mockReaderState = { ...mockReaderState, loading: false, error: 'boom' };
    const { getByText } = render(<ReaderScreen />);
    fireEvent.press(getByText('Tentar novamente'));
    expect(mockLoadChapter).toHaveBeenCalledWith('c1');
  });

  it('fires onScreenExit on unmount', () => {
    const { unmount } = render(<ReaderScreen />);
    unmount();
    expect(mockOnScreenExit).toHaveBeenCalledTimes(1);
  });
});

describe('ReaderScreen V2 — blocks & forwarding', () => {
  it('renders one native block per window entry', () => {
    withWindow([entry({ id: 'c1' }), entry({ id: 'c2' }, 'placeholder')], 0);
    const { getByTestId } = render(<ReaderScreen />);
    const blocks = getByTestId('reader-page-list-view').props.blocks;
    expect(blocks.map((b: { chapterId: string }) => b.chapterId)).toEqual(['c1', 'c2']);
  });

  it('maps null aspect ratios to 0 for the native side', () => {
    withWindow([entry({ pageAspectRatios: [1.5, null] as (number | null)[] })], 0);
    const { getByTestId } = render(<ReaderScreen />);
    expect(getByTestId('reader-page-list-view').props.blocks[0].pageAspectRatios).toEqual([1.5, 0]);
  });

  it('forwards the native position payload verbatim to the hook (no decision in the screen)', () => {
    withWindow([entry()], 0);
    const { getByTestId } = render(<ReaderScreen />);
    act(() => {
      getByTestId('reader-page-list-view').props.onVisiblePageChanged({
        nativeEvent: { chapterId: 'c9', pageIndex: 1, pageFraction: 0.4, chapterFraction: 0.1 },
      });
    });
    expect(mockOnNativePosition).toHaveBeenCalledWith('c9', 1, 0.4, 0.1);
  });

  it('reflects a pending scroll request', () => {
    withWindow([entry({ pageUrls: ['u0', 'u1', 'u2'] })], 0);
    mockReaderState.scrollRequest = { chapterId: 'c1', page: 2 };
    const { getByTestId } = render(<ReaderScreen />);
    const list = getByTestId('reader-page-list-view');
    expect(list.props.scrollToChapterId).toBe('c1');
    expect(list.props.scrollToPageIndex).toBe(2);
  });

  it('scrollToChapterId is null with no pending request', () => {
    withWindow([entry()], 0);
    const { getByTestId } = render(<ReaderScreen />);
    expect(getByTestId('reader-page-list-view').props.scrollToChapterId).toBeNull();
  });
});

describe('ReaderScreen V2 — overlay wiring', () => {
  it('arrows call goToAdjacent with the right direction', () => {
    withWindow([entry({ id: 'c1' }), entry({ id: 'c2' }), entry({ id: 'c3' })], 1);
    mockReaderState.overlayVisible = true;
    const { getByTestId } = render(<ReaderScreen />);
    fireEvent.press(getByTestId('side-bar-prev'));
    fireEvent.press(getByTestId('side-bar-next'));
    expect(mockGoToAdjacent).toHaveBeenNthCalledWith(1, 'prev');
    expect(mockGoToAdjacent).toHaveBeenNthCalledWith(2, 'next');
  });

  it('the arrows are enabled/disabled from hasPrevChapter / hasNextChapter (series-order based)', () => {
    withWindow([entry({ id: 'c1' })], 0);
    mockReaderState.overlayVisible = true;
    mockReaderState.hasPrevChapter = false; // c1 is the first chapter of the series
    mockReaderState.hasNextChapter = true;
    const { getByTestId } = render(<ReaderScreen />);
    fireEvent.press(getByTestId('side-bar-prev'));
    expect(mockGoToAdjacent).not.toHaveBeenCalled(); // disabled
    fireEvent.press(getByTestId('side-bar-next'));
    expect(mockGoToAdjacent).toHaveBeenCalledWith('next');
  });

  it('shows the offline banner when offline', () => {
    withWindow([entry()], 0);
    mockReaderState.offline = true;
    const { getByText } = render(<ReaderScreen />);
    expect(getByText('Sem conexão')).toBeTruthy();
  });
});

describe('ReaderScreen V2 — placeholder focus', () => {
  it('shows a spinner over the reading area when the focused chapter has no pages yet', () => {
    withWindow([entry({ id: 'c1' }, 'placeholder')], 0);
    const { UNSAFE_getAllByType } = render(<ReaderScreen />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getAllByType(ActivityIndicator).length).toBeGreaterThan(0);
  });

  it('does NOT show the page-loading spinner when the focused chapter is ready', () => {
    withWindow([entry({ id: 'c1' }, 'ready')], 0);
    const { UNSAFE_queryAllByType } = render(<ReaderScreen />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_queryAllByType(ActivityIndicator).length).toBe(0);
  });
});
