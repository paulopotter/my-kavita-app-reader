---
task: 019 - contract-chapter-implementation
plan: 017 - Reestruturacao
date: 2026-08-23
status: done
---

# 019 - Contract: Chapter implementation

## O que foi entregue

`ChapterFields`/`ChapterDigest`/`ChapterNeighborDigest` (Kotlin, `android/content-digest/src/
main/kotlin/.../chapter/ChapterDigest.kt`) e `buildChapterDigest(server, seriesId, chapterId,
prevChapter?, nextChapter?)`, compondo `Server` (Task 017) diretamente para dados do capítulo e o
módulo Page (Task 018) para montar `pages.list` em paralelo. `ChapterFields` é uma interface
compartilhada entre `ChapterDigest.Success` e `ChapterNeighborDigest.Success`, evitando duplicar a
declaração de cada campo nas duas hierarquias. No processo, várias correções reais foram feitas no
módulo `:server`: `KavitaChapterDto` passou a mapear o `ChapterDto` real da Kavita por inteiro (não
só os poucos campos usados até então), `PluginChapter` ganhou `decimalNumber`/`specialLabel`/
`createdUtc`/`lastReadingProgressUtc`/`fileFormat` e teve `pageCount`/`pagesRead`/`decimalNumber`/
`isSpecial` tornados nullable, e um novo `ImageDescriptor` (com `aspectRatio`/`orientation` já
calculados) mais `Serial.getCoverImage()`/`Chapter.getCoverImage()` foram adicionados,
reaproveitando a mesma fórmula de derivação que antes só existia dentro de `PageDigest`. O
placeholder `Chapter` da Task 018 foi substituído por `ChapterSummary` (evita uma dependência
circular entre `ChapterDigest` e `PageDigest`). Novo utilitário `parseIsoUtcToEpochMs` em
`:tools/datetime`. READMEs de `:server` e `:content-digest` (novo) atualizados/criados.

## Como foi testado

Automatizado, por decisão explícita já registrada nesta sessão (nenhuma task de implementação de
Contract tem teste em dispositivo real nesta fase). `./gradlew :content-digest:test` (34 testes
novos em `ChapterDigestTest.kt`, cobrindo: `chapter.get()` vital vs `getProgress()` tolerado,
derivação de `number`/`specialLabel` em todos os casos de borda, os 3 estados de `readStatus` +
fallback quando `count`/`readCount` faltam, os 3 estados de `pages.status`, cálculo de
`totalWidthPx`/`totalHeightPx` nos casos sucesso-total/página-com-dimensão-zero/lista-vazia, e
`prevChapter`/`nextChapter` passando por `Success` e `Failure`). `./gradlew :server:test`/
`:tools:test` também rodados, sem regressão. `make coverage-kotlin`: piso elevado de 71% para 74%
(medido ~74.89% geral, `:content-digest` isolado em ~99% de cobertura de linha).

**Validado adicionalmente contra um servidor Kavita real do usuário** — não é dispositivo Android,
mas é dado de produção real, não mockado. Um smoke test manual (script mantido fora do
repositório, em `~/.claude/projects/.../scratchpad/RealKavitaSmokeTest.kt`, sem credenciais
preenchidas — credenciais reais só na memória do projeto) chamou `buildChapterDigest` de ponta a
ponta contra a instância Kavita do usuário. Resultado real conferido pelo usuário: capítulo de 37
páginas, `readStatus=READ`, `totalWidthPx=26640`/`totalHeightPx=246145`, `specialLabel=null` com
`isSpecial=false`, URLs de cover corretas. Foi esse teste real que revelou que `Range` (mapeado
para `specialLabel`) vem preenchido pela Kavita mesmo em capítulos não-especiais — corrigindo a
regra original de "diverge de number" para "populado só quando `isSpecial=true`".

## Aprovação

Usuário acompanhou o design em várias mini-iterações ao longo da sessão (tipagens, nullability,
onde `ImageDescriptor` deveria morar, cálculo de `totalWidthPx`/`totalHeightPx`), revisou o
resultado do smoke test real, e então pediu explicitamente: "faça os commits pequenos (nao preciso
saber do commit), e pode fechar esse plano" — commits já feitos (7 commits pequenos, um por
camada/concern) antes desta finalização.

## Notas

- **O plano 017 inteiro não fecha ainda** — Tasks 020 em diante continuam `todo`. Só a Task 019
  fecha aqui; o usuário disse "fechar esse plano" mas o INDEX mostra várias tasks pendentes
  (Series, RN Services, Cache, correções, Reader, safeguards) — reportado ao usuário para
  confirmação, não fechado automaticamente.
- **Nomenclatura real diverge da spec TS original**: `ChapterContract`/`ChapterResult` viraram
  `ChapterFields`/`ChapterDigest` (sealed, sem wrapper `Result` — mesmo idioma que a Task 018 já
  tinha estabelecido para Page, mas o task file original ainda usava os nomes da spec de
  modelagem).
- **`PluginChapter.decimalNumber`/`isSpecial`/`pageCount`/`pagesRead` tornados nullable no
  `:server`** — não porque a Kavita hoje omite esses valores (o smoke test confirma que sempre
  vêm preenchidos), mas porque a nullability é sobre a possibilidade de um provider futuro não ter
  esse conceito. Mesmo raciocínio já registrado para R10 category 2 nas design notes.
- **`specialLabel` corrigido durante a sessão**: a regra original da spec ("populated only when it
  diverges from number") foi substituída por "populated only when `isSpecial == true`", depois que
  o smoke test real mostrou que `Range` vem preenchido igual ao número mesmo em capítulos normais.
- **`totalWidthPx`/`totalHeightPx` passaram a ser calculados de verdade** — a spec original
  assumia que buscar dimensão por página tinha custo, então ficariam sempre `null`; na prática
  `pages.list` já carrega `width`/`height` de graça (Task 018), então agora são somados de
  verdade, só quando toda página tem sucesso e dimensão utilizável.
- **`COVERAGE_FLOOR_KOTLIN` já ajustado nesta task** (71 → 74), diferente da Task 018 que deixou
  isso pendente.
- Scripts de smoke test com credenciais reais **nunca ficaram no repositório** — confirmado via
  `git status` limpo antes de cada commit desta task.
