# Architecture Refactor Map — modelo antigo × modelo novo

> Relatório completo da estrutura de código do app (`android/` Kotlin + `frontend/` RN).
> Gerado em 2026-08-29, durante o plano 017 (Reestruturação), fase 5.
> Escopo: **só** as pastas `android/` e `frontend/` (onde o código de fato vive).
>
> Este documento é um retrato de transição: o app está no **meio** de uma migração de
> arquitetura. Muitos arquivos do modelo antigo ainda estão vivos e em uso; os novos
> convivem ao lado deles até o corte final. Cada seção marca a que modelo o arquivo pertence.

---

## 1. As duas arquiteturas, lado a lado

### 1.1 Modelo ANTIGO (pré-plano 017)

**Premissa:** Kotlin é uma "ponte de dados" fina, organizada em 3 camadas
(`core ← tools ← features`), com uma classe grande por domínio acoplada ao provider
Kavita. O RN consome cada `NativeModule` por um bridge, e cada tela tem seu próprio
`Service` + `Transform` + `hook`.

```
Kotlin:  core/ (Room, DI) ← tools/ (network, ota, bridge helpers) ← features/kavita/ (KavitaXFeature)
                                                                          │
RN:      shared/bridge/<domain>.ts  →  screens/<x>/<X>Service.ts  →  <X>Transform.ts  →  use<X>.ts  →  <X>Screen.tsx
```

**Características:**
- `features/kavita/` tem uma classe por domínio (`KavitaSeriesFeature`, `KavitaChapterFeature`),
  cada uma **conhece os endpoints/DTOs reais do Kavita** e escreve direto em tabelas Room
  dedicadas por domínio (`chapter_cache`, `series_detail_cache`).
- Cache ad-hoc: `@Volatile var` em `LibraryModule`, tabelas Room por domínio, `Mutex`+`Map`
  feitos à mão em cada plugin.
- `NativeModule`s nomeados por tela ou por concern misturado (`SeriesModule` mistura cache de
  capítulo, prefs de sort e follow; `LibraryModule`).
- RN: cada tela tem seu `Service` (wrapper fino do bridge) + `Transform` (funções puras de
  ordenação/derivação) + `hook` (orquestra estado + efeitos). Lógica de domínio compartilhada
  mora em `shared/transforms/<domain>.ts`.
- Comunicação Kotlin→RN por `NativeEventEmitter` (inclusive para confirmar ações que o RN pediu
  — a ambiguidade que a Task 013 resolve).

### 1.2 Modelo NOVO (plano 017)

**Premissa:** uma **arquitetura de referência de 6 camadas** (0–5), com módulos Gradle
separados e isolados, um por responsabilidade, todos provider-agnósticos exceto a camada de
plugin. A inteligência de domínio (compor Page→Chapter→Series) vive num módulo Kotlin dedicado
(`:content-digest`), não em cada `XFeature`.

```
Layer 0  OS / primitivas nativas
Layer 1  Plugins nomeados     :server/plugins/kavita, :external-metadata-server/plugins/m3
Layer 2  Abstração de plugin  :server, :external-metadata-server, :cache, :preferences
Layer 3  Contratos de domínio :content-digest  (Page/Chapter/Series digests, cache-first)
                              + tools RN genéricos (shared/tools, shared/managers)
Layer 4  Services RN          shared/services/{chapters,pages,serials,servers}
Layer 5  Front                screens/, shared/components, navigation
```

**Regras (de `_contract-design-notes.md`):**
- Um módulo acessa a si mesmo (mesma camada) ou a camada imediatamente abaixo. Exceção nomeada:
  Layer 4 pode alcançar Layer 3 **ou** Layer 2 direto (nunca Layer 1).
- Layer 3 é **opcional por domínio** — Library não tem contrato Layer 3, é uma operação de
  listagem sobre Series + um Service Layer 4.
- Composição de domínio micro→macro: cada domínio só resolve o seu e delega pra baixo.
  Series (Layer 3) chama o módulo Chapter (Layer 3), não lê `chapterCacheDao`.
- Um plugin (Layer 1) vive **fisicamente aninhado** dentro do módulo Layer 2 que o entende
  (`:server/plugins/kavita/`), nunca numa pasta neutra.
- Contratos modelados em TypeScript (linguagem de especificação), implementados em Kotlin real.
- Cache: um único módulo genérico (`:cache`) com 3 backends (persistent/memoryKotlin/network).
  Decisão cache-first (ler vs. buscar vs. stale-refresh) vive nos builders do `:content-digest`.
- 3 mecanismos de comunicação formalizados (Task 013):
  1. RN→Kotlin: sempre `@ReactMethod` + `Promise` (request → execução → resposta direta).
  2. Kotlin→RN (`NativeEventEmitter`): só eventos que o Kotlin observa sozinho (scroll físico,
     URL ativa, Room Flow).
  3. RN→RN (`EventBus`): eventos sem origem nativa nenhuma (novo — `shared/managers/events`).
- Migração incremental: nunca substituir função no lugar; adicionar a nova ao lado, migrar
  callers aos poucos, deletar a antiga quando ninguém mais chama.

### 1.3 Diferenças resumidas

