---
task: 020 - contract-series-implementation
plan: 017 - Reestruturacao
date: 2026-08-23
status: done
---

# 020 - Contract: Series implementation

## O que foi entregue

`SeriesFields`/`SeriesDigest` (Kotlin, `android/content-digest/src/main/kotlin/.../series/
SeriesDigest.kt`) e `buildSeriesDigest(server, seriesId)`, compondo `Server` (Task 017) para dados
da série e o módulo Chapter (Task 019) para montar `chapters.list` em paralelo. Sem
`SeriesNeighborDigest` — série não tem conceito de vizinho, `chapters.list` já é
`List<ChapterDigest>` direto, e é `SeriesDigest` quem resolve `prevChapter`/`nextChapter` de cada
capítulo (o que `ChapterDigest` sozinho não tem como saber). No processo, `PluginSerial` foi
separado de um novo `PluginSeriesMetadata` no `:server` (refletindo as duas chamadas de rede
reais, antes misturadas numa só), `KavitaSeriesDto`/`KavitaSeriesMetadataDto` passaram a mapear o
schema real da Kavita por inteiro, e `buildChapterDigest` (Task 019) ganhou um parâmetro
`knownChapter` — uma checagem de completude (nunca merge parcial) que evita uma chamada
`chapter.get()` redundante quando Series já tem o dado completo em mãos. README de
`:content-digest` atualizado com a documentação completa do `SeriesDigest`.

## Como foi testado

Automatizado, mesma decisão já registrada nesta sessão (nenhuma task de implementação de Contract
tem teste em dispositivo real nesta fase). `./gradlew :content-digest:test` (testes novos em
`SeriesDigestTest.kt` cobrindo: `serial.get()` vital vs `getMetadata()`/`chapters.list()`
tolerados, ordenação por `decimalNumber` com um capítulo especial, `number` como posição na lista
ordenada, `prevChapter`/`nextChapter` corretos, os 3 estados de `chapters.status` incluindo falha
real de um capítulo específico dentro da lista, distinção `readCount` vazio-vs-zero, cascata
completa de `resumePoint`; mais `PluginChapterCompletenessTest.kt`, que garante a checagem de
`knownChapter` nunca fica desatualizada se `PluginChapter` ganhar campos novos). `./gradlew
:server:test` também rodado, sem regressão. `make coverage-kotlin`: piso elevado de 74% para 76%
(medido ~76.50% geral, `:content-digest` isolado em ~99% de cobertura de linha, excluindo
`BuildConfig` gerado).

**Validado adicionalmente contra o servidor Kavita real do usuário.** Um smoke test manual (script
fora do repositório, mesmo padrão das Tasks 018/019) chamou `buildSeriesDigest` de ponta a ponta.
Resultado real conferido pelo usuário (arquivo JSON enviado): série com 17 capítulos,
`chapters.status=SUCCESS`, `readCount=17`, capítulos numerados `1..17` na ordem correta,
`library`/`lastUpdatesUTC`/`otherNames`/`otherIds`/`colors`/`metadata` todos populados, e
`ageRating={rating: "Unknown", system: "Kavita"}` confirmando a correção sobre nomenclatura ESRB.

## Aprovação

Usuário acompanhou o design em várias mini-iterações (tratamento de falha Necessary/Aggregating de
`chapters`/`metadata`, desenho do `knownChapter` corrigido em duas rodadas até chegar na checagem
de completude certa, um bug real encontrado e corrigido durante autorrevisão — vizinhos usando
`number` desatualizado antes da correção de 2 passadas), revisou o resultado do smoke test real
(arquivo JSON baixado), e então pediu explicitamente: "Faz o Readme, se ja tem os testes, pode
commitar (pequenos commits), e pode fechar a task" — commits já feitos (5 commits pequenos, um por
camada/concern) antes desta finalização.

## Notas

- **O plano 017 inteiro não fecha ainda** — Task 021 (RN Services) em diante continuam `todo`. Só
  a Task 020 fecha aqui, seguindo a mesma ressalva já registrada no fechamento da Task 019.
- **`PluginSerial`/`PluginSeriesMetadata` divergem do padrão da Task 017**: antes, `Server.
  Serial.get()` fazia as duas chamadas (`SeriesDto` + `SeriesMetadataDto`) em paralelo e devolvia
  tudo junto num `PluginSerial` só. Agora são chamadas independentes — `get()` só busca `SeriesDto`,
  `getMetadata()` é um método novo e separado. Isso significa que qualquer código futuro que
  dependia do `PluginSerial` antigo (`summary`/`genres`/`tags` nele) precisa migrar para
  `getMetadata()` — não havia consumidor real disso ainda além dos próprios testes, que já foram
  atualizados.
- **`buildChapterDigest`'s `knownChapter` fecha um pendente da Task 019**: o campo `number` de
  `ChapterDigest`, que a Task 019 deixou com um fallback (`decimalNumber` truncado) documentado
  como "Series pode resolver diferente depois" — isso está resolvido agora.
- **`COVERAGE_FLOOR_KOTLIN` já ajustado nesta task** (74 → 76).
- Scripts de smoke test com credenciais reais nunca ficaram no repositório — `git status` limpo
  confirmado antes de cada commit desta task.
