# Task 001 — Contrato único de troca de capítulo + modelagem dos 3 mecanismos de comunicação

**Status:** doing

## Objetivo

Modelar do zero (sem assumir o que já existe) os três mecanismos de comunicação usados pelo
Reader, e a partir deles desenhar um contrato único para a operação "trocar de capítulo" —
hoje implementada por dois caminhos divergentes (scroll natural vs seta manual).

## Os três mecanismos a modelar

1. **Kotlin → RN** (evento nativo reportando estado):
   `onVisiblePageChanged(chapterId, pageIndex, pageFraction, chapterFraction)`,
   `onScrollToChapterHandled()`. Já funciona como evento de fato (`NativeEventEmitter` /
   callback), mas nunca foi documentado como contrato formal.

2. **RN → Kotlin** (pedido de ação nativa): hoje é um mecanismo ad-hoc de "one-shot state"
   (`scrollToPageRequest`/`scrollToChapterId`/`scrollToPageIndex` setados no estado do reducer,
   consumidos por um `LaunchedEffect` no Kotlin, e zerados de volta via
   `SCROLL_TO_PAGE_HANDLED`). Funciona, mas é frágil — foi o ponto de origem dos bugs de overlay
   "preso" e scroll quebrado. Avaliar se deveria virar uma chamada direta de método imperativo
   (ref) em vez de ida-e-volta por estado.

3. **RN → RN** (evento interno entre hook/componente): identificado pelo usuário como caso
   **não mapeado** na análise anterior. Exemplo existente no código:
   `SeriesProgressChangedEmitter` (Library reage a mudança de progresso sem esperar TTL de
   cache). Preciso levantar todos os usos existentes desse padrão no projeto antes de propor um
   modelo único, para não desenhar algo que não cobre casos reais já em produção.

## Contrato único de "trocar capítulo" (rascunho a validar com o usuário)

Proposta discutida em conversa, ainda não formalizada nem implementada como refactor:

```
trocarCapitulo(chapterId, opções?: {
  ignorarProgressoSalvo?: boolean   // true = seta manual (força primeira página)
                                     // false/omitido = abertura vinda de outra tela
  posicaoFisicaConhecida?: {...}    // presente apenas no caso de scroll natural,
                                     // onde a lista já está fisicamente posicionada
                                     // e não deve haver scroll programático
})
```

Objetivo: eliminar a divergência entre `loadInitialViewer` (reconstrução completa) e
`advanceToNextChapter`/`retreatToPrevChapter` (reducer incremental `SET_VIEWER`) como duas
implementações separadas da mesma operação conceitual.

## Estado atual (já aplicado no working tree, não commitado)

Como passo intermediário — pedido explícito do usuário para testar antes de formalizar o
contrato completo — a seta do overlay (`goToNextChapterManual`/`goToPrevChapterManual`) e o
overscroll já foram alterados para chamar `loadInitialViewer(chapterId, startAtBeginning=true)`,
o mesmo caminho usado para abrir a tela, ignorando progresso salvo. Isso resolve o sintoma
("seta deveria sempre ir para a primeira página") mas **não resolve a causa raiz** (dois
mecanismos paralelos) — é uma correção pontual, não o contrato único.

- 45 testes verdes em `frontend/src/screens/reader/__tests__/useReader.test.ts`.
- Pendente: validação do usuário em dispositivo real.
- **Não commitar** até aprovação explícita.

## Bug confirmado via log real (rc3, `/tmp/reader-log-v10.txt`, 2026-08-20 18:59) — "seta pula 2 capítulos"

Usuário reportou: ao clicar na seta "próximo" indo do capítulo 26 para o próximo, o app pulou
direto para o 28 (deveria ir para o 27). Log confirma o pulo real (não é impressão): em nenhum
momento aparece `resolved curr=...(n=27)` entre a abertura do 26 e a abertura do 28.

Causa raiz identificada (linhas 833-848 do log):

1. Seta dispara `loadInitialViewer('20506', true)` (abre capítulo 26, n=26) → `VIEWER_READY`
   com `viewer = {prev:null, curr:26, next:null}`.
