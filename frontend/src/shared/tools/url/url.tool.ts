// UrlTool — generic, domain-agnostic URL handling. Knows nothing about Kavita/BFF/servers.
// The one place the app validates or normalizes a URL string, so the "is this a usable URL?"
// rule lives in exactly one spot (it was copy-pasted identically in ConfigScreen and
// SetupScreen before Task 035).

// A user-typed server address is "valid" for our purposes when it's an absolute http(s) URL
// with a non-empty host. We don't accept bare hosts or other schemes — the app always talks
// HTTP(S) to a server.
function isValid(raw: string): boolean {
  return /^https?:\/\/.+/.test(raw.trim());
}

// Drop a single trailing slash so two addresses that only differ by it compare equal
// (used when matching a configured URL against the currently-active one).
function stripTrailingSlash(raw: string): string {
  return raw.trim().replace(/\/$/, '');
}

// True when two URLs point at the same place ignoring a trailing slash.
function sameLocation(a: string, b: string): boolean {
  return stripTrailingSlash(a) === stripTrailingSlash(b);
}

export const UrlTool = {
  isValid,
  stripTrailingSlash,
  sameLocation,
};
