import { MemoryMode } from './memory.mode';

jest.mock('../../../../bridge/cache', () => ({
  CacheBridge: {
    memoryKotlinGet: jest.fn(),
    memoryKotlinPut: jest.fn(),
    memoryKotlinInvalidate: jest.fn(),
    memoryKotlinInvalidateDomain: jest.fn(),
    memoryKotlinInvalidateVariant: jest.fn(),
    memoryKotlinPurgeExpired: jest.fn(),
    memoryKotlinPurgeOlderThan: jest.fn(),
  },
}));

import { CacheBridge } from '../../../../bridge/cache';

const mockGet = CacheBridge.memoryKotlinGet as jest.Mock;
const mockPut = CacheBridge.memoryKotlinPut as jest.Mock;
const mockInvalidate = CacheBridge.memoryKotlinInvalidate as jest.Mock;
const mockInvalidateDomain = CacheBridge.memoryKotlinInvalidateDomain as jest.Mock;
const mockInvalidateVariant = CacheBridge.memoryKotlinInvalidateVariant as jest.Mock;
const mockPurgeExpired = CacheBridge.memoryKotlinPurgeExpired as jest.Mock;
const mockPurgeOlderThan = CacheBridge.memoryKotlinPurgeOlderThan as jest.Mock;

const NOT_IMPLEMENTED_LOCAL = 'CacheManager.memory.local is not implemented yet — no RN-only in-memory cache exists.';

describe('MemoryMode.external (MEMORY_KOTLIN bridge)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('get forwards key/variant to CacheBridge.memoryKotlinGet, defaulting variant to ""', async () => {
    mockGet.mockResolvedValue(null);
    await MemoryMode.external.get({ key: 'c1:0' });
    expect(mockGet).toHaveBeenCalledWith({ key: 'c1:0', variant: '' });
  });

  it('get forwards an explicit variant instead of defaulting it', async () => {
    mockGet.mockResolvedValue(null);
    await MemoryMode.external.get({ key: 'c1:0', variant: 'full' });
    expect(mockGet).toHaveBeenCalledWith({ key: 'c1:0', variant: 'full' });
  });

  it('put forwards every field, defaulting variant to ""', async () => {
    const descriptor = { key: 'c1', variant: '', domain: 'page', mode: 'MEMORY_KOTLIN', cachedAtEpochMs: 1, expiresAtEpochMs: 2 };
    mockPut.mockResolvedValue(descriptor);
    const result = await MemoryMode.external.put({ key: 'c1', value: '{}', domain: 'page' });
    expect(mockPut).toHaveBeenCalledWith({ key: 'c1', value: '{}', domain: 'page', variant: '', ttlMs: undefined });
    expect(result).toBe(descriptor);
  });

  it('put forwards an explicit variant instead of defaulting it', async () => {
    mockPut.mockResolvedValue({});
    await MemoryMode.external.put({ key: 's1', value: '{}', domain: 'series', variant: 'full:external' });
    expect(mockPut).toHaveBeenCalledWith({ key: 's1', value: '{}', domain: 'series', variant: 'full:external', ttlMs: undefined });
  });

  it('invalidate forwards key/variant, defaulting variant to ""', async () => {
    mockInvalidate.mockResolvedValue(undefined);
    await MemoryMode.external.invalidate({ key: 'c1' });
    expect(mockInvalidate).toHaveBeenCalledWith({ key: 'c1', variant: '' });
  });

  it('invalidate forwards an explicit variant instead of defaulting it', async () => {
    mockInvalidate.mockResolvedValue(undefined);
    await MemoryMode.external.invalidate({ key: 'c1', variant: 'full' });
    expect(mockInvalidate).toHaveBeenCalledWith({ key: 'c1', variant: 'full' });
  });

  it('invalidateDomain forwards domain', async () => {
    mockInvalidateDomain.mockResolvedValue(undefined);
    await MemoryMode.external.invalidateDomain({ domain: 'page' });
    expect(mockInvalidateDomain).toHaveBeenCalledWith({ domain: 'page' });
  });

  it('invalidateVariant forwards domain/variant', async () => {
    mockInvalidateVariant.mockResolvedValue(undefined);
    await MemoryMode.external.invalidateVariant({ domain: 'series', variant: 'full' });
    expect(mockInvalidateVariant).toHaveBeenCalledWith({ domain: 'series', variant: 'full' });
  });

  it('purgeExpired calls CacheBridge.memoryKotlinPurgeExpired with no arguments', async () => {
    mockPurgeExpired.mockResolvedValue(undefined);
    await MemoryMode.external.purgeExpired();
    expect(mockPurgeExpired).toHaveBeenCalledWith();
  });

  it('purgeOlderThan forwards cutoffEpochMs', async () => {
    mockPurgeOlderThan.mockResolvedValue(undefined);
    await MemoryMode.external.purgeOlderThan({ cutoffEpochMs: 999 });
    expect(mockPurgeOlderThan).toHaveBeenCalledWith({ cutoffEpochMs: 999 });
  });

  describe('Methods.requireArgs guard (a caller bypassing TypeScript, e.g. plain JS or `any`)', () => {
    it('get throws instead of reaching the bridge when args is undefined', () => {
      expect(() => MemoryMode.external.get(undefined as any)).toThrow(
        'CacheManager.memory.external.get requires { key }, got no arguments',
      );
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('put throws naming every missing required field', () => {
      expect(() => MemoryMode.external.put({ key: 'c1' } as any)).toThrow(
        'CacheManager.memory.external.put is missing required field(s): value, domain',
      );
    });
  });
});

