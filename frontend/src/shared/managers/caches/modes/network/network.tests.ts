import { NetworkMode } from './network.mode';

const NOT_IMPLEMENTED_NETWORK =
  'CacheManager.network is not implemented yet — Cache.network has no RN bridge (its `block` parameter cannot cross into Kotlin).';

describe('NetworkMode (no RN bridge yet)', () => {
  it('run throws not-implemented', async () => {
    await expect(NetworkMode.run()).rejects.toThrow(NOT_IMPLEMENTED_NETWORK);
  });

  it('invalidate throws not-implemented', async () => {
    await expect(NetworkMode.invalidate()).rejects.toThrow(NOT_IMPLEMENTED_NETWORK);
  });

  it('purgeExpired throws not-implemented', async () => {
    await expect(NetworkMode.purgeExpired()).rejects.toThrow(NOT_IMPLEMENTED_NETWORK);
  });

  it('purgeOlderThan throws not-implemented', async () => {
    await expect(NetworkMode.purgeOlderThan()).rejects.toThrow(NOT_IMPLEMENTED_NETWORK);
  });
});
