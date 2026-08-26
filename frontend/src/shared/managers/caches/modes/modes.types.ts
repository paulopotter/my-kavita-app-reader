import type { CacheDescriptorBridge, CacheEntryBridge } from '../../../bridge/cache';
import type {
  CacheManagerGetArgs,
  CacheManagerInvalidateArgs,
  CacheManagerInvalidateDomainArgs,
  CacheManagerInvalidateVariantArgs,
  CacheManagerPurgeExpiredArgs,
  CacheManagerPurgeOlderThanArgs,
  CacheManagerPutArgs,
} from '../cache.types';

// The shape every value-store mode (persistent, memory.local, memory.external) implements — lets
// the root/memory hubs resolve "which implementation handles this mode" via a plain lookup object
// instead of a repeated if/switch per method. NETWORK doesn't implement this — its contract is
// structurally different (run/invalidate/purge, no get/put — see network.mode.ts).
export interface CacheManagerModeHandler {
  get(args: CacheManagerGetArgs): Promise<CacheEntryBridge | null>;
  put(args: CacheManagerPutArgs): Promise<CacheDescriptorBridge>;
  invalidate(args: CacheManagerInvalidateArgs): Promise<void>;
  invalidateDomain(args: CacheManagerInvalidateDomainArgs): Promise<void>;
  invalidateVariant(args: CacheManagerInvalidateVariantArgs): Promise<void>;
  purgeExpired(args?: CacheManagerPurgeExpiredArgs): Promise<void>;
  purgeOlderThan(args: CacheManagerPurgeOlderThanArgs): Promise<void>;
}
