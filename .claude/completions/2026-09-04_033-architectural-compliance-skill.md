---
task: 033 - architectural-compliance-skill
plan: 017 - Reestruturação
date: 2026-09-04
status: done
---

# 033 — Skill de conformidade arquitetural

## O que foi entregue

`checar-arquitetura` (`.claude/skills/checar-arquitetura/SKILL.md`) — um check mecânico a nível
de diff que roda como **passo 0 bloqueante do `finalizar-task`** e também pode ser invocado
direto (`/checar-arquitetura`). Verifica só o diff da task (do commit "abre a task" até `HEAD`)
contra 6 regras estruturais do `CLAUDE.md`/`architecture.md`:

1. Dumb component (`components/`) importa service / `NativeModules.` / `*Bridge` — BLOQUEIA
2. Screen importa de outro screen — BLOQUEIA
3. Conhecimento de provider (`Kavita`/`m3`/`Bff`) em código novo (não comentário) fora de
   `plugins/` — BLOQUEIA se introduzido aqui; allowlist cobre o legado (`features/kavita/`, os
   bridges legados, `AppReactPackage`/`MainApplication`)
4. `*.services.ts` importa `Digest`/`Service` de outro domínio — BLOQUEIA
5. String de UI hardcoded em JSX (sem `{t.…}`) — SÓ REPORTA
6. Coupling Kotlin invertido (`core/` → `tools`/`features`; `tools/` → `features`) — BLOQUEIA
   (`:tools` pode importar `:cache` — exceção documentada)

O `finalizar-task/SKILL.md` ganhou o passo 0: invoca a skill; um finding BLOCKING para o fluxo
até o código ser corrigido ou o usuário confirmar falso positivo. Findings REPORT-ONLY (i18n)
aparecem mas não bloqueiam.

**Skill, não hook** — decidido com o usuário: um hook não amarra a "antes do `finalizar-task`"
especificamente, e os checks precisam de julgamento (distinguir legado deliberado de violação
nova, ignorar comentários) que regex de bash não faz limpo.

## Como foi testado

- Cada um dos 6 greps rodado contra uma amostra sintética violadora (checks 1–3 pegam a
  violação, ignoram comentário, ignoram `shared/`) e contra o código atual (checks 4–6 limpos,
  zero falso positivo).
- 2 bugs de BSD-grep (macOS) achados e corrigidos na validação: o filtro de comentário usava
  `\s` (precisa `[[:space:]]`); o check 3 usava `\bKavita\b` (não há borda de palavra depois de
  `Kavita` em `KavitaAuthFeature` — trocado por match de substring).
- Teste sintético decisivo: um `shared/services/chapters/kavita-helper.ts` fictício com
  `import { KavitaBridge }` + código citando `KavitaBridge.get()` + um comentário — a skill pega
  as 2 linhas de código, ignora o comentário, e o path não está na allowlist → seria BLOCKING.
- A skill rodada de verdade contra o diff da própria Task 033 (`f886291..HEAD`, só 2 `SKILL.md`)
  → `✓ passed, no blocking findings`.

## Aprovação

O usuário confirmou nesta conversa: skill (não hook), como passo 0 do `finalizar-task`,
bloqueante.

## Notas

- O exemplo do passo 5 da task ("rodar contra `KavitaSeriesFeature.listSeries()` lendo
  `chapterCacheDao` direto") não se aplica: essa "violação" é acesso a `chapterCacheDao` de um
  arquivo `features/kavita/` — que está na *allowlist* de legado, não é alvo do check 3. O teste
  sintético "novo Service cita Kavita" cobre a mesma regra contra uma violação real hipotética.
- A skill não auto-corrige, não julga "isso é mudança de contrato" (esse é o julgamento humano
  do `CLAUDE.md § Process` — Task 032), não checa coverage (o pre-commit hook faz), não toca git.
- Commit: `91846b2`.
- Plano 017 segue aberto — Fase 7 tem ainda a 034 (`atualizar-changelog` com diff
  `<origin-tag>..HEAD`).
