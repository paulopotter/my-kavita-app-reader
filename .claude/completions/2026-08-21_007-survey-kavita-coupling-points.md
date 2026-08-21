---
task: 007 - survey-kavita-coupling-points
plan: 017 - Reestruturacao
date: 2026-08-21
status: done
---

# 007 - Survey: direct Kavita coupling points outside the 3 core domains

## O que foi entregue

Varredura completa (Kotlin + RN) por pontos que conhecem o Kavita diretamente, fora de
Chapter/Series/Page já mapeados. Três candidatos fortes a `DataSource` identificados:
`KavitaUrlSource`/`KavitaUrlSelector` (já é interface, só falta desacoplar nome/path
hardcoded), `KavitaAuthFeature`+`UserDto` (sem abstração nenhuma hoje, candidato mais óbvio a
`AuthDataSource`), e `BffFeature` (achado mais sutil — feature de outro provedor estruturalmente
acoplado ao formato de ID do Kavita para correlação, quebra silenciosa em caso de troca de
provedor). Também achado um vazamento real de formato: `SetupScreen.tsx` duplica o path
`/api/Health` já conhecido por `KavitaUrlSelector.kt`. Vários casos de nomenclatura (não
estrutura) classificados como decisão de produto/copy, não violação de camada.

## Como foi testado

Task de levantamento — leitura de código via agente Explore. Sem mudança de comportamento.

## Aprovação

Usuário pediu para prosseguir com esse levantamento como próximo passo após fechar Library;
achados aprovados implicitamente ao seguir para o fechamento da task.

## Notas

Esta task fecha a Fase 1 (Levantamento) do plano por completo — Page, Chapter, Series, Library
e este levantamento de acoplamento estão todos concluídos. Próxima fase natural: Tasks 012
(DataSources adicionais, usando os 3 candidatos aqui) e 013/014 (mecanismos de comunicação e
módulo gerenciador de plugins).
