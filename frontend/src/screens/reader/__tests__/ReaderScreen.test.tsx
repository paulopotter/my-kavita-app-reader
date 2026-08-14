import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Chapter } from '../../../shared/bridge/series';

jest.mock('@shopify/flash-list', () => {
  const ActualFlashList = jest.requireActual('@shopify/flash-list').FlashList;
  class MockFlashList extends ActualFlashList {
    componentDidMount() {
      super.componentDidMount();
      this.rlvRef?._scrollComponent?._scrollViewRef?.props.onLayout({
        nativeEvent: { layout: { height: 900, width: 400 } },
      });
    }
  }
  return {
    ...jest.requireActual('@shopify/flash-list'),
    FlashList: MockFlashList,
    AnimatedFlashList: MockFlashList,
  };
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn().mockReturnValue(true);
const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
    reset: mockReset,
    navigate: mockNavigate,
  }),
  useRoute: () => ({ params: { seriesId: 's1', chapterId: 'c1', origin: 'LIBRARY' } }),
}));

const mockOnScreenExit = jest.fn().mockResolvedValue(undefined);
const mockToggleOverlay = jest.fn();
const mockScrollToPage = jest.fn();
const mockGoToPrevChapterManual = jest.fn();
const mockGoToNextChapterManual = jest.fn();
const mockHandleScroll = jest.fn();
const mockHandleScrollEndDrag = jest.fn();
const mockHandleScrollToPageHandled = jest.fn();

function makeChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: 'c1',
    seriesId: 's1',
    title: 'A Chegada',
    number: '1',
    pageCount: 2,
    sortOrder: 1,
    readStatus: 'UNREAD',
    pagesRead: 0,
    updatedAtLocalMs: null,
    ...overrides,
  };
}

let mockReaderState: any;

jest.mock('../useReader', () => ({
  useReader: () => mockReaderState,
}));

import { ReaderScreen } from '../ReaderScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack.mockReturnValue(true);
  mockReaderState = {
    loading: true,
    error: null,
    viewer: null,
    overlayVisible: false,
    currentVisiblePage: 0,
    scrollToPageRequest: null,
    scrollFraction: 0,
    offline: false,
    isAdvancing: false,
    onScreenExit: mockOnScreenExit,
    toggleOverlay: mockToggleOverlay,
    scrollToPage: mockScrollToPage,
    goToPrevChapterManual: mockGoToPrevChapterManual,
    goToNextChapterManual: mockGoToNextChapterManual,
    handleScroll: mockHandleScroll,
    handleScrollEndDrag: mockHandleScrollEndDrag,
    handleScrollToPageHandled: mockHandleScrollToPageHandled,
  };
});

describe('ReaderScreen', () => {
  it('monta sem crash com viewer inicial vazio (loading)', () => {
    expect(() => render(<ReaderScreen />)).not.toThrow();
  });

  it('dispara onScreenExit no unmount', () => {
    const { unmount } = render(<ReaderScreen />);

    unmount();

    expect(mockOnScreenExit).toHaveBeenCalledTimes(1);
  });

  it('renderiza a lista de páginas quando o viewer está pronto', async () => {
    const chapter = makeChapter();
    mockReaderState = {
      ...mockReaderState,
      loading: false,
      viewer: { prev: null, curr: { chapter, pages: ['url0', 'url1'] }, next: null },
    };

    const { getByTestId } = render(<ReaderScreen />);

    await waitFor(() => expect(getByTestId('chapter-header-root')).toBeTruthy());
  });

  it('rola até a página solicitada e sinaliza o pedido como atendido', async () => {
    const chapter = makeChapter();
    mockReaderState = {
      ...mockReaderState,
      loading: false,
      viewer: { prev: null, curr: { chapter, pages: ['url0', 'url1'] }, next: null },
      scrollToPageRequest: 1,
    };

    render(<ReaderScreen />);

    await waitFor(() => expect(mockHandleScrollToPageHandled).toHaveBeenCalledTimes(1));
  });
});
