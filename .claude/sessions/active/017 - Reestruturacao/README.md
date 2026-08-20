# Plano 017 — Reestruturação de Domínio e Salvaguardas Arquiteturais

## Contexto

Durante a sessão de correções do Reader (leva de bugs pós-teste em dispositivo real), ficou
claro que os bugs recorrentes de navegação (overlay travado, scroll infinito quebrado, capítulo
pulado, seta indo para "continue lendo" em vez da primeira página) não eram bugs isolados —
eram sintoma de o Reader ter **dois mecanismos paralelos e divergentes** para a mesma operação
conceitual ("trocar de capítulo"): um caminho para scroll natural (reducer incremental
`SET_VIEWER`) e outro para navegação manual via seta (que oscilou entre reusar o reducer
incremental e recriar o trio do zero via `loadInitialViewer`).

O usuário interrompeu a implementação para revisar as premissas de arquitetura do projeto e
verificar se alguma estava sendo violada. Diagnóstico da conversa (ver íntegra na sessão):

1. **Componentes burros** — parcialmente violado: `ReaderScreen.tsx` toma decisões
   (`handleVisiblePageChanged` decide qual ação disparar) em vez de só repassar eventos crus
   para o hook decidir.
2. **Responsabilidades por escopo** ("só série mexe com série, só capítulo mexe com capítulo")
   — violado: não existe hoje um domínio "Capítulo" com contrato próprio que a tela/série chama.
   `useReader.ts` é um hook monolítico que acumula busca de capítulo, montagem de trio, cálculo
   de progresso, decisão de navegação, scroll físico e marcação de lido — sem fronteira entre
   essas responsabilidades. É a causa raiz do dualismo de mecanismos de navegação.
3. **Eventos** — existe na direção Kotlin→RN (`onVisiblePageChanged`,
   `onScrollToChapterHandled`), mas é ad-hoc na direção RN→Kotlin (`scrollToPageRequest`/
   `scrollToChapterId`/`scrollToPageIndex` como "one-shot state" zerado manualmente, não um
   evento de fato). **Existe ainda um terceiro caso não mapeado até a interrupção do usuário:
   RN→RN** — onde o RN dispara um evento e um hook/componente diferente ouve e reage (ex.:
   `SeriesProgressChangedEmitter`, usado pela Library para reagir a progresso sem esperar TTL de
   cache). Esse caso entra no escopo da modelagem da Task 001.
4. **Contrato único** — não existe: `ViewerChapters` é uma estrutura interna do Reader, não um
   contrato de domínio replicável (a tela de Série tem sua própria modelagem de capítulo via
   `SeriesBridge`, sem relação com `ViewerChapters`).
5. **Cache local → cache chama servidor** — respeitado na maior parte do app (Room-first em
   Series/Library/Chapter list). No Reader, a chamada de progresso local e remoto acontece em
   paralelo dentro de `loadInitialViewer`, e é a própria função de abertura (não uma camada de
   cache dedicada) que decide qual prevalece. Precisa de auditoria: o usuário suspeita que o
   progresso não esteja sendo sincronizado para o servidor em todos os pontos que deveria (saída
   do Reader, intervalos periódicos).

Este plano tem **prioridade máxima** sobre qualquer outro trabalho — o usuário observou desvio
recorrente de arquitetura ao longo da sessão e quer salvaguardas explícitas para não repetir o
padrão.

---

## Ordem de execução (definida pelo usuário)

O usuário pediu para dar alguns passos atrás antes de seguir. Ordem confirmada:

1. **Task 001 — Modelar do zero os três mecanismos de comunicação** (Kotlin→RN, RN→Kotlin,
   RN→RN) e o contrato único de "trocar capítulo". Já entra como **doing** — é a que motivou o
   plano e o usuário já pediu a implementação inicial da seta usando o caminho de abertura
   completa (`loadInitialViewer` + parâmetro que ignora progresso salvo), que já está aplicada
   no working tree e testada (45 testes verdes em `useReader.test.ts`). Falta: formalizar o
   contrato por escrito e revisar se ainda cabe simplificação após o modelamento RN→RN.
2. **Task 002 — Auditoria de sincronização de progresso** (local↔servidor): confirmar se existe
   lacuna real (progresso não sobe pro servidor ao sair do Reader / periodicamente).
3. **Task 003 — Revisão de "componentes burros"** explicada e aplicada (adiada explicitamente
   pelo usuário para depois de entender o conceito com mais detalhe — não é bloqueante das
   demais).
4. **Task 004 — Salvaguardas de processo**: mecanismo para eu não me desviar da estrutura do
   projeto a cada interação (o usuário relatou desvio recorrente ao longo desta sessão).
5. **Task 005 — Changelog da sessão**: gerar entrada de `[Unreleased]` cobrindo tudo que foi
   feito nesta sessão (diff da última tag `2026.08.20.0248` até o commit atual), já que nada foi
   commitado ainda.

---

## Princípios que guiam este plano

- Nenhuma mudança de código fora da Task 001 (seta) deve ser commitada até o usuário validar em
  dispositivo real — regra permanente desde o início da sessão original.
- Este plano não reabre trabalho já concluído e testado (a leva de bugs da tela do mangá,
  biblioteca, configurações etc.) — o escopo aqui é exclusivamente a estrutura de comunicação e
  domínio do Reader, mais o processo de trabalho.
- Toda modelagem (Task 001) deve ser escrita e validada com o usuário **antes** de virar código.
