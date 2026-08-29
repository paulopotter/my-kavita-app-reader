---
task: 013 - formalize-communication-mechanisms
plan: 017 - Reestruturacao
date: 2026-08-29
status: done
---

# 013 - EventBus RN→RN — implementação de referência (follow-up)

> A Task 013 foi fechada em 2026-08-21 como **design only**. Este doc registra o
> ciclo de implementação do Mecanismo 3 (RN→RN `EventBus`), feito em 2026-08-29
> junto com a Task 025. O design/contrato dos 3 mecanismos permanece no arquivo
> da task e em `_contract-design-notes.md` § "Task 013".

## O que foi entregue

Implementação de referência do **EventBus RN→RN** — o único mecanismo dos 3 que a
Task 013 modelou mas não construiu.

- **`frontend/src/shared/managers/events/`** (módulo novo):
  - `event-bus.manager.ts` — `EventBus` singleton (pub/sub em memória, `emit`
    síncrono), `createEvent<TPayload>(name): EventToken`, hook
    `useEvent(token, handler)` (assina pelo ciclo de vida do componente, handler
    lido via ref).
  - `event-bus.types.ts` — `EventToken<TPayload>` (`{ name; __payload? }` — campo
    phantom carrega o tipo só em compile-time), `EventHandler`,
    `EventBusManagerContract`.
  - `event-bus.tests.ts` — 16 testes; `event-bus.manager.ts` a 100%.
  - `index.ts` — barrel.
- **Localização**: `managers/` (irmã de `caches`/`preferences`), **não**
  `shared/tools/` — o design falava em "Layer-3 tool", mas o usuário corrigiu:
  é infra de comunicação, não um tool de domínio.
- **Proteção contra ciclo de cadeia** (adição sobre o design original, a pedido
  do usuário): `emit` rastreia a pilha de emits síncronos. Reentrância do mesmo
  token (`X→X`, `X→Y→X`) lança na hora com o trail do ciclo; cadeia sem repetir
  token além de `MAX_CHAIN_DEPTH = 50` lança um erro de backstop. Erros do guard
  (prefixo `EventBus:`) propagam através de emits aninhados; erro de handler
  comum fica contido. Cadeia assíncrona não é rastreada (sai da pilha) — de
  propósito, não é loop de pilha.
- **Convenção de nome de evento** — resolvida como a task previa ("deferida pro
  caso real"): módulo emissor exporta `export const XEvents` const com seus
  tokens; quem escuta importa `XEvents.token` (autocomplete, sem string solta).
  String interna do `createEvent('...')` é escolha do módulo dono.
- **1º caso de uso real** (detalhado no completion da Task 025):
  `ChapterTool.mark.*` emite `ChapterEvents.readStatusChanged` (fases
  optimistic/confirmed/reverted); `useLibrary` escuta. Substitui o
  `NativeEventEmitter` `seriesProgressChanged` legado.

Mecanismos 1 (RN→Kotlin) e 2 (Kotlin→RN) seguem só formalizados — o Mecanismo 1
tem consumidor concreto pendente na Task 029 (scroll do Reader).

## Como foi testado

- `make coverage` (Kotlin + JS) verde. 16 testes do EventBus + 6 de emissão do
  `ChapterTool` + 8 de reação na `useLibrary`. Suíte JS: 618 passando.
- Piso JS elevado: statements/lines 55→56, functions 73→74 (branches em 90).
- Dispositivo físico real: APK `0.8.0-rc5` / bundle `0.9.0-rc5` via
  `make redeploy-log` (`/tmp/reader-log-v1.txt`) — build/instalação limpos, app
  rodando, navegação e interação sem crash, sem erro JS. Detalhes no completion
  da Task 025.

## Aprovação

O usuário aprovou cada bloco de código no momento em que foi feito, e pediu
explicitamente para fechar "as duas histórias" (Task 025 + Task 013) após
revisar o log do dispositivo. Também pediu, explicitamente, um doc de conclusão
próprio para a Task 013 ("sim").

## Notas

- A Task 013 já estava `status: done` desde 2026-08-21 — **não** passou pela
  `finalizar-task` de novo. O arquivo da task ganhou uma seção "Result —
  implementation follow-up"; o INDEX ganhou a nota do 2º ciclo.
- **Payload é livre por token**: `createEvent<T>` amarra `T` só àquele token;
  não há contrato comum entre eventos.
- **Cadeia de eventos é suportada por design** (um handler que emite dispara o
  próximo listener, síncrono) — a proteção contra ciclo existe justamente para
  um loop equivocado falhar alto em vez de estourar a pilha.
- **`CacheManager` (RN)** continua o outro item "infra RN nova" do plano; o
  EventBus não o toca.
- Follow-up aberto: "follow cross-tela" como possível 2º caso de EventBus,
  pendente de investigar se `FollowedSeriesBridge.toggle` dispara o emitter
  nativo `seriesFollowedIds` existente (se disparar, não precisa de EventBus).
