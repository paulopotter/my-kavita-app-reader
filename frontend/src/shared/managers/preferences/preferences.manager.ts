import { PreferencesBridge, type PreferenceDescriptorBridge, type PreferenceEntryBridge } from '../../bridge/preferences';
import { Methods } from '../../tools/methods';
import type {
  PreferencesManagerDeleteArgs,
  PreferencesManagerDeleteDomainArgs,
  PreferencesManagerGetArgs,
  PreferencesManagerPutArgs,
} from './preferences.types';

// PreferencesManager (RN) — gives every Service one place to read/write a user preference,
// mirroring CacheManager's role for Cache. Unlike CacheManager there is no mode to dispatch on:
// Preferences (Kotlin, :preferences module) has a single Room-backed store, since a real user
// preference has no "in-memory only" use case — so this is a thin passthrough straight to the
// bridge, never a fetch/refresh decision (a preference is a source of truth, not something to
// cache-first around).
//
// Methods.requireArgs guards against a caller reaching this from plain JS, an `any`, or a
// `// @ts-ignore`'d call — TypeScript's own required fields only protect compile-time callers.
export const PreferencesManager = {
  get(args: PreferencesManagerGetArgs): Promise<PreferenceEntryBridge | null> {
    Methods.requireArgs(args, 'PreferencesManager.get', ['key']);
    return PreferencesBridge.get({ key: args.key, variant: args.variant ?? '' });
  },

  put(args: PreferencesManagerPutArgs): Promise<PreferenceDescriptorBridge> {
    Methods.requireArgs(args, 'PreferencesManager.put', ['key', 'value', 'domain']);
    return PreferencesBridge.put({
      key: args.key,
      value: args.value,
      domain: args.domain,
      variant: args.variant ?? '',
    });
  },

  delete(args: PreferencesManagerDeleteArgs): Promise<void> {
    Methods.requireArgs(args, 'PreferencesManager.delete', ['key']);
    return PreferencesBridge.delete({ key: args.key, variant: args.variant ?? '' });
  },

  deleteDomain(args: PreferencesManagerDeleteDomainArgs): Promise<void> {
    Methods.requireArgs(args, 'PreferencesManager.deleteDomain', ['domain']);
    return PreferencesBridge.deleteDomain({ domain: args.domain });
  },
};
