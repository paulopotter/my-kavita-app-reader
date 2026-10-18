import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('../../shared/i18n', () => ({
  useStrings: () => require('../../shared/i18n/strings').getStrings('en'),
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { seriesId: 's1', chapterId: 'c1', seriesName: 'Leveling' } }),
}));

const mockRealize = jest.fn();
jest.mock('../../shared/tools/actions', () => ({
  useAction: () => ({ realize: (action: unknown) => () => mockRealize(action) }),
}));

// The WebView is native: a stand-in that keeps the props the screen hands it.
let mockWebViewProps: Record<string, unknown> = {};
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return {
    WebView: (props: Record<string, unknown>) => {
      mockWebViewProps = props;
      return <View testID="book-reader-webview" />;
    },
  };
});

let mockBook: Record<string, unknown>;
jest.mock('../../shared/tools/reader', () => ({
  ReaderPrefs: { getProgressBarPosition: () => Promise.resolve('top') },
}));

jest.mock('./hooks', () => ({
  useBookReader: () => mockBook,
}));

import { BookReaderScreen } from './book-reader.screen';

function book(over: Record<string, unknown> = {}) {
  return {
    seriesName: 'Leveling',
    chapterId: 'c1',
    chapterTitle: '1. Capítulo 1',
    status: 'ready',
    html: '<p>Olá</p>',
    pageIndex: 0,
    pageCount: 1,
    pageIndicator: undefined,
    restoreFraction: 0.25,
    chapterFraction: 0.5,
    appearance: { theme: 'app', fontScale: 1, fontFamily: 'serif', lineSpacing: 1.6, margin: 'medium', justify: false },
    overlayVisible: true,
    hasPrevChapter: true,
    hasNextChapter: true,
    hasPrevPage: false,
    hasNextPage: false,
    backAction: { kind: 'back' },
    handleMessage: jest.fn(),
    nextPage: jest.fn(),
    prevPage: jest.fn(),
    goToNextChapter: jest.fn(),
    goToPrevChapter: jest.fn(),
    changeFontScale: jest.fn(),
    updateAppearance: jest.fn(),
    retry: jest.fn(),
    ...over,
  };
}

