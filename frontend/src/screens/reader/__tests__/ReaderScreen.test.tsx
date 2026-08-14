import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { Chapter } from '../../../shared/bridge/series';

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
const mockSetCurrentPage = jest.fn();
const mockAdvanceToNextChapter = jest.fn();
const mockRetreatToPrevChapter = jest.fn();

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
    scrollFraction: 0,
    offline: false,
    isAdvancing: false,
    onScreenExit: mockOnScreenExit,
    toggleOverlay: mockToggleOverlay,
    scrollToPage: mockScrollToPage,
    goToPrevChapterManual: mockGoToPrevChapterManual,
    goToNextChapterManual: mockGoToNextChapterManual,
    setCurrentPage: mockSetCurrentPage,
    advanceToNextChapter: mockAdvanceToNextChapter,
    retreatToPrevChapter: mockRetreatToPrevChapter,
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

  it('renderiza um bloco com as páginas do capítulo atual quando o viewer está pronto', async () => {
    const chapter = makeChapter();
    mockReaderState = {
      ...mockReaderState,
      loading: false,
      viewer: { prev: null, curr: { chapter, pages: ['url0', 'url1'] }, next: null },
    };

    const { getByTestId } = render(<ReaderScreen />);

    await waitFor(() => expect(getByTestId('reader-page-list-view')).toBeTruthy());
    const blocks = getByTestId('reader-page-list-view').props.blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ chapterId: 'c1', pageUrls: ['url0', 'url1'] });
  });

  it('inclui um segundo bloco com as páginas do próximo capítulo quando ele já foi carregado', async () => {
    const chapter = makeChapter();
    const nextChapter = makeChapter({ id: 'c2', number: '2' });
    mockReaderState = {
      ...mockReaderState,
      loading: false,
      viewer: {
        prev: null,
        curr: { chapter, pages: ['url0', 'url1'] },
        next: { chapter: nextChapter, pages: ['url2'] },
      },
    };

    const { getByTestId } = render(<ReaderScreen />);

    const blocks = getByTestId('reader-page-list-view').props.blocks;
    expect(blocks).toHaveLength(2);
    expect(blocks[1]).toMatchObject({ chapterId: 'c2', pageUrls: ['url2'] });
  });

  it('atualiza a posicao de leitura quando a view nativa reporta a pagina visivel do capitulo atual', async () => {
    const chapter = makeChapter({ pageCount: 1 });
    mockReaderState = {
      ...mockReaderState,
      loading: false,
      viewer: { prev: null, curr: { chapter, pages: ['url0'] }, next: null },
    };

    const { getByTestId } = render(<ReaderScreen />);
    const nativeList = getByTestId('reader-page-list-view');

    act(() => {
      nativeList.props.onVisiblePageChanged({ nativeEvent: { chapterId: 'c1', pageIndex: 0 } });
    });

    await waitFor(() => expect(mockSetCurrentPage).toHaveBeenCalledWith(0, 0));
  });

  it('avanca para o proximo capitulo quando a view nativa reporta uma pagina do capitulo seguinte', async () => {
    const chapter = makeChapter();
    const nextChapter = makeChapter({ id: 'c2', number: '2' });
    mockReaderState = {
      ...mockReaderState,
      loading: false,
      viewer: {
        prev: null,
        curr: { chapter, pages: ['url0'] },
        next: { chapter: nextChapter, pages: ['url1'] },
      },
    };

    const { getByTestId } = render(<ReaderScreen />);
    const nativeList = getByTestId('reader-page-list-view');

    act(() => {
      nativeList.props.onVisiblePageChanged({ nativeEvent: { chapterId: 'c2', pageIndex: 0 } });
    });

    await waitFor(() => expect(mockAdvanceToNextChapter).toHaveBeenCalledTimes(1));
    expect(mockSetCurrentPage).not.toHaveBeenCalled();
  });

  it('retrocede para o capitulo anterior quando a view nativa reporta uma pagina do capitulo anterior', async () => {
    const chapter = makeChapter();
    const prevChapter = makeChapter({ id: 'c0', number: '0' });
    mockReaderState = {
      ...mockReaderState,
      loading: false,
      viewer: {
        prev: { chapter: prevChapter, pages: ['url_prev'] },
        curr: { chapter, pages: ['url0'] },
        next: null,
      },
    };

    const { getByTestId } = render(<ReaderScreen />);
    const nativeList = getByTestId('reader-page-list-view');

    act(() => {
      nativeList.props.onVisiblePageChanged({ nativeEvent: { chapterId: 'c0', pageIndex: 0 } });
    });

    await waitFor(() => expect(mockRetreatToPrevChapter).toHaveBeenCalledTimes(1));
  });
});
