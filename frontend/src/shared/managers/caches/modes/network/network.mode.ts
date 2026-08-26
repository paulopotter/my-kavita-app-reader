// NETWORK — Cache.network's own contract (single-flight + TTL around a suspend block) has no RN
// bridge: CacheBridgeModule.kt deliberately never exposed it, since `block` is a Kotlin function
// that can't cross the RN↔Kotlin boundary (see architecture.md's Cache Guideline). Declared here
// anyway — same "manager knows about every backend" reasoning as MemoryMode.local — but every
// method throws until a real bridge exists for it. Not a CacheManagerModeHandler: NETWORK's
// contract is structurally different (run/invalidate/purge, no get/put). Methods are async so the
// throw becomes a rejected Promise (matching the Promise<T> signature every other mode honors)
// instead of an immediate synchronous throw.
const NOT_IMPLEMENTED_NETWORK =
  'CacheManager.network is not implemented yet — Cache.network has no RN bridge (its `block` parameter cannot cross into Kotlin).';

export const NetworkMode = {
  async run(): Promise<string> {
    throw new Error(NOT_IMPLEMENTED_NETWORK);
  },
  async invalidate(): Promise<void> {
    throw new Error(NOT_IMPLEMENTED_NETWORK);
  },
  async purgeExpired(): Promise<void> {
    throw new Error(NOT_IMPLEMENTED_NETWORK);
  },
  async purgeOlderThan(): Promise<void> {
    throw new Error(NOT_IMPLEMENTED_NETWORK);
  },
};
