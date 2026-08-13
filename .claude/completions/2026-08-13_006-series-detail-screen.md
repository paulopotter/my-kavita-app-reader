---
task: 006 - series-detail-screen
plan: 006 - Series Detail Screen
date: 2026-08-13
status: done
---

# 006 - Series Detail Screen

## O que foi entregue

Implementadas as 11 tasks do plano: reorganização de `features/kavita/` em subpastas `series/`/`chapter/`, `KavitaChapterFeature` (marcar lido/não-lido, listagem de capítulos), expansão de `KavitaSeriesFeature` (detalhe + metadados), `replaceForSeries`/`observeAllIds` nos DAOs, `SeriesModule` (NativeModule bridge com stream reativo de seguidos via `Flow`), bridge/transforms de domínio no RN (`shared/bridge/series.ts`, `shared/transforms/chapter.ts`, `shared/transforms/series.ts`), `useSeriesDetail.ts` com cache local-first e marcação otimista, `SeriesDetailScreen.tsx` completa com seleção múltipla, e o modal de configuração de ordenação.

Além do escopo original do plano, a tela passou por uma leva extensa de correções pós-teste em dispositivo físico real: autenticação (parsing de `UserDto`), splash exigindo autenticação, rotas reais da API Kavita (`query param` em vez de `path param`), 3 níveis de sort (temporário → override por série → global), regra correta de `AUTO_FIXED`/`AUTO_PROGRESS` (compara último capítulo lido, não "existe não-lido acima do threshold"), crash `RNSVGPath` (link Gradle faltante), ícones lucide extraídos como componentes compartilhados (`FollowStar`, `ScrollToTopButton`), e dois bugs de sincronização entre telas: a estrela de "seguindo" não refletia o estado ao abrir a série (fetch inicial ausente) e a lista de "Seguindo" não reagia a mudanças de follow feitas em outra tela (filtro aplicado só uma vez no fetch, não recalculado).

Também foi corrigido, fora do escopo do plano mas bloqueando testes via OTA, um bug de infraestrutura: o bundle OTA salvo em armazenamento privado do app sobrevivia a builds nativos completos, fazendo o app ficar preso numa versão de JS antiga indefinidamente — corrigido comparando o timestamp de build do bundle embutido no APK contra o do bundle OTA salvo (`OtaManager.discardStaleBundleIfNeeded`).

Principais arquivos: `SeriesModule.kt`, `KavitaSeriesFeature.kt`, `KavitaChapterFeature.kt`, `SeriesSortPrefsDao.kt`, `useSeriesDetail.ts`, `SeriesDetailScreen.tsx`, `useLibrary.ts`, `OtaManager.kt`.

## Como foi testado

- `make coverage` aprovado: Kotlin `koverVerify --rerun-tasks` BUILD SUCCESSFUL (45.18% de line coverage, floor subido de 33% → 44%); JS 189 testes passando (statements 28.87% ≥ 27%, branches 76.15% ≥ 75%, functions 38.98% ≥ 38%, lines 28.87% ≥ 27%, floors subidos).
- Testes novos cobrindo os bugs corrigidos: `OtaManagerDiscardStaleBundleTest.kt` (Robolectric, 5 casos incluindo o cenário real que causou o bug — versão com sufixo `-ota-test-none` empatando por semver), `useLibrary.test.ts`/`useLibrary-hook.test.tsx` (reducer puro + integração via `renderHook`, cobrindo o filtro `isFollowed` reagindo a eventos).
- Testado em dispositivo Android físico real via `make build-all` + `make deploy` e via fluxo OTA completo (`make build-bundle` + `make ota-none`), em múltiplas rodadas ao longo da sessão — cada bug relatado pelo usuário foi reproduzido, corrigido e reconfirmado no device antes de prosseguir.
- Fluxo Biblioteca → Detalhe → Voltar confirmado pelo usuário: loading com cache local, seleção múltipla via long-press, navegação de volta, e agora sincronização de favorito nos dois sentidos (Biblioteca ↔ Detalhe ↔ Seguindo).

## Aprovação

Usuário aprovou explicitamente ("funcionou. vamos para o finalmente.") após confirmar em device real que a sincronização de favorito entre Biblioteca, Detalhe de Série e tela Seguindo funciona nos dois sentidos, sem precisar de refresh manual.

## Notas

- **Reader (item 007 do backlog)** ainda não existe — o botão de ação da tela de série já navega para `Routes.READER`, mas a tela em si é um stub. Não foi possível testar o cenário "voltar do Reader e ver progresso atualizado" nesta sessão.
- **Dívida técnica registrada em backlog separado**, não bloqueante para este plano:
  - `016` — estratégia de rollback de migrations Room (criada durante esta sessão).
  - Task spontânea (`task_fbecf4bc`, ainda pendente como chip) — mover a UI de update OTA (progress bar, botão "Atualizar") da splash nativa para a splash React Native; a nativa deveria ser só bootstrap transitório.
  - Task spontânea (`task_a504550d`, ainda pendente como chip) — o filtro de exclusão do Kover não captura corretamente todas as implementações `_Impl` geradas por KSP (`UiPreferencesDao_Impl`, `ServerConfigDao_Impl` aparecem no relatório com ~1% de cobertura, pesando contra o total).
- O padrão de 3 níveis de sort (temporário/sessão → override fixo por série → global do app) não estava no plano original — foi adicionado a pedido do usuário durante os testes, usando o projeto de referência `my-manga-app-reader` (Kotlin/Compose, já validado contra servidor Kavita real) como fonte de verdade para a regra de negócio.
- `hugeicons-react-native` foi instalado e depois removido — nunca chegou a ser usado no código (decisão do usuário: só lucide).
