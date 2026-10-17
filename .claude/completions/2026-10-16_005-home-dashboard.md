---
task: 005 - home-dashboard
plan: backlog
date: 2026-10-16
status: done
---

# 005 - Home (dashboard)

## O que foi entregue

Tela Home (no código, `dashboard`) em `frontend/src/screens/dashboard/`, com os trilhos Continuar
lendo (abre direto no capítulo, com barra de progresso do capítulo), Novos capítulos das obras
seguidas, Atualizadas, Na fila e Novas na biblioteca, mais uma faixa de estatísticas. Ajustes ganhou
a opção de tela inicial (Home ou Favoritos), guardada em `StartScreenPrefs`; a aba Home só aparece
depois do primeiro uso e nunca mais some, e sem ela o app abre na Biblioteca. O ponto de retomada
é mantido fresco pelo `SerialRefreshTool` (refetch com debounce da obra lida) e a data de entrada na
biblioteca (`created`) passou pelo plugin, `:server` e `:content-digest` até o RN.

## Como foi testado

- `make coverage`: Jest 1658 testes passando (statements 94,8%, funções 82,2%) e Kotlin verde; o piso do
  Jest foi subido em `frontend/package.json`.
- `yarn tsc --noEmit` e `eslint` sem erros novos.
- Testes Kotlin em `:server` e `:content-digest` para o campo `created`.
- Teste no aparelho pelo usuário (`make redeploy-log`): "funcionou".

## Aprovação

O usuário aprovou o contrato por escrito antes do código (rota, hook, `SerialCard`, preferência) e
confirmou depois de testar no aparelho; pediu o commit e o fechamento nesta conversa.

## Notas

- A Home não tem cache próprio e não usa `force`; só o pull-to-refresh força. A frescura do `resumePoint`
  é da camada de série, via `SerialRefreshTool`, chamado pelo Reader.
- "Continuar lendo" usa a lista de obras + um digest por obra; uma obra com todas as páginas lidas e capítulo
  novo ainda não aparece (limitação conhecida; o `on-deck` do Kavita resolveria em uma chamada).
- Próximo passo: o progresso por obra (em vez de por capítulo) na barra da Biblioteca/Seguindo.
