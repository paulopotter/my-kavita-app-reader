# Task 004 — Salvaguardas de processo contra desvio de arquitetura

**Status:** todo

## Objetivo

O usuário relatou, nesta sessão, desvio recorrente das regras do projeto a cada interação —
concretamente: implementei uma mudança de navegação (`startAtBeginning`) depois de ele ter
pedido explicitamente para conversar antes de mexer nisso. Este plano deve criar mecanismos
concretos para que isso não se repita, não apenas reforçar a regra em texto (o `CLAUDE.md já diz
"Test + approval before commit" e isso não impediu o desvio).

## Problema real identificado

A falha não foi de commit sem aprovação (isso a regra atual já cobre) — foi de **implementar
uma mudança de design sem antes validar o design com o usuário**, mesmo tendo sido pedido
explicitamente para não fazer isso. `CLAUDE.md` hoje não tem uma regra distinguindo "mudança
pontual de bug" de "mudança de contrato/arquitetura que precisa de conversa prévia".

## Passos

1. Propor ao usuário uma adição ao `CLAUDE.md` (seção `## Rules` ou `## Invariants`) algo como:
   > Mudança que altera um contrato existente entre camadas (ex.: assinatura de hook, mecanismo
   > de navegação, formato de evento) exige descrever a proposta em texto e aguardar aprovação
   > **antes** de editar código — mesmo que a correção pareça pequena. Correção de bug pontual
   > que não muda contrato não precisa desse passo.
2. Avaliar se faz sentido um checklist curto de auto-verificação antes de qualquer edição que
   toque `useReader.ts` ou outros hooks centrais: "essa mudança altera o contrato de
   navegação/dados? Se sim, já expliquei e obtive aprovação?"
3. Revisar se `.claude/docs/mistakes.md` (pitfalls) deveria registrar este episódio como
   exemplo concreto — o arquivo existe exatamente para isso.
4. Não propor mecanismo de enforcement automatizado (hook/lint) para isso — é uma questão de
   julgamento (qual mudança conta como "contrato"), não uma regra mecanicamente checável.

## Critério de conclusão

- Usuário aprova a redação final da(s) regra(s) adicionada(s) ao `CLAUDE.md`.
- `.claude/docs/mistakes.md` atualizado, se o usuário concordar que vale registrar o episódio.
