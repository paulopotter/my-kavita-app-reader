import { MemoryMode, NetworkMode, PersistentMode } from './modes';
import type { CacheManagerModeHandler } from './modes';
import type {
  CacheManagerGetArgs,
  CacheManagerInvalidateArgs,
  CacheManagerInvalidateDomainArgs,
  CacheManagerInvalidateVariantArgs,
  CacheManagerMode,
  CacheManagerPurgeExpiredArgs,
  CacheManagerPurgeOlderThanArgs,
  CacheManagerPutArgs,
} from './cache.types';

// CacheManager (RN) — gives every Service one place to reach any of the app's cache backends,
// mirroring how :cache (Kotlin) exposes persistent/memoryKotlin/network as sibling namespaces
// under one Cache facade instead of a single mode-dispatching function. Unlike the Kotlin side,
// this manager never decides cache-first behavior itself (that logic already lives in the digest
// builders, see architecture.md's Cache Guideline) — every mode implementation is a thin
// passthrough (or, for memory.local/network, a not-yet-implemented stub), never a fetch/refresh
// decision.
//
// MODE_HANDLERS is the one place a new mode must be registered — adding one means one new line
// here (plus the import above), nothing else in this file changes.
const MODE_HANDLERS: Record<CacheManagerMode, CacheManagerModeHandler> = {
  PERSISTENT: PersistentMode,
  MEMORY_KOTLIN: MemoryMode,
  MEMORY: MemoryMode,
};

function handlerFor(mode: CacheManagerMode | undefined): CacheManagerModeHandler {
  return MODE_HANDLERS[mode ?? 'PERSISTENT'];
}

// Root hub — reads `args.mode` (default PERSISTENT, the only backend with a real consumer today)
// and forwards the whole args object onward unchanged, so a new field added to any XArgs type in
// cache.types.ts never requires touching this dispatch again. `args` is typed as required on
// every method whose other fields (key/domain/...) are themselves required, but TypeScript only
// guards compile-time callers — a caller reaching this from plain JS, an `any`, or a `// @ts-
// ignore`'d call can still pass `undefined`. `args?.mode` keeps that case from throwing here;
// the missing key/domain still surfaces as an error, just from inside the resolved mode instead
// of a raw "Cannot read properties of undefined" one step earlier.
const Cache = {
  get(args: CacheManagerGetArgs) {
    return handlerFor(args?.mode).get(args);
  },
  put(args: CacheManagerPutArgs) {
    return handlerFor(args?.mode).put(args);
  },
  invalidate(args: CacheManagerInvalidateArgs) {
    return handlerFor(args?.mode).invalidate(args);
  },
  invalidateDomain(args: CacheManagerInvalidateDomainArgs) {
    return handlerFor(args?.mode).invalidateDomain(args);
  },
  invalidateVariant(args: CacheManagerInvalidateVariantArgs) {
    return handlerFor(args?.mode).invalidateVariant(args);
  },
  purgeExpired(args: CacheManagerPurgeExpiredArgs = {}) {
    return handlerFor(args?.mode).purgeExpired(args);
  },
  purgeOlderThan(args: CacheManagerPurgeOlderThanArgs) {
    return handlerFor(args?.mode).purgeOlderThan(args);
  },
};

export const CacheManager = {
  ...Cache,
  persistent: PersistentMode,
  memory: MemoryMode,
  network: NetworkMode,
};