| Aspecto | Antigo | Novo |
|---|---|---|
| Organização Kotlin | 3 camadas, 1 módulo Gradle (`app` + `core`/`tools`/`features`) | 6 camadas de referência, 9 módulos Gradle isolados |
| Provider Kavita | `features/kavita/KavitaXFeature` conhece endpoints e escreve Room direto | `:server/plugins/kavita/` — plugin aninhado, adapter traduz pra contrato genérico |
| Inteligência de domínio | espalhada por `KavitaSeriesFeature`/`KavitaChapterFeature` + `shared/transforms/` (RN) | `:content-digest` (Kotlin) compõe Page→Chapter→Series num único lugar |
| Cache | `@Volatile`, tabelas Room por domínio, `Mutex`+`Map` à mão | `:cache` genérico (persistent/memoryKotlin/network), descriptor de proveniência |
| Preferências | `UiPreferencesDao` + `series_sort_prefs` (tabela dedicada) | `:preferences` genérico (key/value/domain/variant), sem TTL |
| `NativeModule` | por tela / concern misturado (`SeriesModule`, `LibraryModule`, `ReaderModule`) | por responsabilidade (`DigestBridgeModule`, `CacheBridgeModule`, `ServerBridgeModule`, `PreferencesBridgeModule`, `FollowedSeriesBridgeModule`) |
| RN — camada de dados | `screens/<x>/<X>Service.ts` + `<X>Transform.ts` por tela | `shared/services/<domain>/` (Layer 4) + `shared/tools/<domain>/` (normalizers Layer 3) |
| RN — cache/prefs | acesso direto ao bridge | `shared/managers/{caches,preferences,events}` |
| Comunicação cross-tela | `NativeEventEmitter` para tudo | 3 mecanismos separados; RN→RN via `EventBus` |
| Metadata externa (BFF) | `features/bff/BffFeature` (dentro de `:features`) | `:external-metadata-server` (módulo próprio, plugin `m3`) |

---

## 2. Kotlin — `android/`

### 2.1 `:core` — infraestrutura (comum aos dois modelos)

`core ← tools ← features`. Não conhece ninguém acima. É a base que os dois modelos usam.

| Arquivo | Modelo | Responsabilidade |
|---|---|---|
| `core/database/AppDatabase.kt` | comum | Definição Room: lista todas as `@Entity` e DAOs, versão do schema. |
| `core/database/DatabaseModule.kt` | comum | Hilt `@Provides` de cada DAO + registro das migrations (forward **e** backward). |
| `core/database/DbStatusProvider.kt` / `RoomDbStatusProvider.kt` | comum | Expõe "o DB está saudável?" pro `DbValidatorModule`. |
| `core/database/validator/SchemaValidator.kt` | comum | Valida o schema Room contra o esperado (usado no boot). |
| `core/database/migrations/Migration_4_5.kt` … `Migration_12_13.kt` | comum | Migrations Room em par (ex.: 12→13 criou `preference` e migrou `series_sort_prefs` pra lá). |
| **Tabelas do modelo ANTIGO** | | |
| `ChapterCacheDao.kt` / `ChapterCacheEntity.kt` | antigo | Cache Room de capítulos por série. Lido por `KavitaSeriesFeature`, `KavitaChapterFeature`, `SeriesModule`, `SplashSyncCoordinator`. Alvo de remoção (Task 036). |
| `SeriesDetailCacheDao.kt` / `SeriesDetailCacheEntity.kt` | antigo | Cache Room do detalhe de série. |
| `ReadingProgressDao.kt` / `ReadingProgressEntity.kt` | antigo | Progresso de leitura local por capítulo (page + scrollFraction). |
| ~~`UiPreferencesDao.kt` / `UiPreferencesEntity.kt`~~ | **removido (Task 039)** | Preferências de UI. Todas migradas: sort de capítulo → `:preferences` (`chapterSortPrefs`, Migration_12_13); layout da Library → `:preferences` (`libraryLayout`); idioma → locale por-app do SO; keepScreenOn/immersiveMode → `:preferences` (`readerPrefs`, RN-side `ReaderPrefs`). Tabela dropada na migração 13→14. |
| `AuthConfigDao.kt` / `AuthConfigEntity.kt` | antigo | JWT + apiKey do Kavita (usado por `KavitaAuthFeature`). |
| `ServerConfigDao.kt` / `ServerConfigEntity.kt` | antigo | URLs registradas de servidor Kavita (multi-URL pro mesmo servidor). |
| `BffMatchDao/Entity`, `BffServerConfigDao/Entity` | antigo | Config + matches do BFF (metadata externa) — modelo antigo do BFF. |
| **Tabelas do modelo NOVO** | | |
| `CacheDao.kt` / `CacheEntity.kt` | novo | Tabela genérica única do `:cache` (`(key, variant)` PK, domain, ttl, expiresAt). |
| `PreferenceDao.kt` / `PreferenceEntity.kt` | novo | Tabela genérica única do `:preferences` (key/value/domain/variant, sem TTL). |
| `PageCacheDao.kt` / `PageCacheEntity.kt` | novo/limítrofe | Cache de URLs de página (usado pelo Reader data-side). |
| `ServerGroupDao/Entity`, `ServerUrlDao/Entity` | novo | Grupos de servidor + URLs do `:server` (substitui `ServerConfigDao` a prazo). |
| `ExternalMetadataGroupDao/Entity`, `ExternalMetadataUrlDao/Entity` | novo | Grupos + URLs do `:external-metadata-server`. |

### 2.2 `:tools` — capacidades reutilizáveis (modelo antigo, mas ainda a base)

| Arquivo | Responsabilidade |
|---|---|
| `tools/network/RequestTool.kt` | Cliente HTTP central (usado pelos plugins novos e pelas features antigas). |
| `tools/network/NetworkModule.kt` | Hilt wiring do stack de rede. |
| `tools/network/ActiveUrlSelector.kt` | Escolhe a URL saudável entre várias registradas (health-check + TTL). Tem uma corrida conhecida (sem lock) — candidato a migrar pro `Cache.network`. |
| `tools/network/HttpResult.kt`, `UrlCandidate.kt` | Tipos de suporte da rede. |
| `tools/bridge/ConfigRepository.kt` | `NativeModule` RN↔Kotlin pra ler/gravar config genérica (server/auth/bff/uiPrefs). |
| `tools/bridge/ConfigStore.kt` | Backing store do `ConfigRepository`. |
| `tools/bridge/DbValidatorModule.kt` | `NativeModule` que expõe o status do DB pro RN (splash). |
| `tools/bridge/DbPrimitive.kt` | Tipos primitivos do bridge de config. |
| `tools/cache/BackgroundExecute.kt` | Fire-and-forget genérico com `Cache` — roda um `suspend` e opcionalmente grava o resultado. Retorna o `Job` pra quem quiser reagir (ex.: um `EventBus.emit` no futuro). |
| `tools/datetime/IsoDateTime.kt` | Parsing/format de datas ISO. |
| `tools/ota/OtaManager.kt` | Núcleo do OTA: checa `latest.json`, baixa bundle novo, troca no próximo boot, rollback por N aberturas sem crash. |
| `tools/ota/OtaModule.kt` | `NativeModule` do OTA pro RN. |
| `tools/ota/OtaStore.kt` / `OtaState.kt` / `OtaManifest.kt` / `OtaCheckResult.kt` / `VersionCheck.kt` / `OtaQualifiers.kt` | Suporte do OTA (estado persistido, manifesto, checagem de staleness por build-time). |

