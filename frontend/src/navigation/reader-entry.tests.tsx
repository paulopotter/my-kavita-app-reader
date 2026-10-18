import React from 'react';
import { render, renderHook, waitFor } from '@testing-library/react-native';

const mockChapterGet = jest.fn();
jest.mock('../shared/services/chapters', () => ({
  ChapterService: { get: (...a: unknown[]) => mockChapterGet(...a) },
}));

let mockParams: Record<string, unknown> = {};
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: mockParams }),
}));

jest.mock('../screens/book-reader', () => ({
  BookReaderScreen: () => {
    const { Text: T } = require('react-native');
    return <T>BOOK READER</T>;
  },
}));
jest.mock('../screens/reader', () => ({
  ReaderScreen: () => {
    const { Text: T } = require('react-native');
    return <T>IMAGE READER</T>;
  },
}));

import { readerKindOf, useReaderKind } from './reader-entry.hooks';
import { ReaderEntry } from './ReaderEntry';

const ok = (fileFormat?: string) => ({ isSuccess: true, pages: { fileFormat } });

describe('readerKindOf', () => {
  it('is book for epub and images for anything else', () => {
    expect(readerKindOf('epub')).toBe('book');
    expect(readerKindOf('archive')).toBe('images');
    expect(readerKindOf('image')).toBe('images');
    expect(readerKindOf('pdf')).toBe('images');
    expect(readerKindOf(undefined)).toBe('images');
    expect(readerKindOf(null)).toBe('images');
  });
});

describe('useReaderKind', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the hint and asks nothing', () => {
    const { result } = renderHook(() => useReaderKind({ seriesId: 's', chapterId: 'c', hint: 'epub' }));
    expect(result.current).toBe('book');
    expect(mockChapterGet).not.toHaveBeenCalled();
  });

  it('is loading until the chapter has been asked, then reads its format', async () => {
    mockChapterGet.mockResolvedValue(ok('epub'));
    const { result } = renderHook(() => useReaderKind({ seriesId: 's', chapterId: 'c' }));
    expect(result.current).toBe('loading');

    await waitFor(() => expect(result.current).toBe('book'));
    expect(mockChapterGet).toHaveBeenCalledWith({ seriesId: 's', chapterId: 'c' });
  });

  it('opens the image reader for a chapter that is not a book', async () => {
    mockChapterGet.mockResolvedValue(ok('archive'));
    const { result } = renderHook(() => useReaderKind({ seriesId: 's', chapterId: 'c' }));
    await waitFor(() => expect(result.current).toBe('images'));
  });

  it('falls back to the image reader when the digest failed or the call rejected', async () => {
    mockChapterGet.mockResolvedValueOnce({ isSuccess: false });
    const failed = renderHook(() => useReaderKind({ seriesId: 's', chapterId: 'c' }));
    await waitFor(() => expect(failed.result.current).toBe('images'));

    mockChapterGet.mockRejectedValueOnce(new Error('x'));
    const rejected = renderHook(() => useReaderKind({ seriesId: 's', chapterId: 'c2' }));
    await waitFor(() => expect(rejected.result.current).toBe('images'));
  });

  it('asks again for another chapter', async () => {
    mockChapterGet.mockResolvedValueOnce(ok('epub')).mockResolvedValueOnce(ok('archive'));
    const { result, rerender } = renderHook(
      (props: { chapterId: string }) => useReaderKind({ seriesId: 's', chapterId: props.chapterId }),
      { initialProps: { chapterId: 'c1' } },
    );
    await waitFor(() => expect(result.current).toBe('book'));

    rerender({ chapterId: 'c2' });
    await waitFor(() => expect(result.current).toBe('images'));
  });
});

describe('ReaderEntry', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mounts neither reader until the format is known', () => {
    mockParams = { seriesId: 's', chapterId: 'c' };
    mockChapterGet.mockReturnValue(new Promise(() => {}));
    const { getByTestId, queryByText } = render(<ReaderEntry />);
    expect(getByTestId('reader-entry-loading')).toBeTruthy();
    expect(queryByText('BOOK READER')).toBeNull();
    expect(queryByText('IMAGE READER')).toBeNull();
  });

  it('opens the book reader for an epub', async () => {
    mockParams = { seriesId: 's', chapterId: 'c' };
    mockChapterGet.mockResolvedValue(ok('epub'));
    const { findByText } = render(<ReaderEntry />);
    expect(await findByText('BOOK READER')).toBeTruthy();
  });

  it('opens the image reader for everything else', async () => {
    mockParams = { seriesId: 's', chapterId: 'c' };
    mockChapterGet.mockResolvedValue(ok('archive'));
    const { findByText } = render(<ReaderEntry />);
    expect(await findByText('IMAGE READER')).toBeTruthy();
  });

  it('opens straight from the hint, without asking', () => {
    mockParams = { seriesId: 's', chapterId: 'c', format: 'epub' };
    const { getByText } = render(<ReaderEntry />);
    expect(getByText('BOOK READER')).toBeTruthy();
    expect(mockChapterGet).not.toHaveBeenCalled();
  });

  it('does not crash without route params', async () => {
    mockParams = undefined as unknown as Record<string, unknown>;
    mockChapterGet.mockResolvedValue({ isSuccess: false });
    const { findByText } = render(<ReaderEntry />);
    expect(await findByText('IMAGE READER')).toBeTruthy();
  });
});
