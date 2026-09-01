---
task: 030 - reader-progress-sync-audit
plan: 017 - Reestruturação
date: 2026-09-01
status: done
---

# 030 - Reader: auditoria de sync de progresso local↔servidor

## O que foi entregue

Auditoria completa (relatório file:line no task file) dos pontos onde o leitor grava a posição
de leitura, nos dois stores — local (`ReadingProgressManager.set` → `CacheManager.persistent`) e
servidor (`ChapterService.progress.set` → Kavita) — nos três momentos: timer local de 2s, timer
de servidor de 20s, e `onScreenExit`. Três gaps encontrados e corrigidos, todos em
`frontend/src/screens/reader/hooks/reader.hooks.ts`:

- **GAP 1** — não havia nenhum listener de `AppState` em `frontend/`, então mandar o app para
  background ou o SO matá-lo nunca fazia flush para o servidor (podia ficar 20s+ atrás). Novo
  `useEffect` em `AppState.addEventListener('change')` → `flushProgress` em `background`/`inactive`.
- **GAP 2** — seta/jump recarrega via `openChapter` sem passar por `onScreenExit`, então o
  capítulo sendo deixado nunca era gravado (o cleanup do efeito de timers só faz `clearInterval`).
  Adicionado flush do capítulo de saída no topo de `openChapter`, exceto se reabre o mesmo id.
- **GAP 3** — o timer local de 2s gravava no Room incondicionalmente. Adicionado guard
  `lastLocalSavedRef` (pula quando `page` + `scrollFraction` não mudaram desde o tick anterior).

Os três passam por um helper único `flushProgress(chapter, { page, scrollFraction })` (local
sempre; servidor só se `!isChapterEffectivelyRead`), para o qual `onScreenExit` foi reescrito.

## Como foi testado

- `yarn tsc --noEmit`, `yarn eslint`, `yarn test:coverage` — verdes; 6 testes novos em
  `reader.hooks.tests.ts` (onScreenExit nos dois stores, flush no background, `'active'` NÃO faz
  flush, seta faz flush do capítulo deixado, reabrir o mesmo capítulo NÃO faz flush, capítulo
  já lido pula o servidor). Branches 90.46% → 90.51% (piso 90); exit 0.
- Dispositivo real: usuário confirmou "aparentemente funcionou" após o redeploy com os fixes.

## Aprovação

Usuário nesta conversa: "pode implementar todas" (autorizando os 3 fixes), depois "aparentemente
funcionou", "podemos fazer o finalizar as tasks?".

## Notas

- **Fora de escopo (task própria):** a reconciliação de boot que empurra entradas locais mais
  novas para o servidor e remove as que o servidor já alcançou (refactor da Splash) — sua
  ausência está anotada em `reading-progress.manager.ts:6-9`, não é um achado desta auditoria.
- Não existe fila de sync (o "sync queue" do plano 007 nunca foi construído) — o design atual é
  timer + flush on-exit/on-background.
