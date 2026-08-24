---
task: 021 - rn-services-implementation
plan: 017 - Reestruturacao
date: 2026-08-24
status: done
---

# 021 - RN Services (Page/Chapter/Series) implementation

## O que foi entregue

4 RN Services (não 3 — `ServerService`/`ServersService` foi adicionado além do escopo original de
Page/Chapter/Series), cada um em `frontend/src/shared/services/<domínio>/<domínio>.services.ts`:
`PageService`, `ChapterService`, `SerialService`/`SerialsService`, `ServerService`/
`ServersService`. Cada um chama `DigestBridge`/`ServerBridge` diretamente, sem cache. Novo padrão
de nomenclatura de projeto (`nome.type.ext`, testes ao lado do arquivo) e nova tool genérica
`Methods.bound` (`shared/tools/methods/`) para fixar ids repetidos sem estado. Durante a
verificação em device, foi encontrado e corrigido um bug real de travamento indefinido em
`RequestTool`/`ActiveUrlSelector` (`android/tools/`), fora do escopo original mas bloqueando o
teste. Também foi criada uma tela de Debug (`frontend/src/screens/config/`) com smoke test dos 4
Services, usada para validar tudo isso no device real.

## Como foi testado

- `make coverage` (Kotlin + JS): sem queda no piso. 100% statements/branches/functions/lines nos
  4 `*.services.ts` novos e em `methods.tool.ts`.
- `./gradlew koverVerify`: piso Kotlin mantido, projeto inteiro.
- `./gradlew :tools:testDebugUnitTest :server:testDebugUnitTest`: suíte completa passando,
  incluindo testes novos que simulam uma conexão que nunca responde (valida o fix do watchdog).
- **Testado em dispositivo físico real** via `make redeploy-log`, usando a tela de Debug nova
  (Config → 5 toques na versão do app → "Debug" → rodar cada seção): `ServersService`/
  `ServerService` (providers, groups, group, urls, sessão), `SerialsService`/`SerialService`
  (list, get, getFull, raw.get, raw.chapters.list via `bound`), `ChapterService` (get, getFull,
  raw.get, progress.get via `bound`), `PageService` (get, raw.dimensions via `bound`) — todos
  confirmados funcionando ponta a ponta contra o servidor Kavita real do usuário, incluindo após
  o fix do travamento em `RequestTool`.

## Aprovação

Usuário confirmou "funcionou" após o teste em device (build `0.7.0-rc7`/`0.8.0-rc7`) e pediu
explicitamente para fechar a task ("pode fechar a task do services").

## Notas

- **Divergência do escopo original**: a doc original da task usava os nomes `PageContract`/
  `PageResult` etc. (pré-implementação real). Os Services consomem os contratos reais das Tasks
  018-020 (`PageDigest`/`ChapterDigest`/`SeriesDigest`), não os nomes originais.
- **Read/write cresceu além do "GET-only" original**: `ServerBridge` já tinha escritas reais
  (`setChapterRead`, `setChaptersRead`, `setChapterProgress`) nunca conectadas a nenhum Service
  RN — agora vivem junto com `get`/`getFull` de cada domínio. As bridges pré-Digest
  (`SeriesBridge`, `LibraryBridge`, sort prefs, screen-control, BFF sync) continuam intocadas.
- **Bug real encontrado e corrigido, fora do escopo original**: `RequestTool.request`/
  `ActiveUrlSelector.selectFastest` usavam `withTimeout(OrNull)` em cima de uma chamada
  `Call.execute()` bloqueante — sem ponto de suspensão real dentro, o timeout nunca cancelava de
  fato uma chamada travada. Em rede real instável (rádio em economia de energia, troca de rede),
  isso deixava `SerialsService.list()` preso para sempre, sem exceção nem log — reproduzido ao
  vivo via a tela de Debug. Corrigido com um watchdog `java.util.Timer` (thread real, independente
  de coroutines) que chama `call.cancel()` após o timeout.
- **Gap de sessão/auth identificado, não corrigido aqui**: o bug do `RequestTool` só era
  reproduzível porque a sessão do app ainda vive 100% no caminho pré-`:server`
  (`KavitaAuthFeature`/`SetupModule`), sem nenhum refresh de JWT — causa raiz de um 401
  intermitente em Library/Following, registrada como Task 035 nova (`035-fix-config-setup-
  session-auth.md`), que também cobre migrar a tela de Config/Setup para `ServerService`.
- **`Methods.bound` é uma tool nova e genérica** (`shared/tools/methods/methods.tool.ts`) — faz
  merge de objeto parcial (não `.bind()` posicional), com `skipKeys` para excluir métodos que
  estruturalmente não recebem o id fixado (ex: `ServerService.group.add`, que cria um grupo novo
  e por isso não tem `groupId` nenhum).
- Bloqueia a Task 023 (`CacheManager` — os Services construídos aqui são o que passa a usar cache
  em vez de chamar o `Server` direto). Não bloqueia a Task 022 (`ExternalMetadata`/BFF).
