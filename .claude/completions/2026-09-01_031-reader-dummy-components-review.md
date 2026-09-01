---
task: 031 - reader-dummy-components-review
plan: 017 - Reestruturação
date: 2026-09-01
status: done
---

# 031 - Reader: revisão de componentes burros

## O que foi entregue

Aplicado por inteiro na reescrita do Reader. Todos os achados fechados:

- **`handleVisiblePageChanged` decidindo em vez de repassar** — resolvido. Em
  `frontend/src/screens/reader/reader.screen.tsx`, `handleVisiblePageChanged` só chama
  `reader.onNativePosition(chapterId, pageIndex, pageFraction, chapterFraction)` — repasse
  verbatim dos 4 valores crus. Toda decisão (é um cruzamento? qual direção? descartar o relato?
  mover o foco?) vive no hook (`reader.hooks.ts` — `onNativePosition` → `webtoonReportToTrigger`
  → `moveFocus` → reducer). A tela tem zero lógica de domínio; seus únicos branches são o gate
  de loading/error.
- **`toBlock` → transform (a metade da Task 027)** — `windowToWebtoonBlocks` / `toBlock` em
  `transforms/webtoon-blocks.transform.ts`, módulo puro.
- **Componentes de overlay** — os seis migrados para a estrutura de componente burro do projeto
  (`components/<nome>/<nome>.component.tsx` + `.styles.ts` + `index.ts`): `reader-top-bar`,
  `reader-side-progress-bar`, `reader-thin-progress-bar`, `reader-overlay-footer`,
  `reader-offline-banner`, `reader-page-list-view`. Estilo sempre em arquivo separado; props
  primitivas + callbacks; sem `useEffect` de negócio, sem import de service.
- **Código morto removido** — o bloco `DEBUG_MODE` (um branch `const false`) do
  `ReaderThinProgressBar` e seus estilos órfãos, deletados no commit do corte final.

## Como foi testado

- `yarn tsc --noEmit`, `yarn eslint`, `yarn test:coverage` — verdes; branches 90.51% (piso 90);
  exit 0. Testes de componente diretos adicionados para `reader-side-progress-bar` e
  `reader-page-list-view`.
- Dispositivo real: rc42–rc45 — navegação de capítulo, scroll infinito, overlay validados.

## Aprovação

Usuário nesta conversa: "acho que acabou né? podemos fazer o finalizar as tasks?" e confirmou
fechar 027/029/030/031 juntas.

## Notas

- Coordenada com a Task 027 — as duas metades (transform de dados / decisão no event handler)
  vieram na mesma reescrita.
- Mesmo follow-up da 027: se a camada Transform do RN estiver sendo descontinuada, revisar
  `screens/reader/transforms/*` em task própria.