### 2.3 `:features` — domínios de negócio (MODELO ANTIGO)

Tudo aqui é do modelo antigo. É o que o `:server` + `:content-digest` estão substituindo.

| Arquivo | Responsabilidade | Situação |
|---|---|---|
| `features/FeaturesModule.kt` | Hilt `@Binds`: `KavitaUrlSelector→KavitaUrlSource`, `KavitaChapterFeature→ChapterDataSource`. | ativo (Reader ainda usa `ChapterDataSource`) |
| `features/kavita/KavitaSeriesFeature.kt` | Lista séries (`POST /api/Series/all-v2`), detalhe de série, metadata. Lê `chapterCacheDao` direto pra calcular progresso. Escreve `series_detail_cache`. | **ativo** — `LibraryModule` e `SplashSyncCoordinator` usam. Substituto: `:server` KavitaSeries + `:content-digest` SeriesDigest. |
| `features/kavita/KavitaChapterFeature.kt` | Lista capítulos de série, marca lido/não-lido, salva progresso, URLs/dimensões de página. Implementa `ChapterDataSource`. Escreve `chapter_cache`/`reading_progress`. | **ativo** — `ReaderChapterModule` (via `ChapterDataSource`), `SeriesModule`, `LibraryModule`. Substituto: `:server` KavitaChapter + `:content-digest` ChapterDigest/PageDigest. |
| `features/kavita/chapter/ChapterDataSource.kt` | Interface provider-agnóstica do lado **dados** do Reader (`getPageUrls`, `getPageDimensions`, `getLocalProgress`, `saveReadingProgress`…). | ativo — o Reader (Task 029/030) ainda não migrou pro digest stack. |
| `features/kavita/KavitaAuthFeature.kt` | Autentica no Kavita (apiKey → JWT), observa `auth_config`, `isAuthenticated()`. | ativo — `SetupModule`. Substituto: `:server/plugins/kavita/auth/KavitaAuth.kt`. |
| `features/kavita/KavitaUrlSelector.kt` | Implementa `KavitaUrlSource`: lê todas as `ServerConfigDao` e delega ao `ActiveUrlSelector` genérico. | ativo. Task 012 decidiu: some, seleção de URL sobe pro `:server`. |
| `features/kavita/ActiveUrlWatcher.kt` | Observa mudança da URL ativa e emite pro RN via `NetworkStatusModule`. | ativo — origem genuinamente nativa, fica. |
| `features/kavita/UserDto.kt` | DTO do usuário Kavita (auth antigo). | ativo (dependência do `KavitaAuthFeature`). |
| `features/bff/BffFeature.kt` | Sincroniza metadata externa (BFF): recebe lista de séries Kavita, casa com o servidor BFF. Dentro de `:features`. | **ativo** — `LibraryModule.syncBff`, `SetupModule`. Substituto: `:external-metadata-server` (módulo próprio). |
| `features/startup/SplashSyncCoordinator.kt` | Orquestra o sync do splash: baixa séries + capítulos e grava no cache Room antigo. | **ativo** — `StartupModule`. |
| `features/kavita/reader/ui/ReaderPageList.kt` | **Compose `LazyColumn`** que renderiza as páginas do Reader — a única tela que desenha pixels em Kotlin (exceção nomeada, `GL_MAX_TEXTURE_SIZE`). Toda a matemática de scroll/fração/troca-de-capítulo. | ativo — exceção deliberada, não é "modelo antigo a substituir". |
| `features/kavita/reader/ui/SduNode.kt` | Interpretador genérico de Server-Driven UI (Container/TextNode/Spacer) — o RN manda a árvore, o Kotlin só desenha. | ativo. |
| `features/kavita/reader/ui/PagePreloader.kt`, `PageDecodeCoordinator.kt`, `SafeBitmapDecoder.kt`, `SduNode.kt`, `SduNodeView`(em `SduNode.kt`), `ReaderDebugFlags.kt` | Carregamento/decode de bitmaps de página, flags de debug do Reader. | ativo. |

### 2.4 `:server` — MODELO NOVO, Layer 1 + 2 (abstração de servidor de conteúdo)

Substitui `KavitaSeriesFeature`/`KavitaChapterFeature` + `KavitaUrlSelector` + `KavitaAuthFeature`.

| Arquivo | Camada | Responsabilidade |
|---|---|---|
| `server/Server.kt` | L2 (facade) | Só **roteamento**: sabe qual plugin está ativo e delega. Zero conhecimento de domínio de provider. Gerencia grupos de servidor (`ServerGroupDao`), valida credenciais, expõe `ServerResponse<T>` (data + `ServerActiveInfo` + `resolvedAtEpochMs`). Métodos de domínio direto (`getChapter`, `getSeries`). |
| `server/ServerModule.kt` | L2 | Hilt wiring do `:server`. |
| `server/plugins/ServerPlugin.kt` | L2 | Interface + shapes provider-agnósticos (`PluginSerial`, `PluginChapter`, `PluginProgress`…). Cada adapter traduz o DTO cru pra cá. Nomes já no vocabulário dos contratos (Task 019/020), não dos DTOs Kavita. |
| `server/plugins/kavita/KavitaServerPlugin.kt` | L1→L2 | Adapter: traduz o plugin Kavita cru ↔ shape genérico. Guarda credenciais (apiKey/JWT decodificados). `companion object Info` = registro do plugin. |
| `server/plugins/kavita/auth/KavitaAuth.kt` | L1 | Auth real do Kavita (apiKey → JWT). Substitui `KavitaAuthFeature`. |
| `server/plugins/kavita/chapter/KavitaChapter.kt` | L1 | Chamadas REST reais de capítulo/página do Kavita (endpoints, DTOs). |
| `server/plugins/kavita/series/KavitaSeries.kt` | L1 | DTO fiel de `SeriesDto` do Kavita + chamadas reais de série. |

