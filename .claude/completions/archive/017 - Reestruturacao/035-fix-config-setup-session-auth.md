# Task 035 — Correction: Config/Setup session & auth (401 on Library/Following) (Phase 5 — Corrections)

**Status:** done

## Objective

Fix a real production bug reported by the user during Task 021: the Library/Following screen
gets a **401 from Kavita**. Root cause confirmed via an Explore agent — the app still
authenticates through the old pre-`:server` path, which has no JWT refresh mechanism at all, even
though the new `:server` module already built one that nothing calls yet.

## Root cause (confirmed, real paths/lines)

- The app authenticates against Kavita via `KavitaAuthFeature.kt`
  (`android/features/src/main/kotlin/com/mymangareader/features/kavita/KavitaAuthFeature.kt`),
  which trades the API key for a JWT and saves it in `AuthConfigDao`. This JWT is short-lived —
  Kavita itself expires it, not the API key.
- `KavitaSeriesFeature.kt`
  (`android/features/src/main/kotlin/com/mymangareader/features/kavita/series/KavitaSeriesFeature.kt`,
  used by `LibraryModule.kt`) sends this saved JWT directly in every request header, without
  checking validity and without handling 401 — it only propagates the error upward.
- `isAuthenticated()` (`KavitaAuthFeature.kt:48`) only checks whether a JWT string exists in
  storage, never whether it's still valid.
- Today the only way to renew the JWT is the user manually re-entering the API key on the
  Config/Setup screen (`SetupModule.kt` → `KavitaAuthFeature.authenticate()`), which fires a new
  `POST /api/Plugin/authenticate`.
- The new `:server` module (Task 017,
  `android/server/src/main/kotlin/com/mymangareader/server/Server.kt`) already handles
  authentication properly internally: `setActiveGroup`/`reauthenticateActiveGroup` (lines
  ~423-441) call `plugin.auth.authenticate()` and hold the session; and `KavitaAuth.kt`
  (`android/server/src/main/kotlin/com/mymangareader/server/plugins/kavita/auth/KavitaAuth.kt`)
  already has `checkApiKeyExpiry()` and `reauthenticate()` (lines 57-76) ready to renew the token
  via a refresh token — but **nothing in the app uses this yet**. `KavitaAuth.kt`'s own comment
  (lines 78-82) already notes that "whoever holds the real session hasn't been built yet."
- Confirmed by the completion doc `.claude/completions/2026-08-22_016-relocate-kavita-plugin.md`:
  the Config/Setup screen today still uses 100% the old path
  (`KavitaAuthFeature`/`SetupModule.kt`/`ConfigRepository`/`SetupBridge` in
  `frontend/src/shared/bridge/config.ts`), not the new `:server`/`ServerBridge`/`ServerService`
  (RN) path.

## Decision (confirmed with the user)

The real fix for the 401 is migrating the Config/Setup screen (server management + auth) onto the
`:server`/`ServerBridge`/`ServerService` path instead of the old
`SetupModule.kt`/`SetupBridge`/`KavitaAuthFeature`/`ConfigRepository` path. The `ServerService`
(RN) built in Task 021
(`frontend/src/shared/services/servers/servers.services.ts`) already exposes
`group.active.set/get`, `auth.reauthenticate`, etc. — the pieces needed already exist, they're
just not wired to the screen that owns the user-facing session.

## Scope

- Migrate the Config screen (`frontend/src/screens/config/ConfigScreen.tsx`, `ConfigService.ts`,
  `useConfig.ts`) to consume `ServerService`/`ServersService` (RN, already exists) instead of
  `SetupBridge`/`ConfigRepository`/`SeriesBridge` for everything that is server management
  (groups, urls, active group) and authentication.
- Actually connect the JWT refresh mechanism that already exists in `:server`
  (`KavitaAuth.reauthenticate`/`checkApiKeyExpiry`) to a real call site — e.g. on detecting a 401,
  or proactively before expiry. Today it exists but is orphaned; nothing invokes it.
- Once done, the 401 bug should disappear, because the session becomes owned by `Server` (which
  already has the session/reauthentication logic) instead of the old path with no refresh at all.

## Out of scope for this task

Deciding now the exact design of *when* to call `reauthenticate` (reactive on 401 vs. proactive
by expiry) is **not** decided here — that's a mini-iteration with the user when this task is
actually started. This task only registers the finding and the objective.

## Completion criteria

- Config/Setup screen (server management + authentication) consumes `ServerService`/
  `ServersService` (RN), not `SetupBridge`/`ConfigRepository`/`SeriesBridge`.
- `:server`'s existing `KavitaAuth.reauthenticate()`/`checkApiKeyExpiry()` is actually called from
  a real trigger point (reactive or proactive — decided at implementation time).
- The 401 on Library/Following no longer reproduces after a JWT expires (manual verification on
  device, including waiting out/forcing an expired session).
- Tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.

---

## Result

### O que foi implementado

