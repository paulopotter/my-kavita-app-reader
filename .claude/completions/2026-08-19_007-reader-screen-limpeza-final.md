---
task: 007 - reader-screen-limpeza-final
plan: 007 - reader-screen
date: 2026-08-19
status: done
---

# 007 - Limpeza e consolidação final do plano Reader Screen

## O que foi entregue

Sessão de fechamento do plano 007 (reader screen), funcionalmente completo desde a implementação
original mas por um caminho arquitetural diferente do desenho (`LazyColumn` nativo Kotlin/Compose
+ Server-Driven UI em vez de `FlashList` + componentes RN dummy). Esta sessão: (1) removeu código
morto confirmado por grep (5 componentes RN dummy, 3 funções de `shared/transforms/page.ts`,
dependência `@shopify/flash-list` e seu wiring manual em Gradle); (2) dividiu `ReaderModule` —
que violava a invariante "Kotlin tool sempre global, nunca screen-coupled" — em
`ReaderChapterModule`/`ScreenControlModule`/`NetworkStatusModule`, introduzindo a interface
`ChapterDataSource` como fronteira real de troca de provedor de dados; (3) tornou o debug logging
(`CoilDiagnostic`) condicional a `ReaderDebugFlags.verboseScrollLogging` (default `false`),
completando uma migração que uma sessão anterior tinha deixado parcial; (4) consolidou
boilerplate repetido entre NativeModules (`emitEvent`/`resolveOrReject` em
`ReactBridgeSupport.kt`); (5) documentou a arquitetura real em `.claude/docs/architecture.md`
(nova seção "Reader Screen — the one native-rendering exception") e registrou 3 pitfalls novos em
`mistakes.md` (#15, #16, #17).

## Como foi testado

- `make coverage` (Kotlin `koverVerify` + Jest) passando a cada etapa da limpeza.
- Suíte completa Kotlin (`./gradlew testDebugUnitTest`, 245 tasks) e JS (`yarn jest`, 304 testes
  em 33 suites) verdes após cada refatoração.
- `/code-review` (high effort, 8 finder angles + verificação) rodado sobre o diff completo da
  limpeza — 4 achados confirmados e corrigidos antes do commit (fronteira `ChapterDataSource`
  incompleta, alocação de lambda no hot path de scroll, migração de logging incompleta,
  `getKeepScreenOnDuringReading` no módulo errado).
- **Teste em dispositivo físico real** via `make redeploy-log` (build `0.6.0-rc85`/`0.7.0-rc87`):
  usuário reportou crash. Log capturado via `adb logcat -d -b crash` revelou
  `RuntimeException: Cannot convert argument of type class kotlin.Unit` — bug introduzido pelo
  helper `resolveOrReject` recém-criado (default `transform` repassava `kotlin.Unit` direto ao
  bridge nativo do RN para todo `Result<Unit>`). Corrigido, novo teste de regressão
  (`ReactBridgeSupportTest`) adicionado, novo build (`0.6.0-rc86`/`0.7.0-rc88`) testado no mesmo
  dispositivo e aprovado pelo usuário ("Acho que está tudo funcionando").

## Aprovação

Usuário aprovou explicitamente após o segundo teste em dispositivo físico: "Acho que está tudo
funcionando (nao foi criado nenhum bug, teoricamente). Com isso pode commitar o que foi feito até
agora, atualizar a documentação, arquitetura, regras de negocio e mistakes."

Decisões intermediárias (remoção de código morto, divisão do `ChapterDataSource` com interface
explícita em vez de convenção implícita, escopo da consolidação de boilerplate) foram confirmadas
passo a passo via perguntas diretas ao usuário ao longo da sessão, não assumidas.

## Notas

- **Breaking change interno (não visível ao usuário final)**: `NativeModules.ReaderModule` não
  existe mais — dividido em `ReaderChapterModule`/`ScreenControlModule`/`NetworkStatusModule`.
  Qualquer código futuro que referencie o nome antigo vai falhar silenciosamente (bridge nativo
  ausente resolve para `undefined`).
- **Débito técnico registrado, não corrigido nesta sessão**: `LibraryModule`/`SeriesModule`
  ainda injetam `KavitaChapterFeature` concretamente (chamam métodos fora do contrato de
  `ChapterDataSource`, como `listChaptersForSeries`/`markChaptersRead`) — assimetria deliberada,
  não um descuido, mas mesma classe de "múltiplos domínios num módulo" que motivou a divisão do
  `ReaderModule`. Se uma 2ª necessidade real de troca de provedor aparecer para esses módulos,
  vale revisitar.
- **Lição principal para o projeto**: a pipeline de release (`.github/workflows/main.yml`)
  recalcula automaticamente a versão semver a partir do `CHANGELOG.md` no push para `main` — os
  números `-rcN` usados durante testes locais neste plano (`0.6.0-rc84` → `rc86`,
  `0.7.0-rc86` → `rc88`) são substituídos pela pipeline, não precisam ser "corretos" nos commits.
- Ver `.claude/docs/architecture.md` § "Reader Screen — the one native-rendering exception" para
  o padrão a seguir caso outra screen precise da mesma exceção de renderização nativa no futuro.
