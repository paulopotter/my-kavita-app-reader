import { CacheBridge, type CacheDescriptorBridge, type CacheEntryBridge } from '../../../../bridge';
import { Methods } from '../../../../tools/methods';
import type {
  CacheManagerGetArgs,
  CacheManagerInvalidateArgs,
  CacheManagerInvalidateDomainArgs,
  CacheManagerInvalidateVariantArgs,
  CacheManagerPurgeOlderThanArgs,
  CacheManagerPutArgs,
} from '../../cache.types';
import type { CacheManagerModeHandler } from '../modes.types';

// PERSISTENT — bridge → Cache.persistent (Kotlin, Room-backed). Passthrough today, kept as method
// shorthand on the exported object so logic can be added later per method without restructuring
// the namespace. Methods.requireArgs guards against a caller reaching this from plain JS, an
// `any`, or a `// @ts-ignore`'d call — TypeScript's own required fields only protect
// compile-time callers.
export const PersistentMode: CacheManagerModeHandler = {
  get(args: CacheManagerGetArgs): Promise<CacheEntryBridge | null> {
    Methods.requireArgs(args, 'CacheManager.persistent.get', ['key']);
    return CacheBridge.persistentGet({ key: args.key, variant: args.variant ?? '' });
  },

  put(args: CacheManagerPutArgs): Promise<CacheDescriptorBridge> {
    Methods.requireArgs(args, 'CacheManager.persistent.put', ['key', 'value', 'domain']);
    return CacheBridge.persistentPut({
      key: args.key,
      value: args.value,
      domain: args.domain,
      variant: args.variant ?? '',
      ttlMs: args.ttlMs,
    });
  },

  invalidate(args: CacheManagerInvalidateArgs): Promise<void> {
    Methods.requireArgs(args, 'CacheManager.persistent.invalidate', ['key']);
    return CacheBridge.persistentInvalidate({ key: args.key, variant: args.variant ?? '' });
  },

  invalidateDomain(args: CacheManagerInvalidateDomainArgs): Promise<void> {
    Methods.requireArgs(args, 'CacheManager.persistent.invalidateDomain', ['domain']);
    return CacheBridge.persistentInvalidateDomain({ domain: args.domain });
  },

  invalidateVariant(args: CacheManagerInvalidateVariantArgs): Promise<void> {
    Methods.requireArgs(args, 'CacheManager.persistent.invalidateVariant', ['domain', 'variant']);
    return CacheBridge.persistentInvalidateVariant({ domain: args.domain, variant: args.variant });
  },

  purgeExpired(): Promise<void> {
    return CacheBridge.persistentPurgeExpired();
  },

  purgeOlderThan(args: CacheManagerPurgeOlderThanArgs): Promise<void> {
    Methods.requireArgs(args, 'CacheManager.persistent.purgeOlderThan', ['cutoffEpochMs']);
    return CacheBridge.persistentPurgeOlderThan({ cutoffEpochMs: args.cutoffEpochMs });
  },
};