describe('MemoryMode.local (RN-only, not implemented yet)', () => {
  it('get throws not-implemented', async () => {
    await expect(MemoryMode.local.get({ key: 'c1' })).rejects.toThrow(NOT_IMPLEMENTED_LOCAL);
  });

  it('put throws not-implemented', async () => {
    await expect(MemoryMode.local.put({ key: 'c1', value: '{}', domain: 'page' })).rejects.toThrow(NOT_IMPLEMENTED_LOCAL);
  });

  it('invalidate throws not-implemented', async () => {
    await expect(MemoryMode.local.invalidate({ key: 'c1' })).rejects.toThrow(NOT_IMPLEMENTED_LOCAL);
  });

  it('invalidateDomain throws not-implemented', async () => {
    await expect(MemoryMode.local.invalidateDomain({ domain: 'page' })).rejects.toThrow(NOT_IMPLEMENTED_LOCAL);
  });

  it('invalidateVariant throws not-implemented', async () => {
    await expect(MemoryMode.local.invalidateVariant({ domain: 'page', variant: 'full' })).rejects.toThrow(NOT_IMPLEMENTED_LOCAL);
  });

  it('purgeExpired throws not-implemented', async () => {
    await expect(MemoryMode.local.purgeExpired()).rejects.toThrow(NOT_IMPLEMENTED_LOCAL);
  });

  it('purgeOlderThan throws not-implemented', async () => {
    await expect(MemoryMode.local.purgeOlderThan({ cutoffEpochMs: 1 })).rejects.toThrow(NOT_IMPLEMENTED_LOCAL);
  });
});

