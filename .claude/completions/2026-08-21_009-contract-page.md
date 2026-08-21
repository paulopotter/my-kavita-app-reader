---
task: 009 - contract-page
plan: 017 - Reestruturacao
date: 2026-08-21
status: done
---

# 009 - Contract: Page

## O que foi entregue

Contrato formal do domínio Page (`PageContract extends ImageDescriptor`, `PageResult`), modelado
antes de Chapter na prática (piloto real do processo de co-criação), confirmado contra o schema
real do Kavita. Produziu, como efeito colateral desta sessão, o tipo compartilhado
`ImageDescriptor` (reusado depois em `ChapterContract.coverImage`) e `ServerDescriptor`.
Composição confirmada: `ChapterContract.pages.list: PageResult[]`, Chapter chamando o módulo de
Page diretamente (mesma camada, R1).

## Como foi testado

Task de modelagem de contrato — nenhum código de produção escrito. Não há teste em dispositivo
aplicável.

## Aprovação

Usuário aprovou cada campo/decisão explicitamente ao longo da sessão.

## Notas

- **Contrato-base, não definitivo.**
- **`architecture.md` não foi atualizado** — mesma decisão explícita das demais tasks de
  contrato: só ocorre na implementação real, não na modelagem.
- `bookScrollId` (campo real do `ProgressDto` do Kavita, possível posição mais fina que página)
  foi encontrado mas deliberadamente não incorporado — fica registrado em
  `_contract-design-notes.md` § Open/rejected para revisão explícita futura.