### 2.5 `:content-digest` — MODELO NOVO, Layer 3 (contratos de domínio)

O coração do modelo novo: compõe Page→Chapter→Series num único lugar, com cache-first embutido.
Substitui a inteligência espalhada por `KavitaSeriesFeature` + `shared/transforms/` (RN).

| Arquivo | Responsabilidade |
|---|---|
| `contentdigest/page/PageDigest.kt` | `sealed interface PageDigest` (Success/Failure). `buildPageDigest(server, chapter, pageIndex, cache, force)` — monta url + dimensões + orientação + proveniência de cache. Cache-first (fresh hit → retorna; stale → retorna stale + refresh em bg; miss/force → busca e grava). |
| `contentdigest/page/ChapterSummary.kt` | Subset dos campos de capítulo já resolvidos **antes** do `ChapterDigest` montar `pages.list` — passado pra baixo pro `buildPageDigest` evitar circularidade (ChapterDigest precisa de PageDigest). |
| `contentdigest/chapter/ChapterDigest.kt` | `interface ChapterFields` + `sealed interface ChapterDigest` (Success/Failure) + `ChapterNeighborDigest` (sem prev/next, corta recursão). `buildChapterDigest(...)`. `pages` (list de `PageDigest`, `resumePoint`, status). `readStatus` calculado de `pages.count/readCount`. prev/next mesclados no write, não sobrescritos. |
| `contentdigest/series/SeriesDigest.kt` | `interface SeriesFields` + `sealed interface SeriesDigest` (Success/Failure). `buildSeriesDigest(...)`. `chapters` (list de `ChapterDigest` construída chamando o módulo Chapter — mesma camada), `resumePoint` (cascata IN_PROGRESS → UNREAD → null), `metadata` (2ª chamada de rede, `SeriesMetadataDto`), `colors`, `otherIds`. |
| `contentdigest/series/ExternalMetadataDigest.kt` | Digest 2-estados (Success/Failure) da metadata externa de uma série — Success pode ter `match = null` (provider não tem entrada). |
| `contentdigest/error/ErrorDigest.kt` | `data class ErrorDigest(code, message)` compartilhado por Page/Chapter/Series. `code` = nome da classe da exceção (taxonomia real fica pra depois). |

### 2.6 `:cache` — MODELO NOVO, Layer 2 (cache genérico)

Substitui `@Volatile var` do `LibraryModule`, `chapter_cache`/`series_detail_cache` como
mecanismo, `Mutex`+`Map` à mão.

| Arquivo | Responsabilidade |
|---|---|
| `cache/Cache.kt` | Facade: `persistent` / `memoryKotlin` / `network` + `storeFor(mode)`. Injetado explicitamente nos builders do digest (nunca singleton de módulo). |
| `cache/CacheStore.kt` | Contrato comum de `persistent`/`memoryKotlin`: `get`/`put`/`invalidate`/`invalidateDomain`/`invalidateVariant`/`purgeExpired`/`purgeOlderThan`. `get()` nunca apaga entrada expirada — o caller decide. |
| `cache/PersistentCache.kt` | Backend Room (`CacheDao`/`CacheEntity`). Sobrevive a restart. |
| `cache/MemoryKotlinCache.kt` | Backend `Map` em processo — vive e morre com o processo Kotlin. Mesmo contrato do persistent. |
| `cache/NetworkCache.kt` | `run(key, ttlMs, block)` — single-flight + TTL em volta de um `suspend`. Shape diferente (não é value store). Generaliza o padrão que `M3Plugin` fazia à mão. |
| `cache/CacheDescriptor.kt` | `enum CacheMode { PERSISTENT, MEMORY_KOTLIN }` + `data class CacheDescriptor` (key/variant/domain/mode/cachedAt/expiresAt) — proveniência que `put()` devolve, embutida no `cache` field de cada digest (`@Transient`). |

### 2.7 `:preferences` — MODELO NOVO, Layer 2 (preferências genéricas)

Substituiu `series_sort_prefs` (tabela dedicada) e `ui_preferences` por inteiro (essa última
dropada na Task 039 — sort de capítulo, layout da Library e os 2 toggles de leitura já vivem
aqui; idioma virou locale por-app do SO).

| Arquivo | Responsabilidade |
|---|---|
| `preferences/Preferences.kt` | Facade: `get`/`put`/`delete`/`deleteDomain` (key/value/domain/variant). Passthrough fino pro `PreferenceDao`. Sem TTL — preferência é fonte de verdade, nunca "stale". |
| `preferences/PreferenceDescriptor.kt` | `data class PreferenceEntry` (value/updatedAt) + `data class PreferenceDescriptor` (o que `put()` devolve). Sem `mode` — backend único (Room). |

### 2.8 `:external-metadata-server` — MODELO NOVO, Layer 1 + 2 (metadata externa)

Substitui `features/bff/BffFeature.kt`. Módulo próprio porque serve um propósito diferente
(enriquecimento correlacionado por id, não leitura de conteúdo).

| Arquivo | Responsabilidade |
|---|---|
| `externalmetadataserver/ExternalMetadataServer.kt` | Facade: gerencia grupos (`ExternalMetadataGroupDao`), `providers`, `match`/`matches` (dado um batch de referências de série, devolve matches de metadata). Expõe `ExternalMetadataResponse<T>`. |
| `externalmetadataserver/ExternalMetadataServerModule.kt` | Hilt wiring. |
| `externalmetadataserver/plugins/ExternalMetadataPlugin.kt` | Interface + shapes provider-agnósticos. Sem árvore serial/chapter/page — só "dado batch de séries, retorna metadata". |
| `externalmetadataserver/plugins/m3/M3Plugin.kt` | Plugin "m3" real (o BFF pessoal do usuário). Usa `Cache.network` pro single-flight (migrado na Task 023). |

