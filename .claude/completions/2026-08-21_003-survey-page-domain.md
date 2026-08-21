---
task: 003 - survey-page-domain
plan: 017 - Reestruturacao
date: 2026-08-21
status: done
---

# 003 - Survey: Page domain

## O que foi entregue

Levantamento completo do domínio Page: campos, operações e consumidores em Kotlin
(`ChapterDataSource`/`KavitaChapterFeature`) e RN (`shared/transforms/page.ts`, `useReader.ts`,
`ReaderPageListView`), com arquivo:linha para cada achado. Inclui uma seção adicional (§5),
pedida durante a revisão, rastreando o fluxo servidor→app completo desde o toque no capítulo até
a primeira página renderizada, e a tabela real de endpoints Kavita envolvidos. Achados de
inconsistência documentados: ambiguidade `null` vs `0` em `pageAspectRatios`, cálculo de aspect
ratio duplicado, `pagePreloadOrder`/`isNearChapterEdge` aparentemente mortos, três fontes de
"tamanho de página" nunca reconciliadas.

## Como foi testado

Task de levantamento — leitura de código, sem mudança de comportamento. Não há teste em
dispositivo aplicável.

## Aprovação

Usuário aprovou o levantamento em conversa e usou-o diretamente como insumo para a mini-iteração
de contrato (Task 009), que avançou na mesma sessão.

## Notas

Achado relevante para a Task 022 (auditoria de sync de progresso): `saveReadingProgress` no lado
Kotlin não faz nenhuma chamada de rede real hoje, apesar do nome sugerir sincronização com o
servidor.
