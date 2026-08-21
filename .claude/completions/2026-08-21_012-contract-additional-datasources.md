---
task: 012 - contract-additional-datasources
plan: 017 - Reestruturacao
date: 2026-08-21
status: done
---

# 012 - Contract: additional DataSources

## O que foi entregue

Decisão explícita para os 3 achados fortes da Task 007, sem criar nenhum `DataSource` novo:
`KavitaAuthFeature`/`UserDto` permanecem internos ao plugin Kavita (Camada 1); `KavitaUrlSelector`
é **removido como classe própria** — corrigindo uma suposição inicial errada, o código real
mostra que ele é sobre múltiplos caminhos de rede pro mesmo servidor lógico (não merge de
fontes diferentes), então a seleção de URL sobe direto pro módulo de Servidor (Camada 2);
`BffFeature` vira módulo próprio separado (metadado externo), não absorvido pelo módulo de
Servidor.

## Como foi testado

Task de decisão de design — nenhum código de produção escrito. Não há teste em dispositivo
aplicável.

## Aprovação

Usuário decidiu cada um dos 3 pontos em conversa direta, corrigindo minha suposição inicial
sobre o propósito de `KavitaUrlSelector` antes de fechar a decisão final.

## Notas

- Alimenta diretamente o escopo da Task 014 (módulo de Servidor absorve Auth + seleção de URL).
- Aponta necessidade de um módulo próprio pra BFF/metadado externo — ainda sem task numerada
  dedicada, a nomear quando for desenhado.
