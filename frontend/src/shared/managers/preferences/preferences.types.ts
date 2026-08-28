// Shared arg types for PreferencesManager. Kept separate from preferences.manager.ts, same
// convention as cache.types.ts for CacheManager.
//
// `variant`/`key` mirror :cache's own convention (see CacheManagerGetArgs' doc, cache.types.ts):
// variant names which parameter(s) a value's shape depends on, key carries the entity id (or ""
// when there is none, with the distinguishing value moved into variant instead).
export interface PreferencesManagerGetArgs { key: string; variant?: string }
export interface PreferencesManagerPutArgs { key: string; value: string; domain: string; variant?: string }
export interface PreferencesManagerDeleteArgs { key: string; variant?: string }
export interface PreferencesManagerDeleteDomainArgs { domain: string }
