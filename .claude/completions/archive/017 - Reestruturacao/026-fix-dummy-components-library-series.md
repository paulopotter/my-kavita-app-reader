# Task 026 — Correction: dumb components (Library/SeriesDetail) (Phase 5 — Corrections)

**Status:** done (2026-09-02 — see `## Result`)

**(historical)** ~~blocked by Task 011, Task 010, and Tasks 016-023~~

## Objective

Move presentation-state logic currently derived inline in `LibraryScreen.tsx` and
`SeriesDetailScreen.tsx` (alphabet index, scroll handling, padding logic) into their respective
hooks/transforms, per the "dumb components" invariant (`CLAUDE.md` Invariants — "Dummy
component never imports a service").

## Steps

1. Identify every place `LibraryScreen.tsx`/`SeriesDetailScreen.tsx` compute derived
   presentation state inline (`alphabetIndex`, `handleScroll`, padding calculations, per the
   original audit finding).
2. Move each to the corresponding hook (`useLibrary.ts`/`useSeriesDetail.ts` or equivalent) or a
   `*Transform.ts` file, following the existing pattern used elsewhere in the project (e.g.
   Reader's `ReaderTransform.ts` once Task 020 lands it).
3. Reduce the screen components to pure rendering + event forwarding.

## Completion criteria

- `LibraryScreen.tsx`/`SeriesDetailScreen.tsx` no longer compute derived presentation state
  inline — it comes from the hook/transform.
- Tested on a real device by the user.
- `make coverage` shows no drop relative to the current floor.
- Explicit user approval before `finalizar-task`.

## Result (2026-09-02)

Fechada em duas metades:

**Metade Library** — resolvida "de graça" na reescrita da Library/Following (Task 028/036, commit
`5fdbc5a`). A `library.screen.tsx` já nasceu burra: `alphabetIndex`, `paddedData`, `handleScroll`,
`showScrollTop`, sort/view mode — tudo vem do `useLibrary`. Os componentes
(`components/series-card`, `series-list-item`, `alphabet-index`, `freshness-banner`) são primitivos
+ callbacks, zero import de service/bridge/tool/hook.

**Metade SeriesDetail** — commit `6274bc6`. Tirado da `serie.screen.tsx` e movido para o
`useSerie`:
- `handleScroll` / `showScrollTop` / `lastOffsetY` / `headerHeightRef` → agora `handleScroll`,
  `hideScrollTop`, `showScrollTop`, `onHeaderLayout` saem do hook.
- O contador do header (`chapters.filter(c => c.readStatus === 'READ').length`) → passou a usar o
  `readCount` que o `useSerie` já expunha.
- A screen só encaminha `onScroll`/`onLayout` e renderiza. Restam nela apenas `sortConfigVisible`
  (visibilidade de modal — UI local pura) e `listRef` (ref imperativo para `scrollToOffset`).
- `ScrollToTopButton`, `Header`, `ChapterListItem`, `ChapterSortConfigModal`, `SelectionBottomBar`
  já eram burros — nenhum tocado.

**Testes:** `npx tsc --noEmit` (0), `npx jest` (756, 54 suites) — inclui 3 casos novos no
`serie.hooks.tests.ts` para a visibilidade do botão scroll-to-top e 2 no `serie.tests.tsx` (a
screen só fia os callbacks). Device: `make redeploy-log` — botão "voltar ao topo" na tela de série
aparece ao rolar pra cima após o header sumir, e volta ao topo ao tocar; contador de lidos bate.

**Aprovação:** usuário aprovou em 2026-09-02 ("Sobre o teste do botão na serie, funcionou" +
"acho que agora da para commitar e fechar a task").

**Notas:** a task original também citava "transforms" para as duas telas — não se aplica mais, a
camada `Transform` por tela foi eliminada no projeto (decisão registrada em Task 037 / commit
`c96652d`). Nada além do que está acima ficou pendente para esta task.