describe('MemoryMode hub (mode dispatch between local/external)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('get defaults to .local (throws) when mode is omitted', async () => {
    await expect(MemoryMode.get({ key: 'c1' })).rejects.toThrow(NOT_IMPLEMENTED_LOCAL);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('get routes to .external when mode is MEMORY_KOTLIN', async () => {
    mockGet.mockResolvedValue(null);
    await MemoryMode.get({ key: 'c1', mode: 'MEMORY_KOTLIN' });
    expect(mockGet).toHaveBeenCalledWith({ key: 'c1', variant: '' });
  });

  it('put routes to .external when mode is MEMORY_KOTLIN', async () => {
    mockPut.mockResolvedValue({});
    await MemoryMode.put({ key: 'c1', value: '{}', domain: 'page', mode: 'MEMORY_KOTLIN' });
    expect(mockPut).toHaveBeenCalled();
  });

  it('invalidate routes to .external when mode is MEMORY_KOTLIN', async () => {
    mockInvalidate.mockResolvedValue(undefined);
    await MemoryMode.invalidate({ key: 'c1', mode: 'MEMORY_KOTLIN' });
    expect(mockInvalidate).toHaveBeenCalled();
  });

  it('invalidateDomain routes to .external when mode is MEMORY_KOTLIN', async () => {
    mockInvalidateDomain.mockResolvedValue(undefined);
    await MemoryMode.invalidateDomain({ domain: 'page', mode: 'MEMORY_KOTLIN' });
    expect(mockInvalidateDomain).toHaveBeenCalled();
  });

  it('invalidateVariant routes to .external when mode is MEMORY_KOTLIN', async () => {
    mockInvalidateVariant.mockResolvedValue(undefined);
    await MemoryMode.invalidateVariant({ domain: 'page', variant: 'full', mode: 'MEMORY_KOTLIN' });
    expect(mockInvalidateVariant).toHaveBeenCalled();
  });

  it('purgeExpired routes to .external when mode is MEMORY_KOTLIN', async () => {
    mockPurgeExpired.mockResolvedValue(undefined);
    await MemoryMode.purgeExpired({ mode: 'MEMORY_KOTLIN' });
    expect(mockPurgeExpired).toHaveBeenCalled();
  });

  it('purgeExpired defaults to .local (throws) when mode is omitted', async () => {
    await expect(MemoryMode.purgeExpired()).rejects.toThrow(NOT_IMPLEMENTED_LOCAL);
  });

  it('purgeOlderThan routes to .external when mode is MEMORY_KOTLIN', async () => {
    mockPurgeOlderThan.mockResolvedValue(undefined);
    await MemoryMode.purgeOlderThan({ cutoffEpochMs: 1, mode: 'MEMORY_KOTLIN' });
    expect(mockPurgeOlderThan).toHaveBeenCalled();
  });

  it('get defaults to .local (throws) when called with undefined instead of args', async () => {
    await expect(MemoryMode.get(undefined as any)).rejects.toThrow(NOT_IMPLEMENTED_LOCAL);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('purgeExpired defaults to .local (throws) when explicitly called with undefined', async () => {
    await expect(MemoryMode.purgeExpired(undefined as any)).rejects.toThrow(NOT_IMPLEMENTED_LOCAL);
    expect(mockPurgeExpired).not.toHaveBeenCalled();
  });

  it('put defaults to .local (throws) when called with undefined instead of args', async () => {
    await expect(MemoryMode.put(undefined as any)).rejects.toThrow(NOT_IMPLEMENTED_LOCAL);
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('invalidate defaults to .local (throws) when called with undefined instead of args', async () => {
    await expect(MemoryMode.invalidate(undefined as any)).rejects.toThrow(NOT_IMPLEMENTED_LOCAL);
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('invalidateDomain defaults to .local (throws) when called with undefined instead of args', async () => {
    await expect(MemoryMode.invalidateDomain(undefined as any)).rejects.toThrow(NOT_IMPLEMENTED_LOCAL);
    expect(mockInvalidateDomain).not.toHaveBeenCalled();
  });

  it('invalidateVariant defaults to .local (throws) when called with undefined instead of args', async () => {
    await expect(MemoryMode.invalidateVariant(undefined as any)).rejects.toThrow(NOT_IMPLEMENTED_LOCAL);
    expect(mockInvalidateVariant).not.toHaveBeenCalled();
  });

  it('purgeOlderThan defaults to .local (throws) when called with undefined instead of args', async () => {
    await expect(MemoryMode.purgeOlderThan(undefined as any)).rejects.toThrow(NOT_IMPLEMENTED_LOCAL);
    expect(mockPurgeOlderThan).not.toHaveBeenCalled();
  });
});