### 2.9 `:app` — shell Android + bridges RN↔Kotlin

Mistura os dois modelos: bridges antigos ainda vivos + bridges novos.

| Arquivo | Modelo | Responsabilidade |
|---|---|---|
| `MainApplication.kt` | comum | `Application` Hilt. Injeta tudo no `AppReactPackage`. Roda `OtaManager.discardStaleBundleIfNeeded()` no `onCreate`. `getJSBundleFile()` (OTA). |
| `MainActivity.kt` | comum | `ReactActivity`. |
| `SplashActivity.kt` | comum | Splash nativo (antes do RN subir). |
| `AppReactPackage.kt` | comum | **Registro central de todos os `NativeModule`s.** Monta cada bridge à mão em `createNativeModules()` (não é Hilt no construtor do bridge — Hilt injeta as deps *no `AppReactPackage`*). Também registra `ReaderPageListViewManager`. |
| `CrashGuard.kt` | comum | Conta crashes pra decidir rollback do OTA. |
| `ReactBridgeSupport.kt` | comum | Helpers compartilhados de bridge: `ReactApplicationContext.emitEvent(name, params)` (guarda janelas inseguras) + `Result<T>.resolveOrReject(promise, code, transform)`. |
| **Bridges do modelo ANTIGO** | | |
| `SeriesModule.kt` | antigo | `getSeriesDetail`, `getCachedChapters`, `markChaptersRead/Unread`, emitter `seriesFollowedIds`. Já perdeu ~9 métodos na Task 024. Ainda usado por `ReaderService`/`useReader`. `emitProgressChanged` **removido** (Task 025). |
| `LibraryModule.kt` | antigo | `listSeries` (batch via `KavitaSeriesFeature` + `BffFeature`), `toggleFollow`, `syncBff`. Cache em memória (2 min TTL). Alvo de reescrita: Task 036. |
| `ReaderChapterModule.kt` | antigo/limítrofe | Thin RPC sobre `ChapterDataSource` (`getPageUrls`, `getPageDimensions`, `getLocalProgress`, `saveReadingProgress`…). Fica até o Reader migrar (Task 029/030). `emitProgressChanged` **removido** (Task 025). |
| `StartupModule.kt` | antigo | Bridge do `SplashSyncCoordinator` + `ServerConfigDao`/`FollowedSeriesDao` pro splash. |
| `SetupModule.kt` | antigo | Bridge do setup: `KavitaUrlSource` + `KavitaAuthFeature` + `BffFeature` (testar conexão, autenticar). |
| `ScreenControlModule.kt` | comum | `keepScreenOn`/`allowScreenOff`/`getKeepScreenOnDuringReading` — genérico, não é do Reader. |
| `NetworkStatusModule.kt` | comum | Stream `activeUrlChanged` (via `ActiveUrlWatcher`) — genérico, origem nativa. |
| `OtaEventBridge.kt` | comum | Emite `otaBundleReady` pro RN quando um bundle OTA fica pronto. |
| `OtaBindingsModule.kt` | comum | Hilt `@Binds` do OTA. |
| `ReaderPageListView.kt` / `ReaderPageListViewManager.kt` | comum | Wrapper `AbstractComposeView` que expõe o `ReaderPageList.kt` (Compose) como uma única view nativa pro RN. |
| **Bridges do modelo NOVO** | | |
| `DigestBridgeModule.kt` | novo | RN→Kotlin pros builders do `:content-digest` (`getPageDigest`, `getChapterDigest` com `{full, force}`, `getSeriesDigest`). |
| `DigestBridgeMappers.kt` | novo | `toWritableMap()` pra todos os ~15 tipos aninhados de PageDigest/ChapterDigest/SeriesDigest. |
| `ServerBridgeModule.kt` | novo | RN→Kotlin pro `:server` (grupos de servidor, `listSerials`, reads/writes plugin-level diretos: `setChapterRead`, progresso). |
| `CacheBridgeModule.kt` | novo | RN→Kotlin pro `:cache` (`persistentX`/`memoryKotlinX` × get/put/invalidate/purge). `network` **não** exposto (o `block` é função Kotlin, não cruza a ponte). |
| `CacheBridgeMappers.kt` | novo | `toWritableMap()` dos tipos do `:cache` (público — `CacheDescriptor` é reusado pelo `DigestBridgeMappers`). |
| `PreferencesBridgeModule.kt` | novo | RN→Kotlin pro `:preferences` (get/put/delete/deleteDomain, sem prefixo — backend único). |
| `PreferencesBridgeMappers.kt` | novo | `toWritableMap()` dos tipos do `:preferences`. |
| `ExternalMetadataBridgeModule.kt` | novo | RN→Kotlin pro `:external-metadata-server` (grupos + `match`/`matches`). |
| `FollowedSeriesBridgeModule.kt` | novo | RN→Kotlin pro `FollowedSeriesDao` (follow 100% local). Separado do `SeriesModule` de propósito — só o DAO de follow, pro `SerieTool` novo depender direto. |

---

## 3. Frontend — `frontend/src/`

### 3.1 Entrada + navegação (comum)

| Arquivo | Responsabilidade |
|---|---|
| `App.tsx` | Raiz do app: providers (i18n, app-shell state), `RootNavigator`. |
| `navigation/RootNavigator.tsx` | Stack raiz: STARTUP → SETUP → MAIN (tabs) → SERIES_DETAIL → READER → NOTIFICATIONS. |
| `navigation/MainNavigator.tsx` | Bottom tabs: FOLLOWING (se há séries seguidas) / LIBRARY / CONFIG. |
| `navigation/routes.ts` | Nomes de rota + helpers (`seriesDetailRoute`, `readerRoute`, `originRouteFor`). `SERIES_DETAIL` serve a `SerieScreen` nova (a legada foi deletada). |
| `native/OtaModule.ts` | Bridge RN do OTA + `OtaEmitter` (`otaBundleReady`). |

### 3.2 `shared/bridge/` — tipos + acesso aos NativeModules

