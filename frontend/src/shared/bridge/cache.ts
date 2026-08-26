import { NativeModules } from 'react-native';

// Mirrors :cache's CacheEntry (android/cache/.../CacheStore.kt) 1:1 with a toWritableMap()
// output. isExpired is set by Kotlin's own TTL check — get() never omits an entry just because
// it's stale; the caller decides whether to still use it.
export interface CacheEntryBridge {
  value: string;
  cachedAtEpochMs: number;
  // The exact TTL this entry was originally written with — lets a caller refreshing a stale
  // entry reuse the same TTL instead of falling back to some default.
  ttlMs: number;
  isExpired: boolean;
}

export type CacheMode = 'PERSISTENT' | 'MEMORY_KOTLIN';

// Mirrors :cache's CacheDescriptor 1:1 — what put() hands back after a successful write. No
// `value` field: this describes provenance/where-and-how, not the payload (that's
// CacheEntryBridge's job, on the read side). This is the same shape a domain contract's own
// `cache` field (e.g. PageDigest.cache, once it stops being always null) carries.
export interface CacheDescriptorBridge {
  key: string;
  variant: string;
  domain: string;
  mode: CacheMode;
  cachedAtEpochMs: number;
  expiresAtEpochMs: number;
}

// `variant` mirrors CacheStore's own convention (:cache, Kotlin): names which parameter(s) a
// payload's shape depends on ("full", or "full:external" for more than one, colon-separated —
// never the values), while `key` carries the entity id plus that same parameter's value(s) in the
// same positional order ("c1:true"). A caller with no such parameter (e.g. Page) passes "".
//
// Every method here takes a single named-argument object (never positional params), same
// convention as the RN Services layer (Task 021) — the underlying Kotlin @ReactMethods stay
// positional (CacheBridgeModule.kt mirrors :cache's own Server-like positional style), this is
// purely how the RN-side interface is shaped.
interface CacheBridgeModuleInterface {
  persistentGet(params: { key: string; variant: string }): Promise<CacheEntryBridge | null>;
  persistentPut(params: {
    key: string;
    value: string;
    domain: string;
    variant: string;
    ttlMs?: number;
  }): Promise<CacheDescriptorBridge>;
  persistentInvalidate(params: { key: string; variant: string }): Promise<void>;
  persistentInvalidateDomain(params: { domain: string }): Promise<void>;
  persistentInvalidateVariant(params: { domain: string; variant: string }): Promise<void>;
  persistentPurgeExpired(): Promise<void>;
  // Removes every entry written before cutoffEpochMs AND never read since — see CacheStore.
  // purgeOlderThan's own doc (Kotlin) for the full rationale. Called manually (e.g. a debug/
  // settings screen "clear old cache" action), never on a schedule.
  persistentPurgeOlderThan(params: { cutoffEpochMs: number }): Promise<void>;

  memoryKotlinGet(params: { key: string; variant: string }): Promise<CacheEntryBridge | null>;
  memoryKotlinPut(params: {
    key: string;
    value: string;
    domain: string;
    variant: string;
    ttlMs?: number;
  }): Promise<CacheDescriptorBridge>;
  memoryKotlinInvalidate(params: { key: string; variant: string }): Promise<void>;
  memoryKotlinInvalidateDomain(params: { domain: string }): Promise<void>;
  memoryKotlinInvalidateVariant(params: { domain: string; variant: string }): Promise<void>;
  memoryKotlinPurgeExpired(): Promise<void>;
  memoryKotlinPurgeOlderThan(params: { cutoffEpochMs: number }): Promise<void>;
}

// The native module itself takes positional args — this thin object wraps each call so the rest
// of the RN codebase only ever sees the named-argument shape above.
const native: {
  persistentGet(key: string, variant: string): Promise<CacheEntryBridge | null>;
  persistentPut(key: string, value: string, domain: string, variant: string, ttlMs?: number): Promise<CacheDescriptorBridge>;
  persistentInvalidate(key: string, variant: string): Promise<void>;
  persistentInvalidateDomain(domain: string): Promise<void>;
  persistentInvalidateVariant(domain: string, variant: string): Promise<void>;
  persistentPurgeExpired(): Promise<void>;
  persistentPurgeOlderThan(cutoffEpochMs: number): Promise<void>;

  memoryKotlinGet(key: string, variant: string): Promise<CacheEntryBridge | null>;
  memoryKotlinPut(key: string, value: string, domain: string, variant: string, ttlMs?: number): Promise<CacheDescriptorBridge>;
  memoryKotlinInvalidate(key: string, variant: string): Promise<void>;
  memoryKotlinInvalidateDomain(domain: string): Promise<void>;
  memoryKotlinInvalidateVariant(domain: string, variant: string): Promise<void>;
  memoryKotlinPurgeExpired(): Promise<void>;
  memoryKotlinPurgeOlderThan(cutoffEpochMs: number): Promise<void>;
} = NativeModules.CacheBridgeModule;

export const CacheBridge: CacheBridgeModuleInterface = {
  persistentGet: ({ key, variant }) => native.persistentGet(key, variant),
  persistentPut: ({ key, value, domain, variant, ttlMs }) => native.persistentPut(key, value, domain, variant, ttlMs),
  persistentInvalidate: ({ key, variant }) => native.persistentInvalidate(key, variant),
  persistentInvalidateDomain: ({ domain }) => native.persistentInvalidateDomain(domain),
  persistentInvalidateVariant: ({ domain, variant }) => native.persistentInvalidateVariant(domain, variant),
  persistentPurgeExpired: () => native.persistentPurgeExpired(),
  persistentPurgeOlderThan: ({ cutoffEpochMs }) => native.persistentPurgeOlderThan(cutoffEpochMs),

  memoryKotlinGet: ({ key, variant }) => native.memoryKotlinGet(key, variant),
  memoryKotlinPut: ({ key, value, domain, variant, ttlMs }) => native.memoryKotlinPut(key, value, domain, variant, ttlMs),
  memoryKotlinInvalidate: ({ key, variant }) => native.memoryKotlinInvalidate(key, variant),
  memoryKotlinInvalidateDomain: ({ domain }) => native.memoryKotlinInvalidateDomain(domain),
  memoryKotlinInvalidateVariant: ({ domain, variant }) => native.memoryKotlinInvalidateVariant(domain, variant),
  memoryKotlinPurgeExpired: () => native.memoryKotlinPurgeExpired(),
  memoryKotlinPurgeOlderThan: ({ cutoffEpochMs }) => native.memoryKotlinPurgeOlderThan(cutoffEpochMs),
};
