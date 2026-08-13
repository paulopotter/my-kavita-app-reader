import { ReaderBridge } from '../../../shared/bridge/page';
import { fetchPageUrls, invalidatePageCache } from '../PageService';

jest.mock('../../../shared/bridge/page', () => ({
  ReaderBridge: {
    getPageUrls: jest.fn(),
    invalidatePageCache: jest.fn(),
  },
}));

describe('PageService', () => {
  afterEach(() => jest.clearAllMocks());

  it('fetchPageUrls delega para ReaderBridge.getPageUrls', async () => {
    const urls = ['url0', 'url1'];
    (ReaderBridge.getPageUrls as jest.Mock).mockResolvedValue(urls);

    const result = await fetchPageUrls('c1', 2);

    expect(ReaderBridge.getPageUrls).toHaveBeenCalledWith('c1', 2);
    expect(result).toBe(urls);
  });

  it('invalidatePageCache delega para ReaderBridge.invalidatePageCache', async () => {
    await invalidatePageCache('c1');

    expect(ReaderBridge.invalidatePageCache).toHaveBeenCalledWith('c1');
  });
});
