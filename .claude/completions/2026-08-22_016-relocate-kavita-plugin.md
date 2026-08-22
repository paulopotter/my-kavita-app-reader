---
task: 016 - relocate-kavita-plugin
plan: 017 - Reestruturacao
date: 2026-08-22
status: done
---

# 016 - Relocate the raw Kavita plugin to `Server/plugins/kavita/`

## O que foi entregue

Novo módulo Gradle `:server` (`android/server/`), dependendo só de `:core` e `:tools`.
`server/plugins/kavita/{auth,chapter,series}.kt` reescritos do zero (não movidos) — sem
cache/Room, `baseUrl`/`jwt`/`apiKey` recebidos no construtor, DTOs limitados aos campos que os
contratos da Task 014 (`SeriesContract`/`ChapterContract`) realmente usam. `KavitaUrlSelector`/
`KavitaUrlSource`/`ActiveUrlWatcher` deixados intocados em `features/kavita/` por decisão
explícita (Task 017 absorve). O código antigo em `features/kavita/` não foi tocado nem removido —
nada no app aponta para o módulo novo ainda.

## Como foi testado

Automatizado apenas: 81 testes (`KavitaAuthTest`, `KavitaSeriesTest`, `KavitaChapterTest`, via
MockWebServer). `./gradlew koverVerify` passando sem queda no piso de cobertura Kotlin. Sem teste
em dispositivo real — nada do código novo está ligado ao app rodando ainda (intencional, essa
ligação é trabalho da Task 017).

## Aprovação

Aprovação explícita em conversa: "A task 16 pode colocar como concluida, pq já fizemos o kavita
dentro de plguin, a 17 ainda está em doing, pq vamos fazer ainda o server."

## Notas

- **Divergência deliberada do desenho original**: a task original descrevia "pure repositioning"
  (mover classes existentes para dentro de `features/kavita/`'s futuro generalizador, zero
  mudança de comportamento). O que foi construído é código novo — o usuário corrigiu
  explicitamente esse rumo ("você não está movendo, você está criando") e decidiu, ao longo da
  sessão, um desenho de camadas diferente: `core` (base) ← `tools` (caixa de ferramentas) ←
  `Server` (módulo Gradle próprio, não aninhado em `features/`), com o destino de `features/`
  deliberadamente adiado pra outra conversa.
- **Sem cache nesta camada, por decisão explícita**: `server/plugins/kavita/*` nunca toca em DAO/
  Room — isso é responsabilidade de outra camada. Diferente do JWT/refreshToken, que acabou
  ganhando uma exceção pontual (estado mutável) no `KavitaServerPlugin`, construído na mesma
  sessão logo depois desta task — ver o doc da Task 017 para esse detalhe.
- **Segue em uso**: `KavitaSeriesFeature`/`KavitaChapterFeature`/`KavitaAuthFeature` em
  `features/kavita/` continuam sendo o código real que o app usa. A Task 017 é quem vai trocar os
  call sites.
