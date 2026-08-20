# Plano 007 — Reader Screen — Tasks

> Nota (reconciliação pós-implementação): a arquitetura real divergiu do desenho original do
> README em dois pontos centrais — (1) o scroll de páginas não usa `FlashList`, e sim um
> `LazyColumn` nativo Kotlin/Compose (`ReaderPageList.kt`), exposto ao RN como uma única native
> view via `ReaderPageListView`/`ReaderPageListViewManager`; (2) Header/Footer/Gap não são
> componentes RN dummy fixos — viraram um sistema Server-Driven UI (`SduNode.kt` no Kotlin,
> `SduNode.ts`/`ReaderSduNodes.ts` no RN), onde o RN manda uma árvore de dados e o Kotlin
> interpreta genericamente. Essas mudanças tornaram um grupo de artefatos RN do desenho original
> em código morto (não deletado, só não usado) — ver notas por task abaixo.

| # | Task | Status |
|---|------|--------|
| 001 | RN: instalar dependências novas e linkar módulos nativos (`flash-list`, `netinfo`) | done (arquitetura diferente — `flash-list` instalada mas não usada em produção; `netinfo` em uso real) |
| 002 | Kotlin: `Migration_5_6` (scrollFraction + page_cache) e getter de `keepScreenOnDuringReading` | done |
| 003 | Kotlin: expandir `KavitaChapterFeature` com progresso e páginas | done (+ `getPageDimensions`, não previsto no plano) |
| 004 | Kotlin: stream `events.activeUrlChanged` (`ActiveUrlWatcher`) | done |
| 005 | Kotlin: `ReaderModule` (NativeModule bridge) | done (+ `keepScreenOn`/`allowScreenOff`/`getPageDimensions`) |
| 006 | RN: `shared/bridge/page.ts`, `network.ts`, `chapter.ts` | done |
| 007 | RN: `shared/transforms/page.ts` — gap, janela de pré-carregamento, viewer chapters | parcial — `computeGapHeight`/`pagePreloadOrder`/`isNearChapterEdge`/`ViewerChapters`/`currChapterOf` em uso real; `buildReaderList`/`reindexAfterPrevInsert` mortos (a montagem de itens agora é `flattenBlocks` em `ReaderPageList.kt`) |
| 008 | RN: `shared/transforms/chapter.ts` — regras de progresso (expansão) | done |
| 009 | RN: `ReaderService.ts` e `PageService.ts` (thin wrappers) | done (+ `fetchPageDimensions`/`fetchPageAspectRatios`) |
| 010 | RN: `useReader.ts` — núcleo (estado, timers, progresso, marcação) | done |
| 011 | RN: `useReader.ts` — pré-carregamento e reação a `activeUrlChanged` | done |
| 012 | RN: componentes dummy — `PageImage`, `ChapterHeader`, `ChapterFooter`, `ReaderGap` | morto — os 4 existem e passam testes isolados, mas nenhum é alcançável a partir de `ReaderScreen.tsx` (substituídos por `ReaderPageImage` em Kotlin + SDU) |
| 013 | RN: componentes dummy — overlay (top bar, barra lateral, barra discreta, banner offline) | parcial — `ReaderTopBar`/`ReaderSideProgressBar`/`ReaderThinProgressBar` em uso real; `ReaderOfflineBanner` existe e testado mas não renderizado pela tela |
| 014 | RN + Kotlin: `useReader.ts` — overlay, tela cheia, keep screen on, offline, overscroll | done, com 1 lacuna — overscroll adaptado ao evento nativo do `ReaderPageListView` (não `onScroll` de FlashList); estado `offline` calculado via `NetInfo` mas seu efeito visual (banner) não está ligado na tela |
| 015 | RN: `screens/reader/ReaderTransform.ts` — labels e formatação | done, assinatura alterada — `progressBarFraction` simplificada para `(scrollFraction)` porque o cálculo de fração passou a vir pronto do Kotlin (`computeChapterFraction`) |
| 016 | RN: montar `ReaderScreen.tsx` — lista principal e integração | done (arquitetura diferente — `ReaderPageListView` nativo em vez de `FlashList`; evento único `onVisiblePageChanged` em vez de `onViewableItemsChanged`+`onScroll`); lacuna herdada da 013 (offline banner não renderizado) |
| 017 | RN: `useReader.ts` — carregamento inicial do trio de capítulos | done |
| 018 | RN e Kotlin: strings i18n, navegação final, cobertura e ajuste de floors | done — floors atuais: JS statements/lines 45%, functions 58%, branches 85%; Kotlin LINE 61% |

## O que falta de verdade para fechar o plano

Todas as 18 tasks têm implementação funcional real — nenhuma foi pulada. O único gap genuíno:

1. **Banner offline não aparece na tela.** `state.offline` já é calculado corretamente em
   `useReader.ts` (via `NetInfo.addEventListener`), e `ReaderOfflineBanner.tsx` já existe e passa
   seus próprios testes — só falta importar e renderizar o componente em `ReaderScreen.tsx`
   (mesmo padrão de `ReaderTopBar`/`ReaderThinProgressBar`, que já estão conectados).

Itens que ficaram como código morto (não bloqueiam o fechamento do plano, mas valem uma decisão
consciente — deletar ou deixar documentado como histórico da decisão de arquitetura):
`ReaderListItemRenderer.tsx`, `ChapterHeader.tsx`, `ChapterFooter.tsx`, `ReaderGap.tsx`,
`PageImage.tsx`, `buildReaderList`/`reindexAfterPrevInsert` em `shared/transforms/page.ts`,
dependência `@shopify/flash-list` (instalada, nunca importada em produção).
