---
task: 006 - frontend components + screen
plan: 001 - Config Screen
status: pending
---

# 006 — Frontend — Components + useConfig Hook + ConfigScreen

Build the visible Config screen using the service and bridge from task 005.

## Deliverables

`frontend/src/screens/config/`

**Dummy components** (render props only — zero service/bridge imports):
- `components/ServerUrlItem.tsx` — one URL row: url text, active indicator (●), remove button
- `components/ServerUrlList.tsx` — list of `ServerUrlItem` + "add URL" input + add button
- `components/ApiKeyInput.tsx` — text input (masked) + save/authenticate button
- `components/ConnectionStatus.tsx` — status chip: idle | testing | ok | error(message)
- `components/PreferencesSection.tsx` — keep-screen-on toggle + chapter sort picker

**Hook:**
- `hooks/useConfig.ts` — orchestrates `ConfigService`; exposes:
  ```ts
  {
    servers: ServerListItem[]
    activeUrl: string | null
    apiKey: string
    status: 'idle' | 'testing' | 'saving' | 'ok' | 'error'
    errorMessage: string | null
    preferences: PreferencesModel
    addServer(url: string): void
    removeServer(id: string): void
    saveApiKey(apiKey: string): void
    testConnection(): void
    forceReselectUrl(): void
    setPreference<K extends keyof PreferencesModel>(key: K, value: PreferencesModel[K]): void
  }
  ```
  Subscribes to `observeServers` and `observePreferences` on mount; unsubscribes on unmount.

**Screen:**
- `ConfigScreen.tsx` — calls `useConfig()`, passes results to components. No business logic.

**Navigation entry point:**
- `frontend/src/App.tsx` — minimal RN app with `ConfigScreen` as the only route for now

## Verification

```bash
make build-bundle   # no TypeScript errors
make build-android  # APK builds
make deploy         # installs on device
# Manual: open app → Config screen renders → add a URL → test connection → save API key
```

## Notes

- Components must not import `ConfigService`, bridge, or `useConfig` — props only.
- `useConfig` must not render anything — state + callbacks only.
- `ConfigScreen` must not contain `if/else` data logic — delegate to hook.
