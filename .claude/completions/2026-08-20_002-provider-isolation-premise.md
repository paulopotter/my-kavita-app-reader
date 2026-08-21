---
task: 002 - provider-isolation-premise
plan: 017 - Reestruturacao
date: 2026-08-20
status: done
---

# 002 - Formalize the provider isolation premise

## O que foi entregue

Texto formalizado da premissa "isolamento de provedor", levantada pelo usuário na sessão de
planejamento: nenhuma parte do projeto fora do módulo de tradução de um provedor externo deve
saber o nome/formato desse provedor. A task registra explicitamente que o alvo é maior que
replicar o padrão `ChapterDataSource` (interface + impl + binding Hilt fixo) por domínio — é um
**módulo gerenciador de plugins** por categoria (ex: "módulo de servidor", "módulo de
notificação"), capaz de gerenciar múltiplas implementações simultâneas e servir como único
ponto de contato do app, com uma operação explícita "usar o provedor X" como parte do próprio
contrato do módulo (não um bypass dele). Casos de uso já mapeados para exercitar o design:
backlog 011 (BFF plugin) e backlog 008 (Notifications).

## Como foi testado

Task de documentação — não há código envolvido, nenhum teste em dispositivo ou `make coverage`
aplicável. Verificação feita por leitura do texto da task contra a descrição original dada
pelo usuário na conversa de planejamento.

## Aprovação

Usuário confirmou explicitamente, nesta conversa, que o texto da task bate com a premissa
descrita: módulo único por categoria, conhece todas as implementações, gerencia múltiplas
simultaneamente, único ponto de contato do app.

## Notas

- Nenhuma mudança de código nem de `CLAUDE.md`/`architecture.md` ainda — a redação final para
  esses arquivos é responsabilidade da Task 024; o design do registry/gerenciador em si é da
  Task 014. Esta task só fixa o conceito e obtém aprovação antes dessas duas avançarem.
