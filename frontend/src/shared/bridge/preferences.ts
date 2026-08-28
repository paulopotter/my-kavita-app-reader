import { NativeModules } from 'react-native';

// Mirrors :preferences' PreferenceEntry (android/preferences/.../Preferences.kt) 1:1 with a
// toWritableMap() output. Unlike CacheEntryBridge there's no ttlMs/isExpired — a preference is a
// source of truth, never stale by design.
export interface PreferenceEntryBridge {
  value: string;
  updatedAtEpochMs: number;
}

// Mirrors :preferences' PreferenceDescriptor 1:1 — what put() hands back after a successful
// write. No `mode` field: unlike CacheDescriptorBridge, Preferences has a single backend (Room),
// so there's nothing to distinguish.
export interface PreferenceDescriptorBridge {
  key: string;
  variant: string;
  domain: string;
  updatedAtEpochMs: number;
}

// `variant`/`key` mirror :cache's own convention (see CacheDescriptorBridge's doc) — same
// meaning here, just without the TTL half of the contract.
//
// Every method here takes a single named-argument object (never positional params), same
// convention as CacheBridge — the underlying Kotlin @ReactMethods stay positional
// (PreferencesBridgeModule.kt mirrors CacheBridgeModule's own positional style).
interface PreferencesBridgeModuleInterface {
  get(params: { key: string; variant: string }): Promise<PreferenceEntryBridge | null>;
  put(params: { key: string; value: string; domain: string; variant: string }): Promise<PreferenceDescriptorBridge>;
  delete(params: { key: string; variant: string }): Promise<void>;
  deleteDomain(params: { domain: string }): Promise<void>;
}

// The native module itself takes positional args — this thin object wraps each call so the rest
// of the RN codebase only ever sees the named-argument shape above.
const native: {
  get(key: string, variant: string): Promise<PreferenceEntryBridge | null>;
  put(key: string, value: string, domain: string, variant: string): Promise<PreferenceDescriptorBridge>;
  delete(key: string, variant: string): Promise<void>;
  deleteDomain(domain: string): Promise<void>;
} = NativeModules.PreferencesBridgeModule;

export const PreferencesBridge: PreferencesBridgeModuleInterface = {
  get: ({ key, variant }) => native.get(key, variant),
  put: ({ key, value, domain, variant }) => native.put(key, value, domain, variant),
  delete: ({ key, variant }) => native.delete(key, variant),
  deleteDomain: ({ domain }) => native.deleteDomain(domain),
};
