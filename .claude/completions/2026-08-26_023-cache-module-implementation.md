---
task: 023 - cache-module-implementation
plan: 017 - Reestruturacao
date: 2026-08-26
status: done
---

# 023 - Cache (Kotlin) + CacheManager (RN) implementation

## O que foi entregue

O lado Kotlin (`:cache`) já estava implementado, testado e commitado antes desta sessão. Nesta
sessão: (1) `DigestBridgeMappers.kt` parou de descartar o `CacheDescriptor` real que
`PageDigest`/`ChapterDigest`/`SeriesDigest` já carregavam internamente — antes sempre mandava
`cache: null` pro RN (commit `e4f74f0`); (2) implementado `CacheManager` (RN) em
`frontend/src/shared/managers/caches/` — um hub raiz que despacha por `mode`
(`PERSISTENT`/`MEMORY_KOTLIN`/`MEMORY`) para 3 módulos (`persistent/`, `memory/`, `network/`),
seguindo o mesmo padrão de nomenclatura de `shared/services/` (commit `8817389`). `persistent` e
`memory.external` são passthrough puro sobre o `CacheBridge` já existente; `memory.local` e
`network` ficam declarados como stubs que lançam erro explícito (sem consumidor real ainda).
Adicionado `Methods.requireArgs` (`shared/tools/methods/methods.tool.ts`) como guarda de runtime
genérica contra chamadas que contornem o TypeScript.

## Como foi testado

`make coverage` (Kotlin: piso 76%, inalterado; JS: piso subiu de 46/46/71/87% para
47/47/73/88% statements/lines/functions/branches). 74 testes novos do `CacheManager`, 489 no
total do projeto JS, todos passando. Não testado em dispositivo real — a task não envolveu nenhum
fluxo de UI visível, só módulos de infraestrutura ainda sem consumidor.

## Aprovação

Usuário aprovou explicitamente o fechamento da task nesta conversa, após decidir adiar a conexão
do `CacheManager` a Services reais e o disparo de `purgeExpired`/`purgeOlderThan` na splash para
quando a splash for reescrita na nova arquitetura.

## Notas

- **Divergência do design original**: a task previa 2 modes (`PERSISTENT`/`VOLATILE`); a
  implementação Kotlin real (já commitada antes desta sessão) tem 4 (`PERSISTENT`,
  `MEMORY_KOTLIN`, `MEMORY` RN-only, `NETWORK`). `CacheManager` reflete os 4, não os 2 originais.
- **Passo "atualizar Services pra usar CacheManager" não foi feito, deliberadamente**: investigando
  em sessão, descobrimos que `buildPageDigest`/`buildChapterDigest`/`buildSeriesDigest` (Kotlin)
  já fazem cache-first + stale-while-revalidate inteiramente no Kotlin, antes do RN ver qualquer
  resultado — não sobra decisão de cache pro Service tomar. `CacheManager` fica pronto e testado,
  sem consumidor real, à espera de um caso concreto (invalidação manual, tela de configurações,
  etc.).
- **`purgeExpired`/`purgeOlderThan` na splash**: adiado a pedido do usuário — a splash vai
  interagir bastante com cache/requests em background quando for reescrita, então ligar isso na
  splash atual arriscaria ser retrabalho.
- **Segue para a Task 024** (fix-series), com escopo ampliado pelo usuário: reescrever
  `series-detail` (RN) inteiro sobre `SerialService`/`ChapterService`, levantando lacunas reais
  encontradas (ex: "favoritar" hoje é persistido localmente e deveria estar em outro lugar).
