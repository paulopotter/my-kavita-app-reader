---
task: 034 - changelog-skill-origin-tag
plan: 017 - Reestruturação
date: 2026-09-04
status: done
---

# 034 — atualizar-changelog cruza o diff `<origin-tag>..HEAD`

## O que foi entregue

`atualizar-changelog/SKILL.md` — nova seção "Input — conversation context, cross-checked against
the real diff" e passos:

1. `git ls-remote --tags --sort=-v:refname origin | grep -v '\^{}' | head -1 | sed
   's#.*refs/tags/##'` — a última tag do `origin`, computada dinamicamente (nunca hardcoded);
   fallback pra `git tag --sort=-v:refname | head -1` com aviso se o `origin` não responder. As
   tags do repo são datadas (`2026.08.20.0248`), então `-v:refname` ordena da mais nova.
2. `git diff <tag>..HEAD --stat` + `git log <tag>..HEAD --oneline` como cross-check — skim das
   áreas de arquivo e dos subjects de commit procurando mudanças user-visible que a conversa não
   surfou. `feat`/`fix`/`perf` são os candidatos óbvios; **`refactor:` é lido, não pulado** —
   muitos `refactor` deste repo mudam comportamento observável (pref reseta, tela muda, tabela
   dropada) e viram bullet como `feat`/`fix`. Churn puro (mover arquivo, `test:`, docs,
   `.claude/`, `ci`) é ignorado.
3. Mudança user-visible que a conversa perdeu → adiciona bullet, mesmas regras.

A regra conflitante "só o que foi aprovado nesta conversa" foi relaxada pra "nesta conversa OU
visível no diff `<origin-tag>..HEAD` — nunca especular além disso".

`plan-manager.md` — a nota da própria skill dizia que o `plan-manager` a chama no arquivamento,
mas o agente não tinha esse passo escrito. Fechado: o passo 1 de "Closing a finished plan" agora
invoca `atualizar-changelog` e mostra o diff dela.

## Como foi testado

- `git ls-remote --tags --sort=-v:refname origin` → `2026.08.20.0248` (dinâmico, não hardcoded).
- `git log 2026.08.20.0248..HEAD --oneline` = 252 commits, dezenas de `feat`/`fix`/`perf` +
  `refactor` reais do plano 017 — exatamente o cenário que uma fonte só-conversa não cobre.
- `CHANGELOG.md` `[Unreleased]` está vazio hoje; a skill preenche a partir desse range + contexto
  quando o plano fecha.
- Formato de saída conferido: só o bloco `[Unreleased]`, sem versão/data, pt-BR,
  `### Backend`/`### Frontend`, 1 bullet por mudança, sem nome de arquivo — **intacto**. Só a
  entrada mudou.

## Aprovação

O usuário pediu pra seguir com a task nesta conversa ("bora") e, no meio, sinalizou que
`refactor:` "pode ser algo interessante" — o que virou o ajuste do passo 2.

## Notas

- A skill não adiciona versão/data, não toca seção já lançada, não escreve em inglês, não
  commita nada — inalterado.
- `plan-manager` continua sendo quem *chama* a skill; a Task 034 não duplicou orquestração, só
  arrumou o que a skill faz quando invocada + escreveu a chamada que já era esperada.
- Commit: `6c9569d`.
- **Plano 017 agora tem todas as tasks `done`** — próximo passo é o `plan-manager` arquivar o
  plano (que agora, pela edição desta task, começa chamando `atualizar-changelog`).
