jest.mock('./modes', () => ({
  PersistentMode: {
    get: jest.fn(),
    put: jest.fn(),
    invalidate: jest.fn(),
    invalidateDomain: jest.fn(),
    invalidateVariant: jest.fn(),
    purgeExpired: jest.fn(),
    purgeOlderThan: jest.fn(),
  },
  MemoryMode: {
    get: jest.fn(),
    put: jest.fn(),
    invalidate: jest.fn(),
    invalidateDomain: jest.fn(),
    invalidateVariant: jest.fn(),
    purgeExpired: jest.fn(),
    purgeOlderThan: jest.fn(),
  },
  NetworkMode: {
    run: jest.fn(),
    invalidate: jest.fn(),
    purgeExpired: jest.fn(),
    purgeOlderThan: jest.fn(),
  },
}));

import { CacheManager } from './cache.manager';
import { MemoryMode, PersistentMode } from './modes';

const mockPersistentGet = PersistentMode.get as jest.Mock;
const mockPersistentPut = PersistentMode.put as jest.Mock;
const mockPersistentInvalidate = PersistentMode.invalidate as jest.Mock;
const mockPersistentInvalidateDomain = PersistentMode.invalidateDomain as jest.Mock;
const mockPersistentInvalidateVariant = PersistentMode.invalidateVariant as jest.Mock;
const mockPersistentPurgeExpired = PersistentMode.purgeExpired as jest.Mock;
const mockPersistentPurgeOlderThan = PersistentMode.purgeOlderThan as jest.Mock;

const mockMemoryGet = MemoryMode.get as jest.Mock;
const mockMemoryPurgeExpired = MemoryMode.purgeExpired as jest.Mock;

