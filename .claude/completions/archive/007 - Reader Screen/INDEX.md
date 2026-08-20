# Plano 007 — Reader Screen — Tasks

> Nota (reconciliação pós-implementação): a arquitetura real divergiu do desenho original do
> README em dois pontos centrais — (1) o scroll de páginas não usa `FlashList`, e sim um
> `LazyColumn` nativo Kotlin/Compose (`ReaderPageList.kt`), exposto ao RN como uma única native
> view via `ReaderPageListView`/`ReaderPageListViewManager`; (2) Header/Footer/Gap não são
> componentes RN dummy fixos — viraram um sistema Server-Driven UI (`SduNode.kt` no Kotlin,
> `SduNode.ts`/`ReaderSduNodes.ts` no RN), onde o RN manda uma árvore de dados e o Kotlin
> interpreta genericamente. Ver `.claude/docs/architecture.md` § "Reader Screen — the one
> native-rendering exception" para o registro completo dessa decisão e o padrão a seguir se
> outra screen precisar da mesma exceção no futuro.

| # | Task | Status |
|---|------|--------|
| 001 | RN: instalar dependências novas e linkar módulos nativos (`flash-list`, `netinfo`) | done (arquitetura diferente — `flash-list` nunca usada em produção, removida na limpeza final; `netinfo` em uso real) |
| 002 | Kotlin: `Migration_5_6` (scrollFraction + page_cache) e getter de `keepScreenOnDuringReading` | done |
| 003 | Kotlin: expandir `KavitaChapterFeature` com progresso e páginas | done (+ `getPageDimensions`, não previsto no plano) |
| 004 | Kotlin: stream `events.activeUrlChanged` (`ActiveUrlWatcher`) | done |
| 005 | Kotlin: `ReaderModule` (NativeModule bridge) | done, refatorado na limpeza final — dividido em `ReaderChapterModule`/`ScreenControlModule`/`NetworkStatusModule` por domínio (ver nota abaixo) |
| 006 | RN: `shared/bridge/page.ts`, `network.ts`, `chapter.ts` | done |
| 007 | RN: `shared/transforms/page.ts` — gap, janela de pré-carregamento, viewer chapters | done — `computeGapHeight`/`pagePreloadOrder`/`isNearChapterEdge`/`ViewerChapters`/`currChapterOf` em uso real; `buildReaderList`/`reindexAfterPrevInsert`/`computeVisiblePageProgress` removidos na limpeza final (montagem de itens é `flattenBlocks` em `ReaderPageList.kt`) |
| 008 | RN: `shared/transforms/chapter.ts` — regras de progresso (expansão) | done |
| 009 | RN: `ReaderService.ts` e `PageService.ts` (thin wrappers) | done (+ `fetchPageDimensions`/`fetchPageAspectRatios`) |
| 010 | RN: `useReader.ts` — núcleo (estado, timers, progresso, marcação) | done |
| 011 | RN: `useReader.ts` — pré-carregamento e reação a `activeUrlChanged` | done |
| 012 | RN: componentes dummy — `PageImage`, `ChapterHeader`, `ChapterFooter`, `ReaderGap` | removidos na limpeza final — nunca alcançáveis a partir de `ReaderScreen.tsx` (substituídos por `ReaderPageImage` em Kotlin + SDU) |
| 013 | RN: componentes dummy — overlay (top bar, barra lateral, barra discreta, banner offline) | done — `ReaderTopBar`/`ReaderSideProgressBar`/`ReaderThinProgressBar`/`ReaderOfflineBanner` todos conectados em `ReaderScreen.tsx` |
| 014 | RN + Kotlin: `useReader.ts` — overlay, tela cheia, keep screen on, offline, overscroll | done — overscroll adaptado ao evento nativo do `ReaderPageListView` (não `onScroll` de FlashList, nunca instalada); banner offline conectado |
| 015 | RN: `screens/reader/ReaderTransform.ts` — labels e formatação | done, assinatura alterada — `progressBarFraction` simplificada para `(scrollFraction)` porque o cálculo de fração passou a vir pronto do Kotlin (`computeChapterFraction`) |
| 016 | RN: montar `ReaderScreen.tsx` — lista principal e integração | done (arquitetura diferente — `ReaderPageListView` nativo em vez de `FlashList`; evento único `onVisiblePageChanged` em vez de `onViewableItemsChanged`+`onScroll`) |
| 017 | RN: `useReader.ts` — carregamento inicial do trio de capítulos | done |
| 018 | RN e Kotlin: strings i18n, navegação final, cobertura e ajuste de floors | done — floors finais (pós-limpeza): JS statements/lines 42%, functions 55%, branches 84%; Kotlin LINE 60% |

## Limpeza final (sessão de consolidação, pós-implementação)

Todas as 18 tasks tinham implementação funcional real desde a implementação original — nenhuma
foi pulada. A sessão de limpeza fechou o único gap genuíno (banner offline não renderizado) e
tratou o código morto identificado, com decisões explícitas do usuário para cada remoção:

1. **Banner offline conectado** — `ReaderOfflineBanner` importado e renderizado em
   `ReaderScreen.tsx` (tasks 013/014/016 fechadas de verdade).
2. **Código morto removido**: `ReaderListItemRenderer.tsx`, `ChapterHeader.tsx`,
   `ChapterFooter.tsx`, `ReaderGap.tsx`, `PageImage.tsx` (e testes correspondentes);
   `buildReaderList`/`reindexAfterPrevInsert`/`computeVisiblePageProgress` de
   `shared/transforms/page.ts`; dependência `@shopify/flash-list` (package.json, yarn.lock, e o
   wiring manual em `android/app/build.gradle.kts`).
3. **`ReaderModule` dividido por domínio** — violava a invariante "Kotlin tool sempre global,
   nunca screen-coupled" (`mistakes.md` #3): misturava dados de capítulo/página, controle de
   tela ligada, e watch de URL ativa num único NativeModule nomeado pela screen. Virou
   `ReaderChapterModule` (bridge fino sobre a nova interface `ChapterDataSource`, nunca sobre
   `KavitaChapterFeature` diretamente), `ScreenControlModule` (genérico, reutilizável por
   qualquer screen), `NetworkStatusModule` (stream de URL ativa). Ver
   `.claude/docs/architecture.md` para o desenho completo.
4. **Debug logging (`CoilDiagnostic`) gated** — instrumentação de sessões de debug anteriores
   (offset de scroll, decode de página) rodava incondicionalmente em produção; agora atrás de
   `ReaderDebugFlags.verboseScrollLogging` (default `false`).
5. **Boilerplate de NativeModule consolidado** — `emitEvent`/`resolveOrReject` em
   `ReactBridgeSupport.kt`, aplicado a todos os NativeModules do app (não só o reader).

Revisão de qualidade (`/code-review` high effort, 8 finder angles + verificação) rodada sobre o
diff da limpeza encontrou e corrigiu 4 problemas reais antes do commit: a fronteira
`ChapterDataSource` não estava fechada de verdade (`AppReactPackage`/`MainApplication` ainda
injetavam o tipo concreto), lambdas de debug logging alocadas em todo tick de scroll mesmo com a
flag desligada, a migração de logging estava incompleta (`SafeBitmapDecoder.kt`/
`MainApplication.kt` fora do escopo), e `getKeepScreenOnDuringReading` estava no módulo errado.
Um bug real (`kotlin.Unit` passado direto pro bridge nativo do RN via `resolveOrReject`) foi
encontrado em teste manual no dispositivo e corrigido antes de qualquer commit — ver
`mistakes.md` #17.
