---
task: 006 - survey-library-domain
plan: 017 - Reestruturacao
date: 2026-08-21
status: done
---

# 006 - Survey: Library domain

## O que foi entregue

Levantamento completo do domínio Library: confirma que `KavitaLibraryFeature.kt` não existe,
`KavitaSeriesFeature.listSeries()` assume esse papel, e o cache é 100% em memória (TTL 2min,
`LibraryModule.kt`, não sobrevive a restart). Confirma também, via skill `kavita-api`, que o
Kavita real **tem** um domínio Library completo (23 endpoints, `LibraryDto` rico, 6 valores
reais de `LibraryType`), mas **nada disso é usado hoje** pelo app — "Library" no app é sinônimo
de "todas as séries do servidor", sem noção de múltiplas bibliotecas. Achado extra: a tela
`FollowingScreen.tsx` já existe hoje (não é só planejamento de backlog) e reusa 100% a pipeline
de Library com um filtro client-side.

## Como foi testado

Task de levantamento — leitura de código + confirmação de schema real via skill. Sem mudança de
comportamento, sem teste em dispositivo aplicável.

## Aprovação

Usuário aprovou o levantamento e usou-o para decidir, em conversa, que não há necessidade de
modelar `LibraryContract` (ver Task 011).

## Notas

O contexto real de "por que o Kavita separa em múltiplas bibliotecas" (parsing/leitura/metadado
por tipo de conteúdo) foi investigado e documentado, mas confirmado como configuração estrutural
do servidor, não um caso de uso do nosso app hoje — guardado para eventual extensão futura.
