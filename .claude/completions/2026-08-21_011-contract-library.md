---
task: 011 - contract-library
plan: 017 - Reestruturacao
date: 2026-08-21
status: done
---

# 011 - Contract: Library

## O que foi entregue

Decisão arquitetural, não um contrato: **não existe `LibraryContract`**. Aplicando a regra R1
(Camada 3 é opcional por domínio) e o achado real do levantamento (Task 006 — "Library" hoje é
literalmente `Series` em lote, sem lógica de domínio própria), a conclusão foi que Library nunca
precisou estruturalmente de contrato próprio. "Library" é uma operação de listagem no próprio
módulo de Series (Camada 3), consumida por um Service de Library (Camada 4) que aplica
sort/filtro/agregação client-side — exatamente o padrão que `FollowingScreen.tsx` já usa hoje.
Multi-biblioteca real do Kavita foi investigada e deliberadamente não modelada agora — vira
parâmetro futuro da operação de listagem, não um contrato a redesenhar.

## Como foi testado

Task de modelagem/decisão — nenhum código de produção escrito. Não há teste em dispositivo
aplicável.

## Aprovação

Usuário chegou a essa decisão em conversa direta, questionando se fazia sentido ter um
`LibraryContract` próprio antes de eu propor qualquer shape — decisão dele, não sugestão minha
aceita passivamente.

## Notas

- **Consequência real para tasks futuras**: Task 016 (correção de Library) foi escrita
  assumindo `KavitaLibraryFeature.kt` — essa suposição está desatualizada. Marcado
  explicitamente no arquivo da Task 016 como escopo a revisar antes de implementar (não
  reescrito agora, só sinalizado).
- `LibrarySummaryCacheDao`/o gap real de cache (não sobrevive a restart) continua existindo e
  precisa de correção — só não será uma tabela de um domínio "Library" próprio; a decisão de
  onde exatamente esse cache mora fica para a Task 015 (diretriz de cache) + a versão revisada
  da Task 016.