Uma pasta, os dois modelos misturados. `index.ts` reexporta tudo, renomeando os tipos legados
pra `Legacy*` pra não colidir com os reais do `digest.ts`.

| Arquivo | Modelo | NativeModule / conteúdo |
|---|---|---|
| `bridge/series.ts` | antigo | `SeriesBridge` (`NativeModules.SeriesModule`), `SeriesFollowedEmitter`. Tipos `Chapter`/`ChapterReadStatus`/`SeriesDetail` → exportados como `Legacy*`. Usado por `ReaderService`/`useReader`. |
| `bridge/library.ts` | antigo | `LibraryBridge` (`NativeModules.LibraryModule`), `SeriesSummary`, `LibraryViewMode`/`LibrarySortMode`. |
| `bridge/chapter.ts` | antigo/limítrofe | `ReaderChapterBridge` (`NativeModules.ReaderChapterModule`), `ScreenControlBridge`, `LocalProgress`, `PageDimension`. Reexporta `Chapter`/`ChapterReadStatus` de `series.ts`. |
| `bridge/page.ts` | antigo/limítrofe | `ReaderBridge` (`NativeModules.ReaderChapterModule`, mesmo módulo, outra fatia), `PageCacheEntry`. |
| `bridge/config.ts` | antigo | `ConfigRepository` + `DbValidator` (`NativeModules.ConfigRepository`/`DbValidator`). Tipos `ServerConfig`/`AuthConfig`/`UiPreferences`/`BffServerConfig`/`DbStatus`. |
| `bridge/db-validator.ts` | antigo | `DbValidationResult`. |
| `bridge/network.ts` | comum | `ActiveUrlChangedEmitter` (`NativeModules.NetworkStatusModule`) — Mecanismo 2. |
| `bridge/startup.ts` | antigo | `StartupBridge` (`NativeModules.StartupModule`). |
| `bridge/digest.ts` | **novo** | Espelha 1:1 os digests do `:content-digest` via `DigestBridgeModule`. `PageDigest`/`ChapterDigest`/`SeriesDigest` (Success/Failure via `isSuccess`), `ImageDescriptor`, `ServerActiveInfo`, `ErrorDigest`, `ChapterReadStatus` (o **real**, atual). |
| `bridge/server.ts` | **novo** | `ServerBridge` (`NativeModules.ServerBridgeModule`). `PluginSerial`/`PluginChapter`/`PluginProgress`/`PluginPageDimension`, grupos de servidor. |
| `bridge/cache.ts` | **novo** | `CacheBridge` (`NativeModules.CacheBridgeModule`). `CacheEntryBridge`/`CacheDescriptorBridge`/`CacheMode`. |
| `bridge/preferences.ts` | **novo** | `PreferencesBridge` (`NativeModules.PreferencesBridgeModule`). `PreferenceEntryBridge`/`PreferenceDescriptorBridge`. |
| `bridge/external.ts` | **novo** | `ExternalMetadataBridge` (`NativeModules.ExternalMetadataBridgeModule`). `ExternalMetadataMatch`, grupos, `match`/`matches`. |
| `bridge/followedSeries.ts` | **novo** | `FollowedSeriesBridge` (`NativeModules.FollowedSeriesBridgeModule`). Follow local — pro `SerieTool` depender direto. |
| `bridge/index.ts` | comum | Barrel. Documenta o que é legado (`series.ts` → `Legacy*`) e o que é atual. |

### 3.3 `shared/managers/` — MODELO NOVO, infra RN (Layer 3)

Não são "tools de domínio" — são infra genérica, irmãs do `:cache`/`:preferences` do lado RN.

| Arquivo | Responsabilidade |
|---|---|
| `managers/caches/cache.manager.ts` | `CacheManager` — hub que despacha por `mode` (PERSISTENT/MEMORY_KOTLIN/MEMORY/NETWORK) pra o handler certo. |
| `managers/caches/cache.types.ts` | Tipos de arg compartilhados (`CacheManagerGetArgs` etc.). |
| `managers/caches/modes/persistent/persistent.mode.ts` | Handler PERSISTENT → `CacheBridge.persistentX`. |
| `managers/caches/modes/memory/memory.mode.ts` | Handler MEMORY (RN-only, `Map` em JS) + MEMORY_KOTLIN → `CacheBridge.memoryKotlinX`. |
| `managers/caches/modes/network/network.mode.ts` | Handler NETWORK — implementado em JS puro (o `block` não cruza a ponte). |
| `managers/caches/modes/modes.types.ts` | Contrato `CacheManagerModeHandler` que cada mode implementa. |
| `managers/preferences/preferences.manager.ts` | `PreferencesManager` — passthrough fino pro `PreferencesBridge` (get/put/delete/deleteDomain), com `Methods.requireArgs` guardando chamadas de JS puro. |
| `managers/preferences/preferences.types.ts` | Tipos de arg. |
| `managers/events/event-bus.manager.ts` | **`EventBus`** (singleton pub/sub em memória) + `createEvent<T>(name)` + hook `useEvent(token, handler)`. Mecanismo 3 (RN→RN). Proteção contra ciclo de cadeia (mesmo token reentrando / profundidade > 50). |
| `managers/events/event-bus.types.ts` | `EventToken<T>`, `EventHandler<T>`, `EventBusManagerContract`. |

### 3.4 `shared/services/` — MODELO NOVO, Layer 4 (Services RN)

Wrappers finos: agregam Layer 3 (digest) ou Layer 2 (server) em dados prontos pra tela. Sem
cache, sem transformação — o caller recebe exatamente o que o bridge produziu.

