---
task: 027 - fix-dummy-components-reader
plan: 017 - Reestruturação
date: 2026-09-01
status: done
---

# 027 - Correção: componentes burros (Reader) — `toBlock` → transform

## O que foi entregue

`toBlock` (construção do bloco de capítulo para o nativo) saiu de dentro do componente de tela e
virou `windowToWebtoonBlocks` / `toBlock` em
`frontend/src/screens/reader/transforms/webtoon-blocks.transform.ts` — módulo puro, sem React,
sem I/O. A tela consome via `useMemo`. Entregue como parte da reescrita completa do Reader
(Task 029), não como diff isolado, conforme a nota de coordenação com a Task 031.

## Como foi testado

- `yarn tsc --noEmit`, `yarn eslint src/screens/reader`, `yarn test:coverage` — todos verdes,
  branches 90.51% (piso 90), exit 0.
- Dispositivo real: rc42–rc45 (`make redeploy-log`) — abertura de capítulo, scroll webtoon,
  overlay funcionando.

## Aprovação

Usuário aprovou o resultado da reescrita do Reader nesta conversa ("aparentemente funcionou",
"acho que acabou né? podemos fazer o finalizar as tasks?") e confirmou fechar a 027 junto com
029/030/031.

## Notas

- **Follow-up:** o usuário acredita que a camada "Transform" do RN estava sendo removida na nova
  arquitetura. Os docs (`architecture.md` § Domain Composition) ainda a descrevem e os critérios
  desta task exigiam mover para transform — então foi aplicado assim. Se Transform for de fato
  descontinuado no RN, `screens/reader/transforms/*` e `shared/transforms/*` devem ser revistos
  em task própria. Não bloqueia o fechamento desta.
- A metade "decisão no event handler" do mesmo achado é a Task 031 — fechada no mesmo dia.
