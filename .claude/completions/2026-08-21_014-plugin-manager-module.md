---
task: 014 - plugin-manager-module
plan: 017 - Reestruturacao
date: 2026-08-21
status: done
---

# 014 - Plugin manager module design

## O que foi entregue

Desenho estrutural completo do módulo "Server" (primeira instância concreta do padrão de
gerenciador de plugins da Task 002): estrutura de pastas (`Server/plugins/kavita/`, plugin cru
aninhado dentro do generalizador), divisão de responsabilidade corrigida (Server só roteia,
adaptador entende o domínio), as 4 operações originais simplificadas (3 adiadas/absorvidas, só
"métodos de domínio diretos" ficou real), independência entre API pública e interface interna,
e validação no papel contra os dois casos de backlog (Notifications, BFF/MetadataSource). Regra
final: qualquer conexão externa sempre usa o padrão completo, independente de quantos
fornecedores são esperados.

## Como foi testado

Task de design estrutural — nenhum código de produção escrito, sem implementação de referência.
Não há teste em dispositivo aplicável.

## Aprovação

Usuário guiou toda a modelagem, corrigindo a IA repetidamente ao longo do processo (onde mora a
tradução do plugin, divisão real de responsabilidade Server/adaptador, independência de API).

## Notas

Fecha a Fase 2 (Contratos) do plano por completo — Page, Chapter, Series, Library (decisão de
não ter contrato), DataSources adicionais, mecanismos de comunicação, e módulo gerenciador,
todos com decisão registrada.
