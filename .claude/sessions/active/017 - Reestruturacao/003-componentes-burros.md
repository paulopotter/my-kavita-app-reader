# Task 003 — Revisão do princípio "componentes burros" no Reader

**Status:** todo (adiada explicitamente pelo usuário — "vou precisar entender melhor isso, mas
fica para depois")

## Objetivo

O usuário pediu explicação do conceito antes de decidir se/como aplicar. Diagnóstico já
levantado em conversa: `ReaderScreen.tsx` tem `handleVisiblePageChanged`, que **decide** (não
só reporta) qual ação tomar com base no evento nativo recebido — isso é lógica de decisão
dentro do componente, quando deveria estar no hook.

## Passos (quando retomada)

1. Explicar o princípio "componentes burros" com exemplos concretos do próprio projeto (padrão
   já usado em outras screens, ex. `SeriesDetailScreen.tsx` vs `useSeriesDetail.ts`).
2. Revisar junto com o contrato único (Task 001) — decisão de handler de evento nativo deveria
   migrar para dentro do hook, expondo do componente só o repasse do evento cru.
3. Aplicar no Reader após aprovação.

## Critério de conclusão

- Usuário confirma entendimento do princípio.
- Decisão registrada sobre aplicar ou não neste plano.
