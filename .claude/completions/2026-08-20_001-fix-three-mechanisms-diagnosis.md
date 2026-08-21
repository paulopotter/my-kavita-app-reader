---
task: 001 - fix-three-mechanisms-diagnosis
plan: 017 - Reestruturacao
date: 2026-08-20
status: done
---

# 001 - Fix the 3-mechanisms diagnosis

## O que foi entregue

Correção do diagnóstico original do plano 017 sobre os 3 mecanismos de comunicação
(Kotlin→RN, RN→Kotlin, RN→RN). O diagnóstico anterior assumia que RN→RN já existia no
projeto, citando `SeriesProgressChangedEmitter` como exemplo — na prática esse evento nasce
no Kotlin (é Kotlin→RN), não RN→RN. A seção "3 communication mechanisms" do `README.md` do
plano e a nota de contexto da Task 021 já refletiam a versão corrigida (aplicado durante a
materialização do plano); esta task revisou e confirmou o texto, e corrigiu uma referência
residual da numeração antiga ("Task 5.1" → "Task 021") encontrada no `README.md`.

## Como foi testado

Task de documentação/diagnóstico — não há código envolvido, logo nenhum teste em dispositivo
ou `make coverage` aplicável. Verificação feita por leitura: conferência linha a linha do
trecho do `README.md` e da nota de abertura da Task 021 contra o texto acordado na sessão de
planejamento.

## Aprovação

Usuário confirmou explicitamente, nesta conversa, que o diagnóstico corrigido (Kotlin→RN ok;
RN→Kotlin com forma boa + forma ad-hoc frágil no Reader; RN→RN inexistente, a criar do zero)
está correto, após pedir esclarecimento sobre o que os passos 1 e 2 da task cobriam.

## Notas

- Nenhuma mudança de código. Task puramente de correção de documentação de plano.
- Task 013 (Fase 2) é quem decide o destino do "one-shot state" (RN→Kotlin ad-hoc) e desenha o
  mecanismo RN→RN novo — usuário confirmou que esse escopo está corretamente coberto lá.
