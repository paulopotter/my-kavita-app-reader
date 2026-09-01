import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { ReaderChapter } from '../reader.types';

// Task 029 — Fase 1: ReaderScreen consumes hooks/reader.hooks.ts (ChapterService.getFull). The
// trio (prev/next) is out of scope for Fase 1, so `viewer` only ever carries `curr`.

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: () => ({ params: { seriesId: 's1', chapterId: 'c1', origin: 'LIBRARY' } }),
}));

const mockOnScreenExit = jest.fn().mockResolvedValue(undefined);
const mockToggleOverlay = jest.fn();
const mockScrollToPage = jest.fn();
const mockSetCurrentPage = jest.fn();
const mockOnNativePosition = jest.fn();
const mockHandleScrollToPageHandled = jest.fn();
const mockLoadChapter = jest.fn();
const noop = jest.fn();

let mockReaderState: any;

jest.mock('../hooks/reader.hooks', () => ({ useReader: () => mockReaderState }));

import { ReaderScreen } from '../ReaderScreen';

function makeChapter(overrides: Partial<ReaderChapter> = {}): ReaderChapter {
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
    hasPages: true,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockReaderState = {
    loading: true,
    error: null,
    viewer: null,
    overlayVisible: false,
    currentVisiblePage: 0,
    scrollFraction: 0,
    chapterFraction: 0,
    offline: false,
    scrollToPageRequest: null,
    scrollToChapterId: null,
    isSwitching: false,
    onScreenExit: mockOnScreenExit,
    toggleOverlay: mockToggleOverlay,
    scrollToPage: mockScrollToPage,
    setCurrentPage: mockSetCurrentPage,
    onNativePosition: mockOnNativePosition,
    handleScrollToPageHandled: mockHandleScrollToPageHandled,
    loadChapter: mockLoadChapter,
    goToAdjacent: noop,
  };
});

function withViewer(over: Partial<ReaderChapter> = {}) {
  mockReaderState = {
    ...mockReaderState,
    loading: false,
    viewer: { prev: null, curr: makeChapter(over), next: null },
  };
}

describe('ReaderScreen — loading / error', () => {
  it('mounts without crashing while loading and shows the loading label', () => {
    const { getByText } = render(<ReaderScreen />);
    expect(getByText('Carregando...')).toBeTruthy();
  });

  it('shows the error state (message + retry) instead of a black screen when the chapter failed', () => {
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

describe('ReaderScreen — blocks', () => {
  it('renders a single block for the current chapter (Fase 1: no trio)', () => {
    withViewer();
    const { getByTestId } = render(<ReaderScreen />);
    const blocks = getByTestId('reader-page-list-view').props.blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ chapterId: 'c1', pageUrls: ['url0', 'url1'] });
  });

  it('maps null aspect ratios to 0 for the native side', () => {
    withViewer({ pageAspectRatios: [1.5, null] });
    const { getByTestId } = render(<ReaderScreen />);
    expect(getByTestId('reader-page-list-view').props.blocks[0].pageAspectRatios).toEqual([1.5, 0]);
  });

  it('scrollToChapterId is null when there is no pending scroll request', () => {
    withViewer();
    mockReaderState.scrollToPageRequest = null;
    const { getByTestId } = render(<ReaderScreen />);
    expect(getByTestId('reader-page-list-view').props.scrollToChapterId).toBeNull();
  });

  it('scrollToChapterId/scrollToPageIndex reflect a pending scroll request for a chapter', () => {
    withViewer({ pageUrls: ['u0', 'u1', 'u2'] });
    mockReaderState.scrollToPageRequest = 2;
    mockReaderState.scrollToChapterId = 'c1';
    const { getByTestId } = render(<ReaderScreen />);
    const list = getByTestId('reader-page-list-view');
    expect(list.props.scrollToChapterId).toBe('c1');
    expect(list.props.scrollToPageIndex).toBe(2);
  });

  it('forwards the native position payload verbatim to the hook (no decision in the screen)', () => {
    withViewer();
    const { getByTestId } = render(<ReaderScreen />);
    act(() => {
      getByTestId('reader-page-list-view').props.onVisiblePageChanged({
        nativeEvent: { chapterId: 'c9', pageIndex: 1, pageFraction: 0.4, chapterFraction: 0.1 },
      });
    });
    // chapterId 'c9' is neither curr nor a neighbour — the screen still just forwards it; the hook
    // decides what to do (here: nothing). The point is the screen made no comparison of its own.
    expect(mockOnNativePosition).toHaveBeenCalledWith('c9', 1, 0.4, 0.1);
  });
});

describe('ReaderScreen — SDU firstNode/lastNode', () => {
  it('includes the chapter title in firstNode', () => {
    withViewer({ title: 'A Chegada', number: 1 });
    const { getByTestId } = render(<ReaderScreen />);
    const block = getByTestId('reader-page-list-view').props.blocks[0];
    expect(JSON.stringify(block.firstNode)).toContain('A Chegada');
  });

  it('uses "Capítulo N" in firstNode when the title is just the number', () => {
    withViewer({ title: '1', number: 1 });
    const { getByTestId } = render(<ReaderScreen />);
    const block = getByTestId('reader-page-list-view').props.blocks[0];
    expect(JSON.stringify(block.firstNode)).toContain('Capítulo 1');
  });

  it('lastNode carries the bare chapter number as a bold text node', () => {
    withViewer({ number: 1 });
    const { getByTestId } = render(<ReaderScreen />);
    const block = getByTestId('reader-page-list-view').props.blocks[0];
    const numberNode = block.lastNode.children.find(
      (c: { type: string; text?: string }) => c.type === 'text' && c.text === '1',
    );
    expect(numberNode).toBeDefined();
    expect(numberNode.bold).toBe(true);
  });
});

describe('ReaderScreen — offline banner', () => {
  it('shows the banner when offline', () => {
    withViewer();
    mockReaderState.offline = true;
    const { getByText } = render(<ReaderScreen />);
    expect(getByText('Sem conexão')).toBeTruthy();
  });

  it('hides the banner when online', () => {
    withViewer();
    mockReaderState.offline = false;
    const { queryByText } = render(<ReaderScreen />);
    expect(queryByText('Sem conexão')).toBeNull();
  });
});
