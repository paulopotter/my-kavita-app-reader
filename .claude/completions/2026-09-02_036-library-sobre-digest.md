---
task: 036 - library-sobre-digest
plan: 017 - Reestruturação
date: 2026-09-02
status: done
---

# 036 - Library sobre o novo stack Server/digest

## O que foi entregue

**Kotlin:** `Server.serials.list()` → `ServerResponse<SerialListData>` com `SerialData`
(`coverImage: ImageDescriptor` normalizado no `:server`). `buildSerialsDigest` (novo,
`:content-digest`, `serial/SerialsDigest.kt`): 1 request, cada item vira um `SerialDigest.Success`
mínimo, sem cache próprio — faz merge no cache por-série (mesma key/variant que
`buildSerialDigest(id)` lê), `lastUpdatedEpochMs` derivado do `cachedAtEpochMs` mais novo, refresh
em background quando stale. `SerialFields.Pages` adicionado. `parseIsoUtcToEpochMs` passou a
aceitar string com `Z`/offset (bug que zerava `lastUpdatesUTC` e quebrava a ordenação por data).

**RN:** `SerialsService.get({ force })` → `SerialsDigest`; `SeriesTool.normalize` reusa
`SerieTool.normalize` por item; `LibraryTool` (tool da tela) compõe `LibraryEntry[]`. `library.hooks.ts`
sem snapshot `Store` (o cache Kotlin é a partida quente), com `bannerState`
(`none`/`confirmed`/`stale`/`offline`) + `<FreshnessBanner>`. Handoff Library↔Following via
`lastAssembled` (módulo) + `LibraryEvents.assembled` (emitido num ponto só, listener só faz
`HYDRATE` — sem loop), lido no lazy initializer do `useReducer` (segunda tela sem frame de
spinner). `seedLibrary()` exportado para a splash. `Following` deixou de ser tela — é
`LibraryScreen` com `route.params.mode`. `onScrollToIndexFailed` no FlatList corrige crash do
índice A-Z.

## Como foi testado

- `npx tsc --noEmit` → 0 erros.
- `npx jest` → 756 testes, 54 suites (inclui testes novos de `buildSerialsDigest`,
  `SerialsDigest.toWritableMap`, `SeriesTool`, `DateTool.format.to.time`, `parseIsoUtcToEpochMs`
  com `Z`, handoff Library↔Following sem loop, lazy-init sem spinner, `seedLibrary`,
  `onScrollToIndexFailed`).
- `./gradlew :tools:testDebugUnitTest :content-digest:testDebugUnitTest :app:testDebugUnitTest`
  → todas passando.
- `./gradlew compileDebugKotlin koverVerify` → BUILD SUCCESSFUL (piso 81).
- `make coverage-js` → pisos JS bumpados 66→68 / 74→77 ao longo da task.
- **Dispositivo físico real** (`make redeploy-log`, rc48 → rc64): Library e Following renderizam
  do digest; ordenação alfabética e "recentes" ok; banner de frescor aparece; troca entre abas
  sem tela de carregar; índice A-Z (modo LIST) não crasha; pull-to-refresh atualiza.

## Aprovação

Usuário aprovou em 2026-09-02, em várias etapas ao longo da implementação (ordenação funcionando,
handoff funcionando, crash corrigido), fechando com "show, funcionou, acho que agora da para
commitar e fechar a task".

## Notas

- **Gap aceito explicitamente:** `downloadedChapters`/`hasErrors`/`publicationStatus` continuam
  vindo só do match BFF quando existe; sem BFF, o card renderiza de `Serie` + `SeriesDigestIndex`.
  Nenhuma exposição nova de BFF/publication-status foi feita.
- **Polimentos deixados para depois (não bloqueiam):** micro-loading residual ao trocar de aba
  (o `viewMode`/`sortMode` das prefs carrega async e corrige o layout depois); 401/token
  esporádico → Task 035; TTL "não re-buscar dentro de N min" → task separada.
- `seedLibrary(entries, lastUpdatedEpochMs)` já está exportado de `library.hooks.ts` pronto para
  a próxima task (splash) plantar o resultado do fetch inicial.
