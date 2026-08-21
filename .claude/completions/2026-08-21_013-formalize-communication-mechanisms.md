---
task: 013 - formalize-communication-mechanisms
plan: 017 - Reestruturacao
date: 2026-08-21
status: done
---

# 013 - Formalize the 3 communication mechanisms

## O que foi entregue

Os 3 mecanismos de comunicação formalizados: RN→Kotlin sempre pedido→execução→resposta via
`@ReactMethod`+`Promise` (o "one-shot state" do Reader é substituído por um método de módulo
normal que comanda a view por dentro, não por chamada via `ref`, que é fire-and-forget por
natureza da plataforma); Kotlin→RN (`NativeEventEmitter`) reservado só pra eventos espontâneos,
nunca como resposta a um pedido; RN→RN (`EventBus`) desenhado do zero como ferramenta genérica
sem registro central de eventos, cada evento sendo um token tipado declarado onde faz sentido.

## Como foi testado

Task de design — nenhum código de produção escrito. Não há teste em dispositivo aplicável.

## Aprovação

Usuário guiou toda a modelagem, corrigindo duas suposições da IA no processo (rejeitou chamada
via `ref` como shape válido; confirmou ausência de broadcast Kotlin→Kotlin, o que motivou o
modelo final de "Kotlin nunca decide propagar").

## Notas

- `EventBus` ficou como design/contrato, sem implementação mínima — não havia caso de uso real
  para justificar implementar agora.
- Task 021 (Reader) consome diretamente a correção do Mecanismo 1, resolvendo o bug de corrida
  documentado.