| Arquivo | Responsabilidade |
|---|---|
| `services/chapters/chapters.services.ts` | `ChapterService` — `get`/`getFull` via `DigestBridge.getChapterDigest`; `raw`/`progress`/`status` via `ServerBridge` (reads/writes plugin-level que o digest só agrega). `status.set({seriesId, chapterId, isRead})` — o caminho novo de marcar lido. |
| `services/pages/pages.services.ts` | `PageService` — `get` via `DigestBridge.getPageDigest`; `raw` via `ServerBridge`. |
| `services/serials/serials.services.ts` | `SerialsService`/`SerialService` — namespace batch: `list` direto no `ServerBridge.listSerials` (não há digest batch). `get`/`getFull` (série única, `{full, force}`), `chapters.status.set` (batch mark). |
| `services/servers/servers.services.ts` | `ServersService`/`ServerService` — grupos de servidor (`groups.list`, `group.active.set`). |
| `services/servers/external.services.ts` | `ExternalMetadataService` — `match`/`matches` via `ExternalMetadataBridge`. |

### 3.5 `shared/tools/` — MODELO NOVO, Layer 3 (normalizers de domínio + tools genéricos)

Diferente dos `managers` (infra): aqui é onde a **forma canônica** de cada domínio é definida
no RN, e as ações otimistas (mark read/unread, follow) vivem.

| Arquivo | Responsabilidade |
|---|---|
| `tools/chapters/chapters.tool.ts` | `ChapterTool` — `normalize(ChapterDigestSuccess → SerieChapter)`, `mark.read/unread/toggle` (otimista → confirma → reverte via `onUpdate` **e** `EventBus.emit(ChapterEvents.readStatusChanged, …)`). `ChapterEvents` (token do EventBus declarado aqui, junto de quem emite). `ChaptersTool.sort` (prefs de sort de capítulo: global + override por série, via `PreferencesManager`). |
| `tools/series/serie.tool.ts` | `SerieTool` — `normalize(SeriesDigestSuccess → Serie)` (cada capítulo normalizado pelo `ChapterTool`), `isFollowed`, `toggleFollow` (otimista via `FollowedSeriesBridge`). |
| `tools/actions/action.tool.ts` | Tool genérico: `ActionContract` (dado puro, sem função) + `createNavigateAction(...)` — vocabulário de "o que acontece na interação" sem saber como. EventBus-ready. |
| `tools/methods/methods.tool.ts` | Tool genérico: `Methods.requireArgs(...)` (guarda campos obrigatórios contra chamada de JS puro) + walker que transforma métodos pra aceitarem versão parcial do seu arg-objeto. |

### 3.6 `shared/transforms/` — MODELO ANTIGO (funções puras de domínio, RN)

Onde a lógica de domínio compartilhada morava no modelo antigo. Sendo substituída pelos
digests (Kotlin) + `tools` (RN).

| Arquivo | Modelo | Responsabilidade | Situação |
|---|---|---|---|
| `transforms/series.ts` | antigo | Funções puras do domínio série (ordenação, progresso). | ativo — `LibraryTransform`/`useLibrary` (legado). |
| `transforms/chapter.ts` | antigo | Funções puras do domínio capítulo. | ativo — `serie.hooks.ts` diz "reescrito aqui em vez de reusar isto (legado)". |
| `transforms/page.ts` | antigo/limítrofe | `ChapterWithPages`, `currChapterOf`, `ViewerChapters` — trio prev/curr/next do Reader. | ativo — `useReader`. |
| `transforms/sortConfig.ts` | limítrofe | Deriva config de sort de capítulo. | ativo — compartilhado entre `ChaptersTool.sort` e a tela de config. |
| `transforms/kavitaApiKey.ts` | comum | `extractKavitaApiKey(...)` — parseia a apiKey de um input colado. | ativo — `ConfigScreen`/`SetupScreen`. |

### 3.7 `screens/` — telas

