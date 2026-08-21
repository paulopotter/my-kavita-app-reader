---
task: 004 - survey-chapter-domain
plan: 017 - Reestruturacao
date: 2026-08-21
status: done
---

# 004 - Survey: Chapter domain

## O que foi entregue

Levantamento completo do domínio Chapter: campos, operações e consumidores em Kotlin e RN, com
correção importante ao diagnóstico original — `ViewerChapters` (Reader) e a modelagem de
`SeriesBridge` (Série) usam o **mesmo** tipo `Chapter`, a divergência real está na forma de
agregação/estado (Reader nunca busca lista completa da rede; Série busca com merge por
`updatedAtLocalMs`), não nos campos em si. Documenta em detalhe a duplicação de
`emitProgressChanged` (dois arquivos Kotlin idênticos) e uma **terceira** fórmula divergente em
`KavitaSeriesFeature.resolveProgress`, com cenário real onde o resultado diverge.

## Como foi testado

Task de levantamento — leitura de código, sem mudança de comportamento.

## Aprovação

Usuário aprovou o levantamento em conversa; usado como insumo direto para a Task 008 (piloto de
contrato).

## Notas

Achado 5.4 (dois critérios de ordenação coexistindo, `sortOrder` do servidor vs. `number`
parseado no cliente) foi posteriormente esclarecido na Task 008: `number`/`Range`/`SortOrder`
foram corrigidos contra o schema real do Kavita, resolvendo a ambiguidade.