describe('BookReaderScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWebViewProps = {};
    mockBook = book();
  });

  it('shows the page in a locked-down WebView, themed and sized from the hook', () => {
    const { getByTestId } = render(<BookReaderScreen />);

    expect(getByTestId('book-reader-webview')).toBeTruthy();
    const html = (mockWebViewProps.source as { html: string }).html;
    expect(html).toContain('<p>Olá</p>');
    expect(html).toContain('var restore = 0.25;');
    expect(html).toContain("default-src 'none'");
    expect(mockWebViewProps.javaScriptEnabled).toBe(true);
    expect(mockWebViewProps.domStorageEnabled).toBe(false);
    expect(mockWebViewProps.allowFileAccess).toBe(false);
  });

  it('forwards what the page reports to the hook, untouched', () => {
    render(<BookReaderScreen />);
    (mockWebViewProps.onMessage as (e: unknown) => void)({ nativeEvent: { data: '{"type":"tap"}' } });
    expect(mockBook.handleMessage).toHaveBeenCalledWith('{"type":"tap"}');
  });

  it('shows a spinner and no WebView while loading', () => {
    mockBook = book({ status: 'loading' });
    const { queryByTestId, getByText } = render(<BookReaderScreen />);
    expect(queryByTestId('book-reader-webview')).toBeNull();
    expect(getByText('Loading chapter…')).toBeTruthy();
  });

  it('shows the error with a retry that calls the hook', () => {
    mockBook = book({ status: 'error' });
    const { getByText, queryByTestId } = render(<BookReaderScreen />);
    expect(queryByTestId('book-reader-webview')).toBeNull();
    expect(getByText('Could not open this chapter')).toBeTruthy();

    fireEvent.press(getByText('Try again'));
    expect(mockBook.retry).toHaveBeenCalledTimes(1);
  });

  it('wires the bars to the hook', () => {
    mockBook = book({ pageCount: 3, hasNextPage: true, pageIndicator: 'Page 1 of 3' });
    const { getByText, getByLabelText } = render(<BookReaderScreen />);

    expect(getByText('Leveling')).toBeTruthy();
    expect(getByText('Page 1 of 3')).toBeTruthy();
    fireEvent.press(getByLabelText('Next chapter'));
    fireEvent.press(getByLabelText('Next page'));
    fireEvent.press(getByLabelText('Larger text'));
    fireEvent.press(getByLabelText('Smaller text'));

    expect(mockBook.goToNextChapter).toHaveBeenCalledTimes(1);
    expect(mockBook.nextPage).toHaveBeenCalledTimes(1);
    expect(mockBook.changeFontScale).toHaveBeenCalledWith('larger');
    expect(mockBook.changeFontScale).toHaveBeenCalledWith('smaller');
  });

  it('goes back through the hook\'s back action', () => {
    const { getByLabelText } = render(<BookReaderScreen />);
    fireEvent.press(getByLabelText('Back'));
    expect(mockRealize).toHaveBeenCalledWith({ kind: 'back' });
  });

  it('draws the thin progress bar while the bars are closed, and not while they are open', async () => {
    mockBook = book({ overlayVisible: false });
    const closed = render(<BookReaderScreen />);
    expect(await closed.findByTestId('thin-progress-fill')).toBeTruthy();
    closed.unmount();

    mockBook = book({ overlayVisible: true });
    const open = render(<BookReaderScreen />);
    expect(open.queryByTestId('thin-progress-fill')).toBeNull();
  });

  it('has no progress bar while the chapter is not ready', () => {
    mockBook = book({ overlayVisible: false, status: 'loading' });
    const { queryByTestId } = render(<BookReaderScreen />);
    expect(queryByTestId('thin-progress-fill')).toBeNull();
  });

  it('hides the bars when the hook says so', () => {
    mockBook = book({ overlayVisible: false });
    const { queryByTestId } = render(<BookReaderScreen />);
    expect(queryByTestId('book-reader-top-bar')).toBeNull();
    expect(queryByTestId('book-reader-footer')).toBeNull();
  });

  describe('appearance', () => {
    it('paints the page with the reading theme the reader chose', () => {
      mockBook = book({ appearance: { theme: 'sepia', fontScale: 1, fontFamily: 'serif', lineSpacing: 1.6, margin: 'medium', justify: false } });
      render(<BookReaderScreen />);
      const html = (mockWebViewProps.source as { html: string }).html;
      expect(html).toContain('html { background: #F3EAD3; color: #2E2417;');
    });

    it('follows the app theme when the reader chose that', () => {
      render(<BookReaderScreen />);
      const html = (mockWebViewProps.source as { html: string }).html;
      expect(html).not.toContain('#F3EAD3');
      expect(html).toMatch(/html \{ background: #[0-9a-f]{6}; color: #[0-9a-f]{6};/i);
    });

    it('hands the font, spacing and margin to the document', () => {
      mockBook = book({ appearance: { theme: 'app', fontScale: 1.3, fontFamily: 'sans', lineSpacing: 1.8, margin: 'wide', justify: true } });
      render(<BookReaderScreen />);
      const html = (mockWebViewProps.source as { html: string }).html;
      expect(html).toContain("'Roboto', 'Noto Sans', sans-serif !important; line-height: 1.8 !important;");
      expect(html).toContain('padding: 20px 36px 120px');
      expect(html).toContain('font-size: 23.4px');
      expect(html).toContain('text-align: justify');
    });

    it('opens the appearance sheet from the footer and reports a choice to the hook', () => {
      const { getByLabelText, queryByText, getByText } = render(<BookReaderScreen />);
      expect(queryByText('Appearance')).toBeNull();

      fireEvent.press(getByLabelText('Appearance'));
      expect(getByText('Theme')).toBeTruthy();

      fireEvent.press(getByLabelText('Night'));
      expect(mockBook.updateAppearance).toHaveBeenCalledWith('theme', 'night');
    });

    it('closes the sheet', () => {
      const { getByLabelText, getByText, queryByText } = render(<BookReaderScreen />);
      fireEvent.press(getByLabelText('Appearance'));
      fireEvent.press(getByText('Close'));
      // A closed Modal renders nothing.
      expect(queryByText('Theme')).toBeNull();
    });
  });
});

