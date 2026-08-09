---
task: 005 - frontend bridge + ConfigService
plan: 001 - Config Screen
status: pending
---

# 005 — Frontend — Bridge Types + ConfigService + ConfigTransform

Set up the React Native project and implement the JS-side of the Config domain.

## Deliverables

**Project setup:**
- `frontend/package.json` — React Native + Expo, `bundleVersion: "0.1.0"`
- `frontend/tsconfig.json`
- `frontend/yarn.lock`

**Bridge types:**
`frontend/src/shared/bridge/config.ts`
```ts
// TypeScript mirror of ConfigRepository Native Module
export interface ServerConfig { id: string; url: string; timeoutMs: number; priority: number }
export interface UiPreferences { keepScreenOnDuringReading: boolean; chapterSortMode: 'ASCENDING'|'DESCENDING'|'SMART'; chapterSortFixedThreshold: number|null; chapterSortProgressPercent: number }
export interface ConfigBridge {
  getServers(): Promise<ServerConfig[]>
  saveServer(url: string, timeoutMs: number): Promise<string>
  removeServer(id: string): Promise<void>
  getApiKey(): Promise<string>
  saveApiKey(apiKey: string): Promise<void>
  getPreferences(): Promise<UiPreferences>
  savePreferences(prefs: Partial<UiPreferences>): Promise<void>
  testConnection(): Promise<{ ok: boolean; error?: string }>
  authenticate(apiKey: string): Promise<{ ok: boolean; error?: string }>
  forceReselectUrl(): Promise<{ activeUrl?: string; error?: string }>
  observeServers(callback: (servers: ServerConfig[]) => void): () => void
  observePreferences(callback: (prefs: UiPreferences) => void): () => void
}
```

**ConfigService:**
`frontend/src/screens/config/ConfigService.ts`
- `getServers()`, `saveServer()`, `removeServer()` — delegates to bridge
- `getApiKey()`, `saveApiKey()` — delegates to bridge; calls `authenticate()` after save
- `testConnection()`, `forceReselectUrl()` — delegates to bridge
- `extractApiKeyToken(input: string): string` — pure: if input is a URL, returns last path segment (mirrors Kotlin logic, tested without mock)
- `observeServers()`, `observePreferences()` — delegates to bridge

**ConfigTransform:**
`frontend/src/screens/config/ConfigTransform.ts`
- `toServerListItem(raw: ServerConfig, activeUrl: string | null): ServerListItem` — pure
- `toPreferencesModel(raw: UiPreferences): PreferencesModel` — pure
- All functions pure — no imports from bridge or services

## Verification

```bash
# from the repo root
make build-bundle
# Expected: bundle generated without TypeScript errors
```

## Notes

- `extractApiKeyToken` must be unit-tested (pure function, no mock needed).
- `ConfigService` never imports from `useConfig` or any screen — one-way dependency.
- Bridge types are the contract: if Kotlin changes a field, update here first, then the screen.
