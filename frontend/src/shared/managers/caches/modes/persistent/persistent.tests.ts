import { PersistentMode } from './persistent.mode';

jest.mock('../../../../bridge/cache', () => ({
  CacheBridge: {
    persistentGet: jest.fn(),
    persistentPut: jest.fn(),
    persistentInvalidate: jest.fn(),
    persistentInvalidateDomain: jest.fn(),
    persistentInvalidateVariant: jest.fn(),
    persistentPurgeExpired: jest.fn(),
    persistentPurgeOlderThan: jest.fn(),
  },
}));

import { CacheBridge } from '../../../../bridge/cache';

const mockGet = CacheBridge.persistentGet as jest.Mock;
const mockPut = CacheBridge.persistentPut as jest.Mock;
const mockInvalidate = CacheBridge.persistentInvalidate as jest.Mock;
const mockInvalidateDomain = CacheBridge.persistentInvalidateDomain as jest.Mock;
const mockInvalidateVariant = CacheBridge.persistentInvalidateVariant as jest.Mock;
const mockPurgeExpired = CacheBridge.persistentPurgeExpired as jest.Mock;
const mockPurgeOlderThan = CacheBridge.persistentPurgeOlderThan as jest.Mock;

describe('PersistentMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('get forwards key/variant to CacheBridge.persistentGet, defaulting variant to ""', async () => {
    mockGet.mockResolvedValue(null);
    await PersistentMode.get({ key: 'c1:0' });
    expect(mockGet).toHaveBeenCalledWith({ key: 'c1:0', variant: '' });
  });

  it('get returns exactly what the bridge resolved', async () => {
    const entry = { value: '{}', cachedAtEpochMs: 1, ttlMs: 2, isExpired: false };
    mockGet.mockResolvedValue(entry);
    const result = await PersistentMode.get({ key: 'c1:0', variant: 'full' });
    expect(mockGet).toHaveBeenCalledWith({ key: 'c1:0', variant: 'full' });
    expect(result).toBe(entry);
  });

  it('put forwards every field to CacheBridge.persistentPut, defaulting variant to ""', async () => {
    const descriptor = { key: 'c1', variant: '', domain: 'page', mode: 'PERSISTENT', cachedAtEpochMs: 1, expiresAtEpochMs: 2 };
    mockPut.mockResolvedValue(descriptor);
    const result = await PersistentMode.put({ key: 'c1', value: '{}', domain: 'page', ttlMs: 1000 });
    expect(mockPut).toHaveBeenCalledWith({ key: 'c1', value: '{}', domain: 'page', variant: '', ttlMs: 1000 });
    expect(result).toBe(descriptor);
  });

  it('put forwards an explicit variant instead of defaulting it', async () => {
    mockPut.mockResolvedValue({});
    await PersistentMode.put({ key: 's1', value: '{}', domain: 'series', variant: 'full:external', ttlMs: 1000 });
    expect(mockPut).toHaveBeenCalledWith({ key: 's1', value: '{}', domain: 'series', variant: 'full:external', ttlMs: 1000 });
  });

  it('invalidate forwards key/variant, defaulting variant to ""', async () => {
    mockInvalidate.mockResolvedValue(undefined);
    await PersistentMode.invalidate({ key: 'c1' });
    expect(mockInvalidate).toHaveBeenCalledWith({ key: 'c1', variant: '' });
  });

  it('invalidate forwards an explicit variant instead of defaulting it', async () => {
    mockInvalidate.mockResolvedValue(undefined);
    await PersistentMode.invalidate({ key: 'c1', variant: 'full' });
    expect(mockInvalidate).toHaveBeenCalledWith({ key: 'c1', variant: 'full' });
  });

  it('invalidateDomain forwards domain', async () => {
    mockInvalidateDomain.mockResolvedValue(undefined);
    await PersistentMode.invalidateDomain({ domain: 'page' });
    expect(mockInvalidateDomain).toHaveBeenCalledWith({ domain: 'page' });
  });

  it('invalidateVariant forwards domain/variant', async () => {
    mockInvalidateVariant.mockResolvedValue(undefined);
    await PersistentMode.invalidateVariant({ domain: 'series', variant: 'full:external' });
    expect(mockInvalidateVariant).toHaveBeenCalledWith({ domain: 'series', variant: 'full:external' });
  });

  it('purgeExpired calls CacheBridge.persistentPurgeExpired with no arguments', async () => {
    mockPurgeExpired.mockResolvedValue(undefined);
    await PersistentMode.purgeExpired();
    expect(mockPurgeExpired).toHaveBeenCalledWith();
  });

  it('purgeOlderThan forwards cutoffEpochMs', async () => {
    mockPurgeOlderThan.mockResolvedValue(undefined);
    await PersistentMode.purgeOlderThan({ cutoffEpochMs: 12345 });
    expect(mockPurgeOlderThan).toHaveBeenCalledWith({ cutoffEpochMs: 12345 });
  });

  describe('Methods.requireArgs guard (a caller bypassing TypeScript, e.g. plain JS or `any`)', () => {
    it('get throws instead of reaching the bridge when args is undefined', () => {
      expect(() => PersistentMode.get(undefined as any)).toThrow('CacheManager.persistent.get requires { key }, got no arguments');
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('put throws naming every missing required field', () => {
      expect(() => PersistentMode.put({ key: 'c1' } as any)).toThrow(
        'CacheManager.persistent.put is missing required field(s): value, domain',
      );
      expect(mockPut).not.toHaveBeenCalled();
    });

    it('invalidateDomain throws when domain is missing', () => {
      expect(() => PersistentMode.invalidateDomain({} as any)).toThrow(
        'CacheManager.persistent.invalidateDomain is missing required field(s): domain',
      );
    });

    it('invalidateVariant throws when variant is missing', () => {
      expect(() => PersistentMode.invalidateVariant({ domain: 'page' } as any)).toThrow(
        'CacheManager.persistent.invalidateVariant is missing required field(s): variant',
      );
    });

    it('purgeOlderThan throws when cutoffEpochMs is missing', () => {
      expect(() => PersistentMode.purgeOlderThan({} as any)).toThrow(
        'CacheManager.persistent.purgeOlderThan is missing required field(s): cutoffEpochMs',
      );
    });
  });
});