2. Isso dispara `loadNeighbor('prev', 25)` e `loadNeighbor('next', 27)` em paralelo.
3. `loadNeighbor('next', 27)` resolve e dispatcha `UPDATE_VIEWER` com `next:27` — correto até
   aqui.
4. **Enquanto isso**, a lista física no Kotlin (`ReaderPageList.kt`) ainda não tinha sido
   reposicionada para o capítulo 26 (a troca de `blocks`/`scrollToChapterId` ainda estava em
   trânsito) — o Kotlin continuou reportando `onVisiblePageChanged` como se o usuário estivesse
   se aproximando do fim do capítulo **anterior** (25 ou o próprio 26 antigo), o que fez
   `handleVisiblePageChanged` (`ReaderScreen.tsx:46`) disparar `advanceToNextChapter`
   **concorrentemente** com o efeito da seta — o caminho de scroll natural, que não deveria
   estar ativo nesse momento.
5. `advanceToNextChapter` chama `loadMissingNeighbor('next', ...)`, que busca o vizinho seguinte
   (28) e dispatcha outro `UPDATE_VIEWER` com `next:28` — usando `viewerRef.current` capturado
   de forma assíncrona (`read-modify-write` sem lock, ver `loadNeighbor` em
   `useReader.ts:323-343`), **sobrescrevendo** o `next:27` que a seta tinha acabado de montar
   corretamente.
6. Resultado: o `viewer.next` fica apontando para 28 em vez de 27; um clique seguinte na seta
   "próximo" leva direto ao 28, pulando o 27.

**Esta é a prova concreta de que o dualismo de mecanismos (scroll natural vs seta manual como
dois fluxos paralelos e não coordenados, ambos escrevendo no mesmo estado) é a causa raiz dos
bugs recorrentes de navegação** — não uma suspeita teórica. O contrato único desta task precisa
necessariamente resolver essa corrida (`loadNeighbor`/`loadMissingNeighbor` não podem escrever
por cima de um trio que já mudou para outro capítulo enquanto a promise estava em voo — precisa
de guarda por `targetChapterId`, análoga ao `latestRequestedChapterIdRef` que `loadInitialViewer`
já usa) — não é suficiente só desenhar o contrato de "trocar capítulo": os dois mecanismos
também precisam de exclusão mútua (ex.: `isAdvancing`/guarda equivalente cobrindo também o
caminho da seta, que hoje não seta nenhum guard desse tipo).

## Bug ainda não corrigido: reflow visível da ordenação de capítulos ao entrar na tela

Usuário reportou que ainda vê a listagem se reordenando visualmente ao entrar na tela (bug
original da leva de correções, tratado como resolvido antes mas não confirmado em teste real
mais recente). Precisa reabrir e confirmar se a correção anterior (ordenação via `sortOrder` +
`ORDER BY` no Room) está de fato sendo usada no caminho que a tela consome, ou se há um segundo
ponto (ex. re-sort no lado RN após o cache já vir ordenado, causando um resort visível de novo)
ainda não coberto.

## Passos

1. Levantar todos os usos reais do padrão RN→RN no projeto (grep por `NativeEventEmitter`,
   emitters customizados tipo `SeriesProgressChangedEmitter`) — mapear antes de modelar.
2. Escrever a modelagem dos 3 mecanismos em texto/diagrama, revisar com o usuário.
3. Escrever o contrato único de troca de capítulo, revisar com o usuário.
4. Só então decidir se o refactor completo (unificar `loadInitialViewer` e
   `advanceToNextChapter`/`retreatToPrevChapter` num único fluxo) entra neste plano ou vira uma
   task separada — depende do tamanho real depois de modelado.
5. Atualizar `.claude/docs/architecture.md` com o contrato formalizado, uma vez aprovado.
6. Corrigir a corrida `loadNeighbor`/`loadMissingNeighbor` (guarda por `targetChapterId`) e
   reabrir a investigação do reflow de ordenação — podem ser corrigidos antes do refactor
   completo do contrato, como correções pontuais, já que ambos têm causa já identificada.

## Critério de conclusão

- Modelagem dos 3 mecanismos aprovada pelo usuário.
- Contrato único de troca de capítulo aprovado pelo usuário (documento, não necessariamente
  código ainda).
- Decisão explícita registrada sobre se/quando o refactor de unificação será implementado.