describe('CacheManager root hub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mode dispatch, defaulting to PERSISTENT', () => {
    it('get routes to PersistentMode when mode is omitted', async () => {
      mockPersistentGet.mockResolvedValue(null);
      await CacheManager.get({ key: 'c1' });
      expect(mockPersistentGet).toHaveBeenCalledWith({ key: 'c1' });
      expect(mockMemoryGet).not.toHaveBeenCalled();
    });

    it('get routes to MemoryMode when mode is MEMORY', async () => {
      mockMemoryGet.mockResolvedValue(null);
      await CacheManager.get({ key: 'c1', mode: 'MEMORY' });
      expect(mockMemoryGet).toHaveBeenCalledWith({ key: 'c1', mode: 'MEMORY' });
      expect(mockPersistentGet).not.toHaveBeenCalled();
    });

    it('get routes to MemoryMode when mode is MEMORY_KOTLIN', async () => {
      mockMemoryGet.mockResolvedValue(null);
      await CacheManager.get({ key: 'c1', mode: 'MEMORY_KOTLIN' });
      expect(mockMemoryGet).toHaveBeenCalledWith({ key: 'c1', mode: 'MEMORY_KOTLIN' });
      expect(mockPersistentGet).not.toHaveBeenCalled();
    });

    it('put routes to PersistentMode by default', async () => {
      mockPersistentPut.mockResolvedValue({});
      await CacheManager.put({ key: 'c1', value: '{}', domain: 'page' });
      expect(mockPersistentPut).toHaveBeenCalledWith({ key: 'c1', value: '{}', domain: 'page' });
    });

    it('invalidate routes to PersistentMode by default', async () => {
      mockPersistentInvalidate.mockResolvedValue(undefined);
      await CacheManager.invalidate({ key: 'c1' });
      expect(mockPersistentInvalidate).toHaveBeenCalledWith({ key: 'c1' });
    });

    it('invalidateDomain routes to PersistentMode by default', async () => {
      mockPersistentInvalidateDomain.mockResolvedValue(undefined);
      await CacheManager.invalidateDomain({ domain: 'page' });
      expect(mockPersistentInvalidateDomain).toHaveBeenCalledWith({ domain: 'page' });
    });

    it('invalidateVariant routes to PersistentMode by default', async () => {
      mockPersistentInvalidateVariant.mockResolvedValue(undefined);
      await CacheManager.invalidateVariant({ domain: 'series', variant: 'full' });
      expect(mockPersistentInvalidateVariant).toHaveBeenCalledWith({ domain: 'series', variant: 'full' });
    });

    it('purgeExpired routes to PersistentMode when called with no arguments', async () => {
      mockPersistentPurgeExpired.mockResolvedValue(undefined);
      await CacheManager.purgeExpired();
      expect(mockPersistentPurgeExpired).toHaveBeenCalledWith({});
    });

    it('purgeExpired routes to MemoryMode when mode is MEMORY', async () => {
      mockMemoryPurgeExpired.mockResolvedValue(undefined);
      await CacheManager.purgeExpired({ mode: 'MEMORY' });
      expect(mockMemoryPurgeExpired).toHaveBeenCalledWith({ mode: 'MEMORY' });
    });

    it('purgeOlderThan routes to PersistentMode by default', async () => {
      mockPersistentPurgeOlderThan.mockResolvedValue(undefined);
      await CacheManager.purgeOlderThan({ cutoffEpochMs: 123 });
      expect(mockPersistentPurgeOlderThan).toHaveBeenCalledWith({ cutoffEpochMs: 123 });
    });
  });

  describe('args?.mode guard (a caller bypassing TypeScript, e.g. plain JS or `any`)', () => {
    it('get defaults to PersistentMode when args is undefined', () => {
      mockPersistentGet.mockResolvedValue(null);
      CacheManager.get(undefined as any);
      expect(mockPersistentGet).toHaveBeenCalledWith(undefined);
    });

    it('put defaults to PersistentMode when args is undefined', () => {
      mockPersistentPut.mockResolvedValue({});
      CacheManager.put(undefined as any);
      expect(mockPersistentPut).toHaveBeenCalledWith(undefined);
    });

    it('invalidate defaults to PersistentMode when args is undefined', () => {
      mockPersistentInvalidate.mockResolvedValue(undefined);
      CacheManager.invalidate(undefined as any);
      expect(mockPersistentInvalidate).toHaveBeenCalledWith(undefined);
    });

    it('invalidateDomain defaults to PersistentMode when args is undefined', () => {
      mockPersistentInvalidateDomain.mockResolvedValue(undefined);
      CacheManager.invalidateDomain(undefined as any);
      expect(mockPersistentInvalidateDomain).toHaveBeenCalledWith(undefined);
    });

    it('invalidateVariant defaults to PersistentMode when args is undefined', () => {
      mockPersistentInvalidateVariant.mockResolvedValue(undefined);
      CacheManager.invalidateVariant(undefined as any);
      expect(mockPersistentInvalidateVariant).toHaveBeenCalledWith(undefined);
    });

    it('purgeOlderThan defaults to PersistentMode when args is undefined', () => {
      mockPersistentPurgeOlderThan.mockResolvedValue(undefined);
      CacheManager.purgeOlderThan(undefined as any);
      expect(mockPersistentPurgeOlderThan).toHaveBeenCalledWith(undefined);
    });

    it('purgeExpired defaults to PersistentMode when explicitly called with undefined', () => {
      mockPersistentPurgeExpired.mockResolvedValue(undefined);
      CacheManager.purgeExpired(undefined as any);
      expect(mockPersistentPurgeExpired).toHaveBeenCalledWith({});
    });
  });

  describe('exposed namespaces', () => {
    it('exposes persistent as the same PersistentMode namespace', () => {
      expect(CacheManager.persistent).toBe(PersistentMode);
    });

    it('exposes memory as the same MemoryMode namespace', () => {
      expect(CacheManager.memory).toBe(MemoryMode);
    });

    it('exposes network with a run method', () => {
      expect(typeof CacheManager.network.run).toBe('function');
    });
  });
});
