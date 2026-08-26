// Shared arg/mode types for CacheManager and every modes/ implementation (persistent, memory,
// network). Kept separate from cache.manager.ts so modes/ files can import just the types without
// importing the manager itself. The contract each mode implements (CacheManagerModeHandler) lives
// in modes/modes.types.ts instead — it describes the modes, not the cache domain itself.

// PERSISTENT/MEMORY_KOTLIN/MEMORY only — the three backends with a value-store contract
// (get/put/invalidate/...). NETWORK has a structurally different contract (run/invalidate/purge,
// no get/put — see modes/network.mode.ts) so it's never a value of this type.
export type CacheManagerMode = 'PERSISTENT' | 'MEMORY_KOTLIN' | 'MEMORY';

// Every CacheManager method mirrors CacheStore's own shape (:cache, Kotlin) — key/variant for
// get/invalidate, domain added for put/invalidateDomain, etc. `mode` is read by the root hub
// (cache.manager.ts) and the memory hub (modes/memory.mode.ts) only; whichever implementation ends
// up handling the call ignores it — callers never need to strip it out before forwarding the
// whole args object onward.
export interface CacheManagerGetArgs { key: string; variant?: string; mode?: CacheManagerMode }
export interface CacheManagerPutArgs {
  key: string;
  value: string;
  domain: string;
  variant?: string;
  ttlMs?: number;
  mode?: CacheManagerMode;
}
export interface CacheManagerInvalidateArgs { key: string; variant?: string; mode?: CacheManagerMode }
export interface CacheManagerInvalidateDomainArgs { domain: string; mode?: CacheManagerMode }
export interface CacheManagerInvalidateVariantArgs { domain: string; variant: string; mode?: CacheManagerMode }
export interface CacheManagerPurgeExpiredArgs { mode?: CacheManagerMode }
export interface CacheManagerPurgeOlderThanArgs { cutoffEpochMs: number; mode?: CacheManagerMode }