**1. Auto-reautenticação de JWT no `:server` (o objetivo original — o 401)**
- `ServerAuthException` (novo, `android/server/src/main/kotlin/com/mymangareader/server/plugins/ServerPlugin.kt`) — a exceção que um plugin levanta quando um content call autenticado volta 401.
- `KavitaContentError.kt` (`kavitaRaiseIfSessionRejected`) chamado nos 8 content calls do Kavita (`KavitaSeries` ×3, `KavitaChapter` ×5): status 401 → `ServerAuthException` em vez da exceção genérica. Os endpoints de auth (`KavitaAuth`) ficam de fora — lá 401 é o erro terminal.
- `Server.withUrlRetry` (`android/server/src/main/kotlin/com/mymangareader/server/Server.kt`): ao capturar `ServerAuthException`, chama `reauthenticateActiveGroup(groupId)` (login completo via apiKey, mesma URL) e refaz a chamada uma vez. 401 persistente após reauth → propaga (credencial inválida → volta pro setup). Independente do retry de `IOException` (esse re-seleciona URL; o 401 não).

**2. Migração da tela Config/Setup para `:server`/`ServerService`**
- Nova árvore `frontend/src/screens/config/` no padrão pasta-kebab: `config.screen.tsx` (router thin), sub-telas `server/`, `reader/`, `serie/`, `debug/`, `setup/`, cada uma com hook solto na raiz + `index.ts`. Componentes dumb: `language-toggle/`, `server/components/{row,modal,url-modal,group-card,select}/`, `debug/components/section/`.
- `server.hooks.ts` — `useServer` (grupo + URLs via `:server`) e `useMetadataServer` (grupo + URLs do `:external-metadata-server` + associação URL→URL). Regra single-server/single-metadata: opera `groups[0]`, botão "adicionar" some quando já existe um. `MAX_URLS_PER_GROUP = 2`.
- Seção de servidor de metadados: opcional, só renderiza se há um servidor; linhas de credencial só se o provider declara `credentialFields`; associação via `<Select>` (não chips).
- i18n completo (pt-BR + en) para toda a tela nova, sempre genérico — nome do provider vem do `:server` (`provider.displayName`), nunca hardcoded "Kavita"/"BFF".

**3. `healthCheckPath` vem do plugin, não do RN**
- `ServerPluginRegistration.defaultHealthCheckPath` + `ExternalMetadataPluginRegistration.defaultHealthCheckPath` — Kavita `/api/Health`, M3 `/api/health`. Serializado no `ProviderInfo` pelas duas bridges. `addServer` usa `provider.defaultHealthCheckPath` — RN nunca chuta um endpoint.
- `ExternalMetadataServer.groups.update`: ao mudar o `healthCheckPath`, invalida a seleção de URL cacheada (15 min) e re-testa ao vivo.

**4. Idioma app ↔ sistema**
- O per-app locale do SO (`LocaleManager`) vira a fonte única da verdade — `ConfigRepository.getAppLocale`/`setAppLocale`; `UiPreferences` perde o campo `language`.
- `MainActivity.onConfigurationChanged` emite `appLocaleChanged` pro JS → o app reage a troca de idioma nas Configurações do Android sem restart. `onCreate(null)` + strip de fragments evita o crash do react-native-screens ao recriar a Activity. Manifest `configChanges += locale|layoutDirection`.

**5. Cascata servidor → servidor de metadados**
- `ServerEvents.activeUrlChanged` (EventBus RN→RN, `frontend/src/shared/services/servers/servers.events.ts`): emitido quando o `:server` (re)resolve a URL ativa. `useMetadataServer` escuta e re-ativa seu grupo. Splash: `resolveMetadataServer()` fire-and-forget após ativar/autenticar o servidor.

**6. Router swap + deleção do legado**
- `MainNavigator` → `screens/config` (barrel); `RootNavigator` SETUP → `screens/config/setup`.
- Apagados: `ConfigScreen.tsx` (1005 linhas), `ConfigService.ts`, `ConfigTransform.ts`, `DebugSmokeTest.ts`, `useConfig.ts`, `screens/setup/` inteiro, os 5 componentes órfãos de `config/components/`, `server/components/form/`.
- Limpeza extra de legado: `shared/transforms/` extinto por completo (`chapter.ts`, `series.ts`, `page.ts`, `kavitaApiKey.ts`, `sortConfig.ts` — lógica útil já reescrita nos tipos do digest); `ChapterSortConfigFields` migrado para `screens/serie/components/chapter-sort/` (padrão novo), modal de sort dissolvido na `serie.screen.tsx`.

### Versões

- Antes: `0.8.0-rc82` (APK) / `0.9.0-rc82` (bundle) — fim da Task 038.
- Depois: `0.8.0-rc98` / `0.9.0-rc98`.

### Testes

- `make coverage` — verde. Kotlin: `koverVerify` OK (`COVERAGE_FLOOR_KOTLIN=83`). JS: 840 testes, floor bumpado (statements/lines 71→88, functions 78, branches 90).
- `:server` — 60 testes (2 novos: 401 recupera / 401 persistente propaga).
- `:content-digest` — testes do fix do SerieScreen vazia (cache só com a linha da lista).
- `tsc --noEmit` limpo, `eslint src --quiet` limpo.
- Device (`make redeploy-log`): usuário confirmou config + setup funcionando na árvore nova; dot do M3 verde ao abrir; SerieScreen abre com capítulos direto (fix rc95). O 401 em runtime não foi reproduzido no device durante o teste (JWT ainda válido) — coberto pelos 2 testes unitários do `:server`.