| Tela / arquivo | Modelo | Responsabilidade | Situação |
|---|---|---|---|
| **serie/** (`serie.screen.tsx`, `hooks/serie.hooks.ts`, `serie.types.ts`, `serie.styles.ts`, `components/{header,chapter-list-item,selection-bottom-bar,chapter-sort-config-modal}`) | **NOVO** | Detalhe de série, sobre a stack nova: `SerialService.get` (digest), `SerieTool`/`ChapterTool`/`ChaptersTool`. Marca lido via `ChapterTool.mark.*` → emite no EventBus. | ativo, roteado em `SERIES_DETAIL`. Substituiu `screens/series-detail/` (deletada, 18 arquivos, Task 024). |
| **library/** (`LibraryScreen.tsx`, `LibraryService.ts`, `LibraryTransform.ts`, `useLibrary.ts`, `components/{SeriesCard,SeriesListItem}`) | **ANTIGO** | Grade/lista de séries. `LibraryService` → `LibraryBridge.listSeries` (`SeriesSummary`, stack legada). `useLibrary` escuta `ChapterEvents.readStatusChanged` (EventBus) pra reação otimista + refetch. | ativo. Reescrita sobre digest stack = **Task 036**. |
| **following/** (`FollowingScreen.tsx`) | antigo | Reusa `useLibrary` com `filter: s => s.isFollowed`. | ativo. Segue a sorte da Library (Task 036). |
| **reader/** (`ReaderScreen.tsx`, `useReader.ts`, `ReaderService.ts`, `PageService.ts`, `ReaderTransform.ts`, `SduNode.ts`, `ReaderSduNodes.ts`, `components/*`) | **ANTIGO** (data) + exceção nativa (render) | `useReader` orquestra o trio prev/curr/next. `ReaderService` → `ReaderChapterBridge` (`ChapterDataSource`) + `SeriesBridge` legado (mark read/unread). Renderização = view nativa Compose (`ReaderPageListView`). | ativo. Migração pra `ChapterTool`/digest = **Task 029/030**. Marca lido pelo caminho legado → não emite `ChapterEvents` ainda. |
| **config/** (`ConfigScreen.tsx`, `useConfig.ts`, `ConfigService.ts`, `ConfigTransform.ts`, `DebugSmokeTest.ts`, `components/{ApiKeyForm,ServerForm,ServerList,StatusBadge,PreferencesSection}`) | antigo (config) + novo (sort prefs, smoke test) | Config de servidor/apiKey/BFF/preferências. `useConfig` → `ConfigRepository` (legado). Sort de capítulo já usa `ChaptersTool` (novo). `DebugSmokeTest.ts` = teste manual de rede real dos Services novos (Page/Chapter/Serial/Server). | ativo. |
| **setup/** (`SetupScreen.tsx`) | antigo | Onboarding: URL + apiKey do Kavita, testa conexão. → `SetupBridge`/`ConfigRepository`. | ativo. |
| **splash/** (`SplashScreen.tsx`, `useSplash.ts`, `activateFirstServerGroup.ts`) | antigo + patch novo | `useSplash` roda o sync (`StartupBridge` → `SplashSyncCoordinator`) + checa OTA. `activateFirstServerGroup.ts` = **patch do modelo novo**: ativa um grupo de servidor (`:server` só guarda `activeGroupId` em memória) antes de qualquer bridge nova ser chamada pós-boot. | ativo. |
| **search/** (`SearchScreen.tsx`) | placeholder | "Em breve (Plano 009)". | stub. |
| **notifications/** (`NotificationsScreen.tsx`) | placeholder | "Em breve (Plano 008)". | stub. |

### 3.8 `shared/components/` — componentes genéricos (comum)

Dummy components: só renderizam props, nunca chamam service (regra `mistakes.md` #2).

| Arquivo | Responsabilidade |
|---|---|
| `components/AppShellState.tsx` | Context do estado global de shell (ex.: trigger de `refresh` cruzando telas). |
| `components/AppAlert.tsx` | Diálogo de alerta genérico. |
| `components/AppVersions.tsx` | Rodapé com versão do APK + do bundle JS (F:). |
| `components/FollowStar.tsx` | Estrela de follow (só visual, recebe `active`). |
| `components/ScrollToTopButton.tsx` | Botão flutuante de voltar ao topo. |
| `components/ChapterSortConfigFields.tsx` | Campos do modal de config de sort de capítulo (compartilhado entre Config e SerieScreen). |

### 3.9 `shared/i18n/` — internacionalização (comum)

| Arquivo | Responsabilidade |
|---|---|
| `i18n/strings.ts` | Todas as strings, por idioma (pt-BR, en). |
| `i18n/LanguageContext.ts` | Context do idioma ativo. |
| `i18n/useStrings.ts` | Hook `useStrings()` / `useLanguage()`. |

---

## 4. Estado da migração — o que falta cortar

| Área | Antigo (vivo) | Novo (destino) | Task |
|---|---|---|---|
| Library / Following | `LibraryModule` + `KavitaSeriesFeature.listSeries` + `chapterCacheDao` + `SeriesSummary` + `LibraryTransform`/`transforms/series.ts` | `SerialsService.list` + `SeriesDigest` + `SerieTool` | **036** |
| Reader (dados) | `ReaderChapterModule` + `ChapterDataSource`/`KavitaChapterFeature` + `SeriesBridge` legado pra mark | `ChapterService`/`PageService` (digest) + `ChapterTool.mark.*` | **029 / 030** |
| Reader → EventBus | mark pelo Reader não emite `ChapterEvents.readStatusChanged` | passa a emitir quando migrar pro `ChapterTool` | 029/030 |
| Auth Kavita | `KavitaAuthFeature` + `AuthConfigDao` | `:server/plugins/kavita/auth/KavitaAuth.kt` | (plano 017 impl.) |
| Seleção de URL | `KavitaUrlSelector` + `ServerConfigDao` | lógica sobe pro `:server` (lê `ServerGroupDao`/`ServerUrlDao`) | 012/014 |
| Metadata externa | `features/bff/BffFeature` + `BffMatchDao`/`BffServerConfigDao` | `:external-metadata-server` + `M3Plugin` + `ExternalMetadata*Dao` | (plano 017 impl.) |
| Cache | `chapter_cache`/`series_detail_cache` + `@Volatile` do `LibraryModule` | `:cache` (`CacheDao` genérico) | em progresso |
| Preferências | ~~`series_sort_prefs` + `ui_preferences`~~ | `:preferences` (`PreferenceDao` genérico) | **feito** — 12→13 (sort), Task 036 (layout), Task 039 (`ui_preferences` dropada, toggles de leitura → `readerPrefs`) |
| Sync do splash | `SplashSyncCoordinator` grava no cache Room antigo | (a redefinir quando Library/Reader migrarem) | — |
| Follow de série | `SeriesModule` emitter `seriesFollowedIds` (origem Room, fica) + `LibraryBridge.toggleFollow` (legado) vs. `FollowedSeriesBridge.toggle` (novo) | unificar; investigar se os dois caminhos disparam o mesmo emitter | (candidato EventBus / a investigar) |
| CacheManager (RN) | — | `shared/managers/caches` existe; `purgeExpired`/`purgeOlderThan` sem caller (rotina de splash futura) | deferido |

---

## 5. Convenções que distinguem os modelos num relance

**É modelo antigo se:**
- Importa de `shared/bridge/series.ts` ou `shared/bridge/library.ts` (`SeriesBridge`, `LibraryBridge`, `Legacy*`).
- Importa de `shared/transforms/{series,chapter}.ts`.
- Vive em `screens/<x>/<X>Service.ts` + `<X>Transform.ts` (sufixo PascalCase, arquivo por tela).
- Kotlin: está em `features/kavita/KavitaXFeature.kt` ou é um `NativeModule` nomeado por tela.
- Lê `chapterCacheDao`/`seriesDetailCacheDao` direto.

**É modelo novo se:**
- Importa de `shared/bridge/digest.ts`, `shared/bridge/server.ts`, `shared/bridge/cache.ts`, `shared/bridge/preferences.ts`, `shared/bridge/external.ts`, `shared/bridge/followedSeries.ts`.
- Importa de `shared/services/<domain>/`, `shared/tools/<domain>/`, `shared/managers/`.
- Kotlin: está num módulo Gradle próprio (`:server`, `:content-digest`, `:cache`, `:preferences`, `:external-metadata-server`).
- Segue nomes kebab-case por pasta (`serie.hooks.ts`, `chapters.tool.ts`, `event-bus.manager.ts`).
- Fala em "digest", "plugin", "ServerActiveInfo", "CacheDescriptor", "EventToken".
