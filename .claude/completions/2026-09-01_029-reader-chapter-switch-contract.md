---
task: 029 - reader-chapter-switch-contract
plan: 017 - Reestruturação
date: 2026-09-01
status: done
---

# 029 - Reader: contrato de troca de capítulo

## O que foi entregue

Reescrita completa do leitor webtoon (`frontend/src/screens/reader/`, ex-`reader-v2`), que
elimina a causa raiz dos bugs recorrentes de navegação (comprovada por log real: "próximo" no
capítulo 26 pulava para 28):

- **Modelo de dados:** `ReaderWindow { entries: LoadedChapterEntry[]; focusedIndex: number }` —
  janela indexada por posição, append-only no scroll natural. Substitui o trio nomeado
  `{prev, curr, next}` e o read-modify-write em `viewer.next` que dois fluxos sem coordenação
  disputavam.
- **Caminho único:** `moveFocus(trigger)` para cruzamentos por scroll; o reducer
  (`reader.reducer.ts`) calcula a transição contra a própria `state.window`, então dois relatos
  no mesmo batch do React serializam. Sem timer de settling.
- **Setas / jump:** `openChapter(id, {startAtBeginning:true})` reconstrói a janela e incrementa
  `State.nativeListKey`; a tela usa esse valor como `key` do `<ReaderPageListView>`, então o
  React desmonta a View nativa e monta outra — o `LazyColumn` nasce no capítulo alvo sem offset
  de scroll herdado. `scrollToItem` / `scrollToPositionWithOffset` se provaram não confiáveis em
  9 builds de device; remontar dispensa scroll programático numa troca.
- **Prev na abertura fria:** `buildWindow` monta `[prev?, alvo, next?]` dos vizinhos embutidos
  no digest; `reconcileWindow` prependa o prev quando a ordem canônica chega.

Arquivos principais: `screens/reader/hooks/reader.hooks.ts`, `.../hooks/reader.reducer.ts`,
`.../transforms/reader.transform.ts`, `.../reader.screen.tsx`, `.../reader.types.ts`. O Kotlin
do leitor **não mudou** (`ReaderPageList.kt` continua o `LazyColumn`); `CacheBridgeModule.kt`
(`:app`, fora do Kover) teve `ttlMs` mudado para não-nulável por causa do `ReadingProgressManager`.

Investigação do reflow da ordem de capítulos: causa raiz encontrada (double-sort na SerieScreen
— `sortMode` default no primeiro paint, pref salva carrega async e re-ordena um frame depois).
Usuário confirmou que não é reproduzível na prática (o gate de loading segura). Correção adiada
como opcional; é uma questão da SerieScreen, task própria se for perseguida.

## Como foi testado

- `yarn tsc --noEmit`, `yarn eslint`, `yarn test:coverage` — verdes; 662 → 670 testes; branches
  90.22% → 90.51% (piso 90); exit 0.
- Dispositivo real: rc42, rc43, rc44, rc45 via `make redeploy-log`. Log rc45 (v37, 4200+ linhas):
  navegação por seta ↑↓ várias vezes, scroll webtoon infinito para frente e para trás cruzando
  fronteiras, overlay (título/bolinhas/barra) acompanhando, sem tela preta, sem travamento, sem
  crash. O bug do scroll para trás (aberto no 104, não ia para o 103) foi observado e corrigido
  entre rc44 e rc45.

## Aprovação

Usuário nesta conversa: "noticiia boa, ele esta trocando de capítulo..." (rc42), "aparentemente
funcionou", "acho que resolvemos", "podemos fazer o finalizar as tasks?".

## Notas

- Também shipado junto (registrado no Result do task file): os 3 gaps de sync de progresso
  (Task 030) e o fix de marcar seleção em lote.
- `architecture.md` atualizado com a seção "Chapter-switch contract (`ReaderWindow` +
  `moveFocus`)".
- Logs de diagnóstico `[Reader v2][diag]` deixados comentados (com nota `Task 029/030/031
  debug`), não removidos.
- Corte final: `screens/reader-v2/` → `screens/reader/`, legado apagado (commit `refactor(rn):
  corte final do leitor`).
- Rótulos internos "Reader V2" / "reader-v2" ainda aparecem em comentários e nomes de `describe`
  — cosmético, não afeta paths nem imports.
