---
task: 008 - contract-chapter
plan: 017 - Reestruturacao
date: 2026-08-21
status: done
---

# 008 - Contract: Chapter (pilot)

## O que foi entregue

Contrato formal do domínio Chapter (`ChapterContract`/`ChapterResult`/
`ChapterNeighborContract`), modelado em sessão longa de co-criação campo a campo com o usuário,
confirmado contra o schema real do Kavita via skill `kavita-api`. Estabeleceu, como piloto, as
regras gerais reutilizáveis por todo contrato futuro (R1-R10 em
`_contract-design-notes.md`): arquitetura de 6 camadas, tipos achatados via intersection type,
classificação Vital/Necessária/Agregadora para decidir tratamento de ausência/erro, convenção de
nomenclatura de boolean, entre outras. Corrigiu um mapeamento de campo real do Kavita
(`number`/`Range`/`SortOrder`/`MinNumber`) que estava incorreto no código atual.

## Como foi testado

Task de modelagem de contrato — nenhum código de produção escrito, apenas o documento de design.
Não há teste em dispositivo aplicável.

## Aprovação

Usuário aprovou cada campo/decisão explicitamente ao longo da sessão (nunca entregue pronto sem
validação, conforme exigido pela task). Fechamento formal da task e as ressalvas abaixo também
confirmados explicitamente pelo usuário.

## Notas

- **Contrato-base, não definitivo** — usuário confirmou explicitamente que espera
  enriquecimento/revisão em sessões futuras.
- **`architecture.md` não foi atualizado** — decisão explícita do usuário: a atualização só
  ocorre quando os arquivos de código forem de fato implementados (Camadas 1/2 primeiro, depois
  a estrutura real da Camada 3 respondendo a este contrato), não na fase de modelagem.
- `ViewerChapters`/`SeriesBridge` (achado da Task 004) não foram formalmente reconciliados com o
  novo contrato — isso é trabalho de implementação/migração, não de shape de contrato.
