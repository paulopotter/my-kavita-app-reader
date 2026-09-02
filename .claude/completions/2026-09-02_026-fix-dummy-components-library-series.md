---
task: 026 - fix-dummy-components-library-series
plan: 017 - Reestruturação
date: 2026-09-02
status: done
---

# 026 - Correção: dumb components (Library / SeriesDetail)

## O que foi entregue

**Metade Library:** resolvida na reescrita da Library/Following (Tasks 028/036). A
`library.screen.tsx` já nasceu sem lógica derivada inline — `alphabetIndex`, `paddedData`,
`handleScroll`, `showScrollTop`, sort/view mode vêm todos do `useLibrary`. Os componentes
(`series-card`, `series-list-item`, `alphabet-index`, `freshness-banner`) são primitivos +
callbacks, sem import de service/bridge/tool/hook.

**Metade SeriesDetail:** `handleScroll` / `showScrollTop` / `lastOffsetY` / `headerHeightRef`
saíram da `serie.screen.tsx` e foram para o `useSerie` (que agora expõe `handleScroll`,
`hideScrollTop`, `showScrollTop`, `onHeaderLayout`). O contador de lidos do header
(`chapters.filter(c => c.readStatus === 'READ').length`) passou a usar o `readCount` que o hook já
expunha. A screen restou só com `sortConfigVisible` (visibilidade de modal — UI local pura) e
`listRef` (ref imperativo).

## Como foi testado

- `npx tsc --noEmit` → 0 erros.
- `npx jest` → 756 testes, 54 suites. Novos: 3 casos em `serie.hooks.tests.ts` para a
  visibilidade do botão scroll-to-top (mostra ao rolar pra cima após o header sumir; não mostra
  dentro da altura do header; `hideScrollTop` força esconder) e 2 em `serie.tests.tsx` (a screen
  só fia `onScroll`/`onLayout` para os callbacks do hook).
- **Dispositivo físico real** (`make redeploy-log`, rc64): na tela de detalhe da série, o botão
  "voltar ao topo" aparece ao rolar pra baixo e depois pra cima, e leva ao topo ao ser tocado; o
  contador "X/Y" do header bate com os capítulos lidos.

## Aprovação

Usuário aprovou em 2026-09-02: "Sobre o teste do botão na serie, funcionou" e, depois do fix do
crash do índice A-Z, "show, funcionou, acho que agora da para commitar e fechar a task".

## Notas

- A task original citava "transforms" para as duas telas — não se aplica: a camada `Transform`
  por tela foi eliminada no projeto (Task 037 / commit `c96652d`).
- `ScrollToTopButton`, `Header`, `ChapterListItem`, `ChapterSortConfigModal`, `SelectionBottomBar`
  já eram burros — nenhum precisou ser tocado.
