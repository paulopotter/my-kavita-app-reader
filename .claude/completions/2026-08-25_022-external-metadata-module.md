---
task: 022 - external-metadata-module
plan: 017 - Reestruturacao
date: 2026-08-25
status: done
---

# 022 - ExternalMetadata/BFF module implementation

## O que foi entregue

Novo módulo Gradle `:external-metadata-server`, irmão de `:server`, seguindo o mesmo padrão
generalizador (facade `ExternalMetadataServer` + adapter `M3Plugin` do zero, sem reaproveitar
`BffFeature`). Inclui estado de grupo ativo replicado do `Server` (mutex, `setActiveGroup`,
`getActive*`), resolução de 2 níveis para "sem pista" (grupo vinculado ao Kavita ativo → pool de
grupos sem vínculo), e `Server.group(id).getInfo()`/`getActiveGroupInfo()` novos como suporte.
Integração completa em `:content-digest` (`SeriesDigest.metadata.external`), Bridge RN
(`ExternalMetadataBridgeModule`), Services RN (`ExternalsService`/`ExternalService`,
`SerialsService.externalDetails`/`SerialService.externalDetail`) e seção nova na tela de Debug.
`BffFeature` permanece intocado em produção — migração dos consumidores reais fica para task
futura.

## Como foi testado

- `make coverage` (Kotlin + JS) passou; ver detalhe no `## Result` da task — atenção: `koverVerify`
  sozinho mede errado, sempre rodar via `make coverage` ou `koverHtmlReport koverXmlReport
  koverVerify` juntos.
- Suíte automatizada: ~50 testes novos em `ExternalMetadataServerTest.kt`/`M3PluginTest.kt`,
  2 novos em `ServerTest.kt`, extensões em `SeriesDigestTest.kt`/`serials.tests.ts`. Todos os
  testes Kotlin e JS passam (411 testes JS, suíte Kotlin completa).
- **Teste em dispositivo físico real**: usuário rodou a tela Config → Debug (seção "External" e
  a extensão da seção "Serial/SerialService") contra seu servidor M3/Kavita real e confirmou
  funcionamento ponta a ponta.

## Aprovação

Usuário confirmou "rodei e parece que funcionou tudo ok" após o teste em device real, e pediu
explicitamente para fechar a task 022 nesta mesma conversa.

## Notas

- **Floors de cobertura bumpados**: Kotlin 76→77 (`COVERAGE_FLOOR_KOTLIN`,
  `android/build.gradle.kts`), JS `45/45/70/86` → `46/46/71/87` (`frontend/package.json`).
- **Gap conhecido, não bloqueante**: `external.services.ts` (RN) ainda não tem testes unitários
  próprios (só o smoke test manual) — os outros arquivos de `shared/services` seguem o padrão de
  bridge mockada, este ainda não. Sinalizado como follow-up.
- **Teste flaky encontrado**: `ExternalMetadataServerTest.kt` tem um teste
  (`match syncByServerId falls back to the unlinked group when no link matches`) que falha só
  quando rodado via `make coverage` (nunca isolado) — provável timing do `Timer` watchdog
  compartilhado em `ActiveUrlSelector.kt` ou reuso de porta do `MockWebServer` entre variantes
  debug/release. Já registrado como task em segundo plano (`task_3e9c47ac`), não investigado
  a fundo aqui.
- **Decisão de design registrada**: `_contract-design-notes.md` § "Task 022" documenta o
  desenho completo — nomes, módulo Gradle próprio, replicação do padrão `Server`, resolução de
  2 níveis, vínculo hierárquico opcional Group/Url.
- **Migração real do RN pendente**: `BffFeature`/`LibraryModule`/`SplashSyncCoordinator`/
  `SetupModule` continuam usando o caminho antigo. Trocar os consumidores reais para o módulo
  novo e então remover `BffFeature` é trabalho de uma task futura (ver prompt gerado para a
  próxima task).
