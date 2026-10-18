import { BookService } from './books.services';

jest.mock('../../bridge/server', () => ({
  ServerBridge: {
    getBookInfo: jest.fn(),
    getBookPage: jest.fn(),
    getBookToc: jest.fn(),
  },
}));

import { ServerBridge } from '../../bridge/server';

const mockGetBookInfo = ServerBridge.getBookInfo as jest.Mock;
const mockGetBookPage = ServerBridge.getBookPage as jest.Mock;
const mockGetBookToc = ServerBridge.getBookToc as jest.Mock;

describe('BookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('info asks the bridge for the chapter and returns what it answered', async () => {
    mockGetBookInfo.mockResolvedValue({ title: 'Capítulo 1', pageCount: 1 });
    await expect(BookService.info({ chapterId: '70814' })).resolves.toEqual({ title: 'Capítulo 1', pageCount: 1 });
    expect(mockGetBookInfo).toHaveBeenCalledWith('70814');
  });

  it('page asks for that chapter page and returns the HTML untouched', async () => {
    mockGetBookPage.mockResolvedValue('<p>Olá</p>');
    await expect(BookService.page({ chapterId: '70814', page: 2 })).resolves.toBe('<p>Olá</p>');
    expect(mockGetBookPage).toHaveBeenCalledWith('70814', 2);
  });

  it('toc returns the nested table of contents', async () => {
    const toc = [{ title: 'Obra', page: 0, children: [{ title: 'Capítulo 1', page: 0, children: [] }] }];
    mockGetBookToc.mockResolvedValue(toc);
    await expect(BookService.toc({ chapterId: '70814' })).resolves.toEqual(toc);
    expect(mockGetBookToc).toHaveBeenCalledWith('70814');
  });

  it('a rejection from the bridge reaches the caller (provider without the capability)', async () => {
    mockGetBookPage.mockRejectedValue(new Error('does not support reading books'));
    await expect(BookService.page({ chapterId: '1', page: 0 })).rejects.toThrow('does not support reading books');
  });

  describe('bound', () => {
    it('fixes the chapterId and still hits the bridge on every call', async () => {
      mockGetBookPage.mockResolvedValue('<p>x</p>');
      const book = BookService.bound({ chapterId: '70814' });

      await book.page({ page: 1 });
      await book.page({ page: 2 });

      expect(mockGetBookPage).toHaveBeenNthCalledWith(1, '70814', 1);
      expect(mockGetBookPage).toHaveBeenNthCalledWith(2, '70814', 2);
    });
  });
});
