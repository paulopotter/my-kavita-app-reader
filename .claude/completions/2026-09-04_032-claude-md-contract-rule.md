---
task: 032 - claude-md-contract-rule
plan: 017 - Reestruturação
date: 2026-09-04
status: done
---

# 032 — Regra de mudança de contrato no CLAUDE.md (+ revisão geral de docs)

## O que foi entregue

O escopo cresceu na sessão de "adicionar uma regra ao `CLAUDE.md`" para uma revisão completa da
documentação, por decisão do usuário.

**`CLAUDE.md`** — movido de `.claude/CLAUDE.md` para a raiz do repo (onde a convenção do Claude
Code / hooks do CTO espera — `user-prompt-validate-claude-md.sh` e os token-guards apontavam
todos pra `./CLAUDE.md`, então a validação de estrutura/tokens nunca tinha rodado de fato).
Reagrupado de 4 seções de distinção borrada (Docs / Invariants / Rules / Coverage) para 5 por
tema: **Docs / Code structure / Process / Fixed conventions / Coverage**. ~590 tokens, sob o
teto de 600 do validador do CTO (validador passa limpo).

Adicionado (as regras da Task 032):
- **Mudança de contrato** — "descreve a proposta em texto e espera aprovação **antes** de editar
  código, mesmo que pareça pequeno", com exemplos inline (contrato: `useReader()`, evento do
  EventBus, rota, `SeriesDigest`; fix pontual: label / cor / ícone / typo / espaçamento).
- **Invariante i18n** — todo texto de UI é traduzível, nunca hardcode num idioma só.
- **"O log"** = o `/tmp/reader-log-v*.txt` mais recente por mtime, nunca o `N` citado por último.

Trazido do `_contract-design-notes.md` (decisões de design vivas):
- Regra de isolamento de Service (só chama seu próprio bridge).
- Padrão generalizer expandido (toda conexão externa → generalizer + plugin, mesmo com 1
  provider; código 100% interno nunca vira plugin).
- Convenção de arquivo novo (`name.type.ext`, plural, teste ao lado).

Removido: linha de camadas `core ← tools ← features` (o conceito era muleta de explicação, não
regra do código), ressalva "sem Transform por tela" (já não existe no código — Task 037),
detalhe da Splash (SplashActivity / MainActivity / Task 038 — já no architecture.md), "floors
vivem no código, não aqui".

**`architecture.md`** — descrevia o modelo Kotlin ANTIGO (3 camadas) como principal e citava
coisas removidas: `shared/transforms/` (Task 037), `screens/series-detail/` (Task 024),
`KavitaLibraryFeature.kt` (nunca existiu), `LibraryModule.kt` (Task 028), "CacheManager not
started" (existe desde a Task 023), `ScreenControlModule.getKeepScreenOnDuringReading` (Task
039), `bundleVersion` (o campo é `version`), `series_sort_prefs` como tabela viva. Reescrito: a
arquitetura de referência de 6 camadas + os 9 módulos Gradle como modelo principal, com
`features/` numa seção "Legacy Kotlin — being removed". Absorveu as tabelas úteis do refactor-map
e acrescentou o que faltava (immersive mode, `shared/context/`, `shared/managers/store`,
`ReaderPrefs`). Adicionou as 3 regras estruturais do `_contract-design-notes.md` por extenso.

**`architecture-refactor-map.md`** — deletado. Era um "retrato de transição" do meio da migração
do plano 017; obsoleto com Library / Reader / Splash / `ui_preferences` já migrados.

**`mistakes.md`** — compactado 521 → 160 linhas (~4400 → ~2200 tokens). Removidas as entradas que
duplicavam invariantes do `CLAUDE.md` → 1 linha no topo. Cada entrada restante: sintoma → regra,
sem prosa de root-cause histórico, ponteiro `→ file`. Removidos todos os
`Reference: reader-log-vNN.txt`. Consertado um bug de edição na antiga entrada 14 (um
`Fix: react-native-svg` órfão vazado da entrada 12). Nova entrada: o anti-pattern do
`waitFor(toBeNull())` negativo que arrastava a `server.screen.tests.tsx` (achado nesta sessão).

## Como foi testado

Task de documentação — sem testes de código. Verificações:
- Validador do CTO (`user-prompt-validate-claude-md.sh`) roda limpo no `CLAUDE.md` novo (sob 600
  tokens, sem seção > 200 palavras, sem tarefas concluídas / notas de data embutidas).
- `grep` confirmando que nenhuma ref cruzada `CLAUDE.md ↔ architecture.md` aponta pra seção
  inexistente, e que nenhuma ref ao `architecture-refactor-map.md` restou fora de completions
  históricas.
- Os hooks do CTO (`stop-path-guard`, token guards) já esperavam `./CLAUDE.md` na raiz.

## Aprovação

O usuário revisou e aprovou o texto do `CLAUDE.md` linha por linha nesta conversa (várias
iterações: cortar a linha de camadas, encurtar a regra da Splash, expandir a linha do provider
pra citar `plugins/`), depois pediu "feche a 032 e siga pra 033".

## Notas

- **Não feito** (decisão do usuário): registrar o episódio `startAtBeginning` no `mistakes.md` —
  o usuário não reconheceu o caso específico; a regra genérica de mudança de contrato no
  `CLAUDE.md` cobre.
- Passo 6 (self-check list antes de editar hooks centrais) e passo 8 (não propor enforcement
  automático) da task original: o self-check não foi transformado em artefato; o enforcement
  mecânico é justamente a **Task 033** (check complementar a nível de diff).
- Commits: `30787fc` (CLAUDE.md → raiz), `d509eb6` (architecture.md reescrito + refactor-map
  deletado), `d671b14` (CLAUDE.md reagrupado + regras 032 + 3 regras estruturais no
  architecture.md), `3762e71` (compactação do mistakes.md).
- Fora da task, mesma sessão: `12fa7b1` + `3118128` (workflow CLA — action arquivada no upstream,
  apontada pro fork próprio do usuário), `a993e46` (fix da lentidão da suite `server.screen`).
- Plano 017 segue aberto — Fase 7 tem ainda 033 e 034.
