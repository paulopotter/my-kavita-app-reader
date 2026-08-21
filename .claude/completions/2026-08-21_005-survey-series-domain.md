---
task: 005 - survey-series-domain
plan: 017 - Reestruturacao
date: 2026-08-21
status: done
---

# 005 - Survey: Series domain

## O que foi entregue

Levantamento completo do domínio Series, confirmado contra o schema real do `SeriesDto`/
`SeriesMetadataDto` (via skill `kavita-api`, adicionada durante esta sessão) — confirma que o
Kavita nunca entrega `readChapters`/`chapterCount`/`progressFraction` em nenhuma granularidade
de capítulo, só `pages`/`pagesRead`. Documenta 5 fórmulas independentes calculando o mesmo
agregado de progresso (3 já achadas em Chapter + 2 novas em TS), os dois shapes não relacionados
`SeriesDetail`/`SeriesSummary`, e os call sites exatos onde `KavitaSeriesFeature.listSeries()`
lê `chapterCacheDao` diretamente.

## Como foi testado

Task de levantamento — leitura de código + confirmação de schema real via skill.

## Aprovação

Usuário aprovou o levantamento e seguiu direto para a mini-iteração de contrato (Task 010) na
mesma sessão.

## Notas

Achado "todo o agregado de progresso é cálculo nosso, nunca do servidor" foi usado como base
direta para a decisão de contrato em Task 010 (readCount/total sempre derivados de
`chapters.list`, nunca um número pré-calculado separado).
