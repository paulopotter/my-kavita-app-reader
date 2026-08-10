# Plan 001 — Config Screen (Vertical Slice)

## Goal

First screen of the app: lets the user configure Kavita server URLs and API key.
This is the vertical slice that bootstraps the entire project — it creates the
Android shell scaffold, the first Kotlin tools, the bridge, and the first RN screen.

## Reference

Migrated from `mymangar/` `ConfigScreen.kt` + `ConfigViewModel.kt`. The new
implementation follows the hybrid architecture (Kotlin shell + RN UI) instead
of Compose. No code is copied verbatim — the logic is reimplemented in the
correct layers.

## What the screen does

- Add / remove Kavita server URLs (up to 5)
- Enter API key (also accepts full OPDS URL — extracts the token from the last path segment)
- Test connection (health check against active URL)
- Show which URL is currently active
- Save preferences: keep screen on during reading, chapter sort mode

## Architecture decisions for this slice

### Kotlin layers involved

**core/**
- Room database setup (`AppDatabase`)
- `ServerConfigEntity` + `ServerConfigDao` — server URLs
- `AuthConfigEntity` + `AuthConfigDao` — API key
- `UiPreferencesEntity` + `UiPreferencesDao` — UI preferences

**tools/**
- `request` tool — raw HTTP (url, method, headers, body → status + body)
- `ConfigRepository` — semantic repo exposed to JS: `config.getServers()`, `config.saveServer()`, `config.removeServer()`, `config.getApiKey()`, `config.saveApiKey()`, `config.getPreferences()`, `config.savePreferences()`
- Bridge module — exposes `ConfigRepository` as a React Native Native Module

**features/**
- `ActiveUrlSelector` — picks the fastest responding URL via health check; caches result for 15 min; `invalidateAndReselect()` forces a new check
- `KavitaAuthFeature` — calls `/api/Plugin/authenticate` with the API key; stores the JWT

**app/**
- `MainApplication` + `MainActivity` — RN host + DI wiring

### RN layers involved

```
frontend/src/screens/config/
  components/
    ServerUrlItem.tsx      — dummy: renders one URL row (url, active indicator, remove button)
    ServerUrlList.tsx      — dummy: renders the list of ServerUrlItem
    ApiKeyInput.tsx        — dummy: text input + save button
    ConnectionStatus.tsx   — dummy: shows status (idle / testing / ok / error)
    PreferencesSection.tsx — dummy: keep-screen-on toggle + chapter sort selector
  hooks/
    useConfig.ts           — orchestrates ConfigService; exposes state + actions to screen
  ConfigScreen.tsx         — glue: useConfig → components
  ConfigService.ts         — calls bridge tools; pure domain functions (extractApiKey)
  ConfigTransform.ts       — pure: raw bridge data → typed UI models
```

```
frontend/src/shared/bridge/
  config.ts                — TypeScript types for ConfigRepository Native Module
```

### Data flow

```
ConfigRepository (Kotlin) ──bridge──▶ ConfigService.ts
                                             │
                                        ConfigTransform.ts
                                             │
                                        useConfig.ts (hook)
                                             │
                                        ConfigScreen.tsx
                                             │
                              ┌────────────────────────────┐
                              │  ServerUrlList  ApiKeyInput │
                              │  ConnectionStatus Prefs     │
                              └────────────────────────────┘
```

## Running

All commands run from the repo root:

```bash
# Validate environment
make setup

# Build APK (after Android scaffold is in place)
make build-android

# Build JS bundle
make build-bundle

# Install on device
make deploy

# Stream logs
make log
```

## Out of scope for this plan

- Notification config (separate screen, separate plan)
- OTA update logic
- Any screen other than Config

---

## Tasks

See `INDEX.md` for status.
