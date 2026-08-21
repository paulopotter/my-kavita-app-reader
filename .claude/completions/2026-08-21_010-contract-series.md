---
task: 010 - contract-series
plan: 017 - Reestruturacao
date: 2026-08-21
status: done
---

# 010 - Contract: Series

## O que foi entregue

Contrato formal do domínio Series (`SeriesContract`/`SeriesResult`), confirmado contra o schema
real do `SeriesDto`/`SeriesMetadataDto`. Decisão canônica de progresso: `chapters.readCount`/
`total` são sempre derivados de `chapters.list`, nunca um valor pré-calculado à parte — resolve
diretamente o achado da Task 005 (5 fórmulas divergentes). Decisão de delegação: Series (Camada
3) chama o módulo de Chapter (Camada 3) diretamente para montar `chapters.list`, nunca lendo
`chapterCacheDao` por conta própria — informa a correção real da Task 017. Produziu, durante
esta sessão, a formalização da arquitetura de 6 camadas (Camada 0 a 5) registrada em R1.

## Como foi testado

Task de modelagem de contrato — nenhum código de produção escrito. Não há teste em dispositivo
aplicável.

## Aprovação

Usuário aprovou cada campo/decisão explicitamente ao longo da sessão, incluindo correções
próprias ao longo do processo (ex: `resumePoint`, agrupamento de metadata, classificação
Vital/Necessária/Agregadora).

## Notas

- **Contrato-base, não definitivo** — vários campos deliberadamente excluídos por ora (ex:
  `fileFormat`/`MangaFormat` no nível Série, papéis de `PersonDto` além dos já incluídos).
- **`architecture.md` não foi atualizado** — decisão explícita: só ocorre quando as Camadas 1/2
  forem implementadas e a Camada 3 real responder a estes contratos, não na fase de design.
- Esta task também produziu o mapeamento formal de camadas (Layer 0-5) usado por todo o resto
  do arquivo de apoio — roadmap de implementação real fica: arrumar Camada 1 → Camada 2 →
  estrutura da Camada 3 respondendo aos contratos já modelados → avançar até o front (decisão
  do usuário, registrada para orientar as próximas tasks de implementação, não desta sessão).
