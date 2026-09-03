---
task: 037 - kill-transform-layer
plan: 017 - Reestruturação
date: 2026-09-03
status: done
---

# 037 - Kill the `Transform` layer

## O que foi entregue

A pasta `frontend/src/screens/reader/transforms/` foi dissolvida — era o último screen com
camada `Transform` própria (o `serie/` já cumpria a regra). Os 19 exports foram para três
destinos que a `architecture.md` § "No `Transform` layer" já prevê:

- **`frontend/src/screens/reader/reader.model.ts`** (novo) — forma e read-state de capítulo no
  contexto do reader: `chapterFromDigest`, `withOrderNumber`, `toOrderedChapters`,
  `placeholderChapterFromOrder`, `neighborsOfIn`, `adjacentChapterId`,
  `isChapterEffectivelyRead`, `shouldUnmarkOnReread`, `resolveInitialPage`,
  `progressBarFraction`, `READ_THRESHOLD_FRACTION`. **Não** subiu para o `ChapterTool` shared:
  confirmado que só o reader usa essas funções, então são modelo local do screen.
- **`frontend/src/screens/reader/reader.window.ts`** (novo) — matemática do `ReaderWindow`:
  `buildWindow`, `reconcileWindow`, `computeWindowAfterFocusMove` + privadas.
- **`frontend/src/screens/reader/modes/webtoon.adapter.ts`** — absorveu
  `WebtoonPositionReport`, `isWebtoonPositionReport`, `webtoonReportToTrigger`,
  `windowToWebtoonBlocks`. `webtoon-blocks.transform.ts` deletado. O hook continua importando
  `webtoonReportToTrigger` como named export direto desse arquivo (nunca o barrel `modes/` nem
  `READER_MODE_ADAPTERS`) — proteção contra o crash de module-init rc30.

Importadores atualizados: `reader.hooks.ts`, `reader.reducer.ts`, `reader.screen.tsx`,
`modes/webtoon.adapter.ts`, `screens/reader/index.ts`. Testes portados 1:1 e divididos por
destino. Docs: `architecture.md` § "No `Transform` layer" (passado + 3 destinos reais) e nova
bullet "um screen é seu próprio micro-ecossistema"; `mistakes.md` #21 (correção de path).

## Como foi testado

- `npx tsc --noEmit` — limpo.
- `npx eslint src/screens/reader src/shared/tools/chapters` — limpo.
- `yarn test:coverage` (frontend) — **70 suites / 848 testes passando**. Coverage global
  91.79 / 90.88 / 79.34 / 91.79 (subiu vs. baseline 91.28 / 90.77 / 78.34 / 91.28). Floor JS
  `functions` bumpado 78 → 79.
- **Dispositivo físico real**, rc104, via `make redeploy-log`: abertura de capítulo (série já
  lida e série nova), scroll webtoon natural cruzando entre capítulos, setas de navegação de
  capítulo no overlay — tudo funcionando. Log `/tmp/reader-log-v3.txt` sem erro/crash; o crash
  de module-init estilo rc30 **não** ocorreu.

## Aprovação

O usuário rodou `make redeploy-log` no rc104, testou o reader no dispositivo e confirmou nesta
conversa: "a principio esta tudo funcionando". Em seguida autorizou o fechamento com "Corrigir
agora, commit separado" (para o bug lateral da SerieScreen), o que pressupõe fechar a 037
primeiro.

## Notas

- **Desvio do texto da task, alinhado com o usuário:** a task previa mover as funções de
  capítulo para o `ChapterTool` shared (`ChapterTool.order.*` / `ChapterTool.readState.*`).
  Verificado que **nenhum** outro screen usa essas 19 funções — só o reader. Por decisão do
  usuário nesta sessão ("se dependem do reader, só o reader usa → migra pro reader"), tudo virou
  modelo local do screen (`reader.model.ts` / `reader.window.ts`), que é o outro destino válido
  da mesma regra da arquitetura. O `ChapterTool` shared não foi tocado.
- **Nome de arquivo:** usado o sufixo `.model` (que a doc lista junto de `.window` como destino
  válido). O usuário aceitou, observando que "no futuro provavelmente vai aparecer um nome
  melhor para ele" — rename futura é barata (arquivo isolado do screen).
- **Bug lateral, fora do escopo, será corrigido em commit `fix` separado logo após esta task:**
  ao voltar do reader para a SerieScreen, o capítulo recém-lido ainda aparece como não-lido até
  um pull-to-refresh. É o espelho do "KNOWN GAP" já documentado no `ChapterTool`:
  `serie.hooks.ts` não escuta `ChapterEvents.readStatusChanged` (a `library/useLibrary.ts`
  escuta; a serie não) e o `useFocusEffect` recarrega com `force=false`, lendo o `SeriesDigest`
  ainda cacheado no Kotlin (TTL ~15min). Correção prevista: adicionar o listener do EventBus no
  `serie.hooks.ts` com marca otimista no estado local, mesmo padrão da library.
- Versões: APK `0.8.0-rc103` → `0.8.0-rc104`; bundle `0.9.0-rc103` → `0.9.0-rc104`.
- Plano 017 **não** está concluído — Fase 7 (Safeguards: tasks 032, 033, 034) segue aberta.
