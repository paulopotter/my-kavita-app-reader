import { CacheBridge, type CacheDescriptorBridge, type CacheEntryBridge } from '../../../../bridge/cache';
import { Methods } from '../../../../tools/methods';
import type {
  CacheManagerGetArgs,
  CacheManagerInvalidateArgs,
  CacheManagerInvalidateDomainArgs,
  CacheManagerInvalidateVariantArgs,
  CacheManagerPurgeExpiredArgs,
  CacheManagerPurgeOlderThanArgs,
  CacheManagerPutArgs,
} from '../../cache.types';
import type { CacheManagerModeHandler } from '../modes.types';

// MEMORY_KOTLIN (.external) — bridge → Cache.memoryKotlin (Kotlin, in-process Map). Passthrough
// today, same "leave room to grow" reasoning as PersistentMode. Methods.requireArgs guards
// against a caller reaching this from plain JS, an `any`, or a `// @ts-ignore`'d call —
// TypeScript's own required fields only protect compile-time callers.
const External: CacheManagerModeHandler = {
  get(args: CacheManagerGetArgs): Promise<CacheEntryBridge | null> {
    Methods.requireArgs(args, 'CacheManager.memory.external.get', ['key']);
    return CacheBridge.memoryKotlinGet({ key: args.key, variant: args.variant ?? '' });
  },

  put(args: CacheManagerPutArgs): Promise<CacheDescriptorBridge> {
    Methods.requireArgs(args, 'CacheManager.memory.external.put', ['key', 'value', 'domain']);
    return CacheBridge.memoryKotlinPut({
      key: args.key,
      value: args.value,
      domain: args.domain,
      variant: args.variant ?? '',
      ttlMs: args.ttlMs,
    });
  },

  invalidate(args: CacheManagerInvalidateArgs): Promise<void> {
    Methods.requireArgs(args, 'CacheManager.memory.external.invalidate', ['key']);
    return CacheBridge.memoryKotlinInvalidate({ key: args.key, variant: args.variant ?? '' });
  },

  invalidateDomain(args: CacheManagerInvalidateDomainArgs): Promise<void> {
    Methods.requireArgs(args, 'CacheManager.memory.external.invalidateDomain', ['domain']);
    return CacheBridge.memoryKotlinInvalidateDomain({ domain: args.domain });
  },

  invalidateVariant(args: CacheManagerInvalidateVariantArgs): Promise<void> {
    Methods.requireArgs(args, 'CacheManager.memory.external.invalidateVariant', ['domain', 'variant']);
    return CacheBridge.memoryKotlinInvalidateVariant({ domain: args.domain, variant: args.variant });
  },

  purgeExpired(): Promise<void> {
    return CacheBridge.memoryKotlinPurgeExpired();
  },

  purgeOlderThan(args: CacheManagerPurgeOlderThanArgs): Promise<void> {
    Methods.requireArgs(args, 'CacheManager.memory.external.purgeOlderThan', ['cutoffEpochMs']);
    return CacheBridge.memoryKotlinPurgeOlderThan({ cutoffEpochMs: args.cutoffEpochMs });
  },
};

// MEMORY (.local) — RN-only in-memory cache (mirrors MEMORY_KOTLIN but living in JS), never
// touching the bridge. Not built yet — no real consumer needs a JS-side cache today (see
// architecture.md's "Deliberately deferred"). Every method throws instead of silently no-op'ing,
// so an accidental call fails loudly instead of behaving like an always-empty cache. Methods are
// async so the throw becomes a rejected Promise (matching the Promise<T> signature every other
// mode honors) instead of an immediate synchronous throw — a caller doing `await x().catch(...)`
// works the same way here as it would against a real implementation.
const NOT_IMPLEMENTED_LOCAL = 'CacheManager.memory.local is not implemented yet — no RN-only in-memory cache exists.';

const Local: CacheManagerModeHandler = {
  async get(): Promise<CacheEntryBridge | null> {
    throw new Error(NOT_IMPLEMENTED_LOCAL);
  },
  async put(): Promise<CacheDescriptorBridge> {
    throw new Error(NOT_IMPLEMENTED_LOCAL);
  },
  async invalidate(): Promise<void> {
    throw new Error(NOT_IMPLEMENTED_LOCAL);
  },
  async invalidateDomain(): Promise<void> {
    throw new Error(NOT_IMPLEMENTED_LOCAL);
  },
  async invalidateVariant(): Promise<void> {
    throw new Error(NOT_IMPLEMENTED_LOCAL);
  },
  async purgeExpired(): Promise<void> {
    throw new Error(NOT_IMPLEMENTED_LOCAL);
  },
  async purgeOlderThan(): Promise<void> {
    throw new Error(NOT_IMPLEMENTED_LOCAL);
  },
};

// memory hub — same mode-dispatch shape as the root hub (cache.manager.ts), scoped to the two
// in-memory backends only (MEMORY → local, MEMORY_KOTLIN → external). Defaults to MEMORY (the
// RN-only backend) when `mode` is omitted — a caller reaching MemoryMode.get(...) directly already
// chose "in-memory" over PERSISTENT, so MEMORY_KOTLIN must be requested explicitly. `args?.mode`
// (not `args.mode`) guards a caller that bypassed TypeScript and passed `undefined` — same
// reasoning as cache.manager.ts's own Cache object.
export const MemoryMode: CacheManagerModeHandler & { local: CacheManagerModeHandler; external: CacheManagerModeHandler } = {
  get(args: CacheManagerGetArgs): Promise<CacheEntryBridge | null> {
    return (args?.mode === 'MEMORY_KOTLIN' ? External.get : Local.get)(args);
  },
  put(args: CacheManagerPutArgs): Promise<CacheDescriptorBridge> {
    return (args?.mode === 'MEMORY_KOTLIN' ? External.put : Local.put)(args);
  },
  invalidate(args: CacheManagerInvalidateArgs): Promise<void> {
    return (args?.mode === 'MEMORY_KOTLIN' ? External.invalidate : Local.invalidate)(args);
  },
  invalidateDomain(args: CacheManagerInvalidateDomainArgs): Promise<void> {
    return (args?.mode === 'MEMORY_KOTLIN' ? External.invalidateDomain : Local.invalidateDomain)(args);
  },
  invalidateVariant(args: CacheManagerInvalidateVariantArgs): Promise<void> {
    return (args?.mode === 'MEMORY_KOTLIN' ? External.invalidateVariant : Local.invalidateVariant)(args);
  },
  purgeExpired(args: CacheManagerPurgeExpiredArgs = {}): Promise<void> {
    return (args?.mode === 'MEMORY_KOTLIN' ? External.purgeExpired : Local.purgeExpired)();
  },
  purgeOlderThan(args: CacheManagerPurgeOlderThanArgs): Promise<void> {
    return (args?.mode === 'MEMORY_KOTLIN' ? External.purgeOlderThan : Local.purgeOlderThan)(args);
  },
  local: Local,
  external: External,
};
