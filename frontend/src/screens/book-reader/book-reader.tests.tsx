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
    fontScale: 1,
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

    expect(getByText('1. Capítulo 1')).toBeTruthy();
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

  it('hides the bars when the hook says so', () => {
    mockBook = book({ overlayVisible: false });
    const { queryByTestId } = render(<BookReaderScreen />);
    expect(queryByTestId('book-reader-top-bar')).toBeNull();
    expect(queryByTestId('book-reader-footer')).toBeNull();
  });
});
