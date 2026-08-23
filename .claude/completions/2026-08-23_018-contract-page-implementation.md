---
task: 018 - contract-page-implementation
plan: 017 - Reestruturacao
date: 2026-08-23
status: done
---

# 018 - Contract: Page implementation

## O que foi entregue

Novo módulo Gradle `android/content-digest/` com `PageDigest` (Kotlin, `sealed interface`
`Success`/`Failure`, sem tipo `Result` separado — mesmo idioma do `OtaCheckResult` já existente em
`:tools`) e a função `buildPageDigest(server, chapter, pageIndex)` que monta o resultado chamando
`Server` diretamente, sem cache. No processo, foi encontrada e fechada uma lacuna real no módulo
`:server` (Task 017): não existia forma de saber "qual grupo+URL respondeu essa chamada, sem
credenciais" — resolvido com `Server.getActiveInfo()`, `group(id).getActive()` e um novo envelope
`ServerResponse<T>` que todo método de leitura do `Server` passou a retornar (`data`, `serverInfo`,
`resolvedAtEpochMs`), eliminando uma corrida que uma chamada separada teria. `ServerBridgeModule.kt`
foi ajustado para desembrulhar `.data` antes de cruzar a bridge RN (sem mudança visível pro lado RN).

## Como foi testado

Automatizado apenas, por decisão explícita do usuário para esta fase (nenhuma task de
implementação de Contract terá teste em dispositivo real). `./gradlew :server:test` (117 testes,
incluindo os novos casos de `getActive()`/`getActiveInfo()`/`ServerResponse`), `./gradlew
:content-digest:test` (8 testes novos, cobrindo sucesso completo, orientação landscape/portrait/
quadrado, zero tratado como "sem dado útil", falha tolerada em `getDimensions()`, falha vital em
`getUrl()`, e ausência de grupo ativo). `./gradlew koverVerify` limpo — cobertura Kotlin
consolidada subiu de 62% para 72.15% (`:content-digest` adicionado ao merge do Kover no
`build.gradle.kts` raiz). `make coverage` (Kotlin + JS) rodado completo, sem falhas.

## Aprovação

Usuário aprovou explicitamente via `AskUserQuestion`, após eu apresentar o resumo completo do que
foi entregue (módulo novo, adições ao `:server`, testes, delta de cobertura) — resposta: "Sim,
aprovo".

## Notas

- **Escopo cresceu além do plano original**, resolvido em várias mini-iterações com o usuário: a
  Task 018 não só implementou `PageDigest`, como também adicionou 3 métodos/tipos novos ao
  `:server` (`getActiveInfo()`, `group(id).getActive()`, `ServerActiveInfo`) e depois redesenhou
  todos os métodos de leitura do `:server` para retornar `ServerResponse<T>` — mudança que afeta
  qualquer consumidor futuro do `:server`, não só Page.
- **Nova regra geral R11** registrada em `_contract-design-notes.md`: `server`/`resolvedAtEpochMs`
  em qualquer contrato de Layer 3 refletem a última chamada ao `:server` que teve sucesso
  (sobrescrita na ordem das chamadas), não necessariamente a última tentada. Vale para Chapter/
  Series (Tasks 019/020), não é específico de Page.
- **`PageDigest.chapter` carrega o parâmetro `Chapter` inteiro, sem recorte** — regra geral do
  usuário: um campo populado por outro módulo/parâmetro nunca é filtrado por quem recebe. O tipo
  `Chapter` usado hoje (`id`, `serial.id`) é um placeholder mínimo, deliberadamente marcado como
  pendente — quando as Tasks 019/020 criarem o `ChapterDigest`/`SeriesDigest` reais, será preciso
  voltar e corrigir esse tipo. Registrado tanto nas design notes quanto na memória do projeto
  (`project_page_digest_chapter_placeholder.md`), para não se perder entre sessões.
- **`COVERAGE_FLOOR_KOTLIN` ainda não foi ajustado** — cobertura subiu de 62% para 72.15%
  (medido), mas o bump do piso em `android/build.gradle.kts` fica para o commit de fechamento.
- `android/server/README.md` (criado nesta task, não existia antes) documenta toda a API pública
  do `:server` com exemplos tipados — motivado pela necessidade de entender o módulo por completo
  antes de desenhar `PageDigest` em cima dele.
