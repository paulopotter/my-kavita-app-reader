---
task: 035 - fix-config-setup-session-auth
plan: 017 - Reestruturação de Domínio, Contratos e Salvaguardas
date: 2026-09-03
status: done
---

# 035 - Correction: Config/Setup session & auth (401 on Library/Following)

## O que foi entregue

O bug original (401 do Kavita na Library/Following por JWT expirado sem mecanismo de refresh)
foi corrigido conectando a reautenticação que já existia no `:server` a um gatilho real:
`KavitaSeries`/`KavitaChapter` levantam `ServerAuthException` num content call que volta 401
(`android/server/.../plugins/kavita/KavitaContentError.kt`, `ServerPlugin.kt`), e
`Server.withUrlRetry` (`android/server/.../Server.kt`) captura isso, chama
`reauthenticateActiveGroup` (login completo via apiKey, mesma URL) e refaz a chamada uma vez —
401 persistente propaga pro setup.

Junto veio a migração completa da tela Config/Setup para `:server`/`ServerService`: nova árvore
`frontend/src/screens/config/` no padrão pasta-kebab (router thin `config.screen.tsx` +
sub-telas `server/`, `reader/`, `serie/`, `debug/`, `setup/` + componentes dumb), seção de
servidor de metadados sobre `:external-metadata-server` com associação URL→URL, i18n completo
genérico (nome do provider vem do `:server`), `healthCheckPath` vindo do plugin, sincronização
de idioma app↔SO via `LocaleManager` + `onConfigurationChanged`, e cascata servidor→metadados
via `ServerEvents.activeUrlChanged` (EventBus RN→RN) + `resolveMetadataServer()` na splash.

Router trocado (`MainNavigator`/`RootNavigator` → árvore nova) e legado apagado: `ConfigScreen.tsx`
(1005 linhas), `ConfigService.ts`, `ConfigTransform.ts`, `DebugSmokeTest.ts`, `useConfig.ts`,
`screens/setup/` inteiro, componentes órfãos, e `shared/transforms/` extinto por completo
(`ChapterSortConfigFields` migrado para `screens/serie/components/chapter-sort/`, modal de sort
dissolvido na `serie.screen.tsx`).

## Como foi testado

- `make coverage` — verde. Kotlin `koverVerify` OK (`COVERAGE_FLOOR_KOTLIN=83`). JS: 840 testes,
  floor bumpado (statements/lines 71→88, functions 78, branches 90).
- `:server` — 60 testes, 2 novos: "401 num content call re-autentica e refaz uma vez, sem
  re-selecionar URL" e "401 que persiste após reauth propaga".
- `:content-digest` — teste do fix "SerieScreen abre vazia quando o cache só tem a linha da lista"
  (`buildSerialDigest` trata hit fresco com `chapters == null` como miss e refaz o fetch).
- `yarn tsc --noEmit` limpo; `yarn eslint src --quiet` limpo.
- **Device real** (`make redeploy-log`, do rc82 ao rc98): o usuário confirmou em várias rodadas —
  Config e Setup rodando na árvore nova (menu, sub-telas, back físico, unlock do Debug); dot do
  servidor de metadados (M3) verde ao abrir a tela; SerieScreen abrindo com capítulos direto
  (fix rc95, era entrada de cache semeada só pela rota da lista). O 401 em runtime não chegou a
  reproduzir no device durante os testes (JWT ainda válido na janela testada) — cobertura fica
  pelos 2 testes unitários do `:server`.

## Aprovação

O usuário aprovou nesta conversa em etapas: cada fatia foi validada no device antes de seguir
("funcionou, pode commitar" / "beleza, funcionou"), o route swap foi verificado no app antes da
deleção do legado ("beleza, funcionou. pode apagar o legado"), e a limpeza da camada
`shared/transforms/` + migração do `chapter-sort` foi aprovada explicitamente
("concordo... pode fazer o bump, commitar"). O fechamento da task foi pedido diretamente:
"entao finaliza a task, commita".

## Notas

- **Decisão de design (o 401):** o refresh token do `KavitaAuth.reauthenticate()` só sobrevive
  dentro de uma instância viva do plugin, e o `:server` reconstrói o plugin a cada content call —
  então o caminho útil na prática é o `authenticate()` completo (apiKey), que é o que
  `reauthenticateActiveGroup` já faz. Não foi implementado refresh proativo por expiry; só o
  reativo no 401.
- **Exceção consciente ao invariante** "screen nunca importa de outra screen": `config/serie`
  importa `ChapterSortFields` de `screens/serie/components/chapter-sort/`. Config é a config
  daquela tela; promover para `shared/` só se uma 3ª tela precisar. Documentado no import.
- **`ChaptersTool.sort` permanece só I/O de preferência** (`get`/`put`/`reset`). `sortModeLabel`
  e o parse dos inputs ficam no componente `chapter-sort` — são presentation/i18n, não domínio.
- **`healthCheckPath` do M3:** o plugin declara `/api/health`; se a instância do usuário
  responder liveness noutro path, o dot fica cinza. A auto-correção no `useMetadataServer.reload`
  alinha um grupo legado ao valor do plugin.
- **Idioma:** não há mais preferência `language` no app — o per-app locale do SO é a fonte da
  verdade. Coluna `language` no Room `ui_preferences` mantida (sem migração), só deixou de ser
  lida/escrita.
- **Logs de diagnóstico** (`MMR-DIAG`) usados para caçar o dot do M3 e o 401 ficaram comentados
  no `ActiveUrlSelector`, `ExternalMetadataServer` e `useMetadataServer` apontando pro backlog 015.
- **Follow-ups já registrados:**
  - Backlog 021 — revisão da estrutura de testes (a convenção "um `<name>.tests.tsx` por
    sub-tela juntando hook + screen" foi o experimento desta task). Task spawnada em paralelo:
    mock-bleed entre `reader.tests.tsx`/`serie.tests.tsx` quando rodados como subset.
  - Limpeza pendente (fora do escopo, próximo passo combinado com o usuário): `.gitkeep`
    redundantes, migração dos componentes antigos em `shared/components/` (`AppAlert`,
    `FollowStar`, `ScrollToTopButton`) e das screens stub `NotificationsScreen`/`SearchScreen`
    pro padrão pasta-kebab.
