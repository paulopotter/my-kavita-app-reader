# Plano 007 — Tela de Leitura (Reader)

## Contexto

O usuário já consegue navegar até um capítulo a partir da tela de Detalhe da Série (Plano 006). O `ReaderScreen.tsx` atual é um stub — só lê `seriesId`/`chapterId`/`origin` da rota e tem um botão voltar. Esta é a tela núcleo do app: renderiza as páginas de um capítulo em scroll contínuo (estilo webtoon), navega entre capítulos automaticamente por scroll ou manualmente por seta, salva progresso local e remoto, marca capítulos como lidos/não lidos, e reage a mudanças de rede (URL ativa do Kavita, estado offline).

Diferente do Plano 006 (que reorganizou domínios já existentes), este plano introduz um domínio novo — **Page** (o mais micro da composição `Page → Chapter → Series → Library`) — e expande o domínio **Chapter** existente com progresso e cache de URLs de página. Também é o primeiro plano a instalar bibliotecas RN novas (`@shopify/flash-list`, `@react-native-community/netinfo`) e a criar uma migration Room de verdade (`Migration_5_6`).

Nada do que este plano assume como "já existente" foi encontrado pronto no projeto ao explorar o código atual — nem componente de lista contínua, nem tools Kotlin de página/progresso granular, nem sync queue, nem stream de URL ativa. Todos esses pontos são criados aqui do zero, seguindo os padrões já estabelecidos pelos planos anteriores (especialmente o 006).

---

## Princípios que guiam este plano

### Domínio micro → macro

```
Page (micro) → Chapter → Series → Library (macro)
```

- **Page** é um domínio novo neste plano: sabe buscar/cachear URLs de imagem de página e nada mais. Não ganha uma feature Kotlin própria — fica dentro de `KavitaChapterFeature`, porque uma página não existe fora do contexto de um capítulo (não há endpoint Kavita "GET page by id" independente de capítulo) e porque criar uma feature Kotlin do tamanho de "1 tabela + 2 métodos" violaria o princípio de reaproveitamento mínimo. Do lado RN, a lógica de domínio Page fica isolada em `shared/transforms/page.ts` e `shared/bridge/page.ts` para poder ser importada por outra tela no futuro sem cruzar a fronteira de `screens/reader/`.
- **Chapter** ganha responsabilidades novas: progresso de leitura (local Room + servidor) e cache de URLs de página. Continua em `KavitaChapterFeature.kt` — a mesma feature do Plano 006, expandida.
- **Reader** (a screen) não é um domínio da composição — é a tela que consome `Chapter`+`Page` e orquestra a experiência de leitura (scroll, overlay, timers). Toda a lógica de "qual página está mais visível", "quando trocar de capítulo", "quando pré-carregar" vive em `useReader.ts`, não em Kotlin.

### Kotlin é ponte de dados — o mínimo necessário

Nenhuma feature Kotlin nova é criada além do que os requisitos exigem. Cálculo de gap, janela de pré-carregamento, ordenação de página por distância, decisão de qual capítulo é "atual", debounce de timers, `suppressServerSync`, idempotência de marcação — tudo isso é RN puro (`useReader.ts` + `shared/transforms/page.ts` + `shared/transforms/chapter.ts`). O Kotlin só:
1. faz requisição HTTP autenticada (`RequestTool` já existente);
2. lê/escreve Room (`ChapterCacheDao`, `ReadingProgressDao`, novo `PageCacheDao`);
3. detecta mudança de URL ativa (algo que só o Android sabe fazer de forma persistente/observável) e emite evento.

### Reaproveitamento máximo — nada é duplicado

- `KavitaChapterFeature.saveReadingProgress(chapterId, seriesId, page)` — **reaproveitado sem alteração de assinatura**. O Reader usa exatamente este método via novo módulo RN.
- `SeriesModule.markChaptersRead` / `markChaptersUnread` — **reaproveitados sem duplicação**. O Reader chama o `SeriesModule` já existente diretamente do hook, via `shared/bridge/series.ts` já existente — não recria a chamada em um módulo próprio do Reader.
- `ChapterCacheDao.updateReadStatus`, `ChapterCacheDao.getBySeriesId` — reaproveitados como estão.
- `useReducer` + thin Service + Transform puro + bridge tipado — mesmo padrão de `useSeriesDetail.ts` / `SeriesDetailService.ts` / `shared/transforms/chapter.ts`.
- `NativeEventEmitter` sobre `DeviceEventManagerModule.RCTDeviceEventEmitter` — mesmo padrão do evento `"seriesFollowedIds"` em `SeriesModule.kt`, replicado para o novo evento `"activeUrlChanged"`.

### O que já existe e será reaproveitado

**Kotlin:**
- `KavitaChapterFeature.kt` (`android/features/src/main/kotlin/com/mymangareader/features/kavita/chapter/`) — já tem `listChaptersForSeries`, `saveReadingProgress(chapterId, seriesId, page): Result<Unit>`, `markChaptersRead`, `markChaptersUnread`. Este plano **expande** essa mesma classe com `getPageUrls`, `getServerReadProgress`, `getLocalProgress`, `saveLocalProgress`, `getPageCacheUrls`, `invalidatePageCache` — não cria uma feature nova.
- `SeriesModule.kt` (`android/app/src/main/kotlin/com/mymangareader/`) — já expõe `markChaptersRead`/`markChaptersUnread`/`addListener`/`removeListeners` ao RN. O Reader reaproveita diretamente — **não** recria esses métodos em outro módulo.
- `ChapterCacheDao` — já tem `getBySeriesId`, `updateReadStatus(chapterId, readStatus, pagesRead, updatedAtLocalMs)`, `insertAll`, `deleteBySeriesId`, `replaceForSeries` (`@Transaction`). Reaproveitado sem alteração.
- `ReadingProgressDao`/`ReadingProgressEntity` — já tem `get(chapterId)`/`upsert(entity)`. Este plano adiciona apenas a coluna `scrollFraction` via migration — a interface do DAO ganha um campo na entity, não é reescrita.
- `RequestTool.request(url, method, headers, body): Result<HttpResult>` — reaproveitado sem alteração para todas as chamadas HTTP novas (`getPageUrls`, `getServerReadProgress`).
- `KavitaUrlSource` (`getActiveUrl`/`invalidateAndReselect`) — reaproveitado para resolver a URL base; **não é modificado** — este plano só observa suas mudanças por fora.
- `AuthConfigDao.get()` — reaproveitado para o JWT/apiKey em todas as chamadas novas, igual ao padrão já usado em `KavitaChapterFeature`.
- `UiPreferencesDao.get()`/`upsert(entity)` — reaproveitado. O campo `keepScreenOnDuringReading` já existe na entity; este plano expõe um getter dedicado, sem reescrever o DAO existente.
- `AppDatabase` (`version = 5`) — reaproveitado; este plano adiciona `Migration_5_6` seguindo o padrão de `Migration_4_5` (arquivo próprio em `migrations/`).

**React Native:**
- `useSeriesDetail.ts` — padrão `useReducer` + `useRef` para valores "vivos" fora do ciclo de render (`chaptersRef`, `sortPrefsRef`) — replicado em `useReader.ts` para `viewerChaptersRef`, `sessionMarkedReadRef` etc.
- `SeriesDetailService.ts` — padrão de thin wrapper (uma função por método do bridge) — replicado em `ReaderService.ts` e `PageService.ts`.
- `shared/bridge/series.ts` — padrão de bridge tipado (`interface XModuleInterface` + `NativeModules.X` + `NativeEventEmitter`) — replicado em `shared/bridge/chapter.ts` (novo) e `shared/bridge/page.ts` (novo) e `shared/bridge/network.ts` (novo, para `activeUrlChanged`).
- `shared/transforms/chapter.ts` (`chapterDisplayTitle`, `chapterNumberComparator`, `sortChapters`) — reaproveitado sem alteração para exibir título do capítulo na top bar do Reader.
- `SeriesDetailScreen.tsx` já navega para `Routes.READER` com `{ seriesId, chapterId, origin }` — contrato de params já compatível, reaproveitado sem alteração.
- `shared/i18n/strings.ts` — já tem `configKeepScreenOn` (usado na tela de Config). Este plano adiciona strings específicas do Reader seguindo o mesmo padrão bilíngue pt-BR/en.
- `frontend/src/navigation/routes.ts` — rota do Reader já registrada, reaproveitada sem alteração.

---

## Decisões de arquitetura (tomadas e justificadas)

### 1. Lib de lista: `@shopify/flash-list` (nova dependência)

`FlatList` nativo (usado em `SeriesDetailScreen`) é adequado para listas de altura homogênea e algumas dezenas de itens. O Reader lida com **centenas de itens por capítulo** (páginas de manga/webtoon com alturas muito variáveis), **três capítulos simultâneos**, inserção/remoção dinâmica de blocos inteiros no topo (PREV) e cauda (NEXT), e precisa de reindexação estável sem "piscar". `FlatList` degrada de forma conhecida nesses cenários: `getItemLayout` não é viável (alturas desconhecidas até `onLayout`), e o cálculo de posição via medição incremental do `VirtualizedList` interno é O(n), causando jank perceptível ao inserir itens no início da lista. `FlashList` resolve isso com recycling + estimated size + `overrideItemLayout`, desenhado precisamente para listas heterogêneas de centenas de itens. `keyExtractor` por identidade lógica (não índice) é suportado nativamente e crítico para "inserir bloco PREV não pode piscar os itens existentes".

Trade-off aceito: nova dependência com código nativo Android (autolinking) — a doc de erros conhecidos do projeto já cobre o passo de linkar manualmente em `android/app/build.gradle.kts`; a Task 001 cobre isso explicitamente.

### 2. Overscroll no topo: `onScroll` + `contentOffset.y` negativo (sem nested scroll connection)

RN não tem equivalente direto ao `NestedScrollConnection` do Compose. Abordagem adotada:
- `onScroll` do `FlashList` reporta `contentOffset.y`. Quando `contentOffset.y < -OVERSCROLL_TRIGGER_DP` (72dp convertido via `PixelRatio`) **e** o primeiro item renderizado é o Gap/Header do capítulo atual, dispara `loadPreviousChapter()`.
- `overScrollMode="always"` na prop do `FlashList` (repassada ao `ScrollView` interno) permite que `contentOffset.y` fique negativo no Android — API nativa já exposta pelo RN core, sem nova dependência.
- "Rearma só quando o dedo sai do topo": `useRef<boolean>` (`overscrollArmedRef`) vira `false` ao disparar o load e só volta a `true` em `onScrollEndDrag`/`onMomentumScrollEnd` quando `contentOffset.y >= 0`.
- Sem gesture-handler/reanimated: não são necessários — `onScroll` nativo do RN é suficiente. Ficam fora do escopo (nenhum requisito exige gestos compostos além de tap/scroll nativo).

### 3. Fração de scroll dentro do item mais visível: `onViewableItemsChanged` + `onScroll` combinados

`onViewableItemsChanged`/`viewabilityConfig` (suportado pelo `FlashList`) identifica **qual item** está mais visível, mas não dá a fração de scroll *dentro* dele. Combina-se com `onScroll` (`contentOffset.y`) e a posição/altura reais do item mais visível (mantidas em `Map<key, {offset, height}>`, atualizado via `onLayout` de cada item):

```
scrollFraction = clamp((contentOffset.y - item.offset) / item.height, 0, 1)
```

- Página → fração real de leitura.
- Footer → força `1`. Header → força `0`. Gap → mantém o último valor conhecido.

Não depende de a imagem ter carregado, porque a altura reservada do item já vem do `estimatedItemSize`/medição real do container.

### 4. Sync queue real: criada neste plano, escopo mínimo (sem coordinator dedicado)

O usuário confirmou que a sync queue deve ser criada do zero. Decisão: **não** criar um `ChapterSyncCoordinator.kt` genérico agora (seria escopo maior que o necessário para o único caso de uso atual: retry de marcação lido/não-lido). Em vez disso:
- Idempotência por sessão e retry de marcação vivem **inteiramente no RN** (`useReader.ts` — `Set<string>` de "já marcados nesta sessão" + `Set<string>` de "falharam, retry na próxima oportunidade"), reaproveitando `SeriesModule.markChaptersRead/Unread` que já retorna sucesso/falha limpa.
- Alinhado ao princípio "Kotlin é ponte de dados": não há vantagem técnica Android nessa orquestração — é responsabilidade do RN.
- Um `ChapterSyncCoordinator.kt` genérico reaproveitável por outros domínios de sync futura fica de fora deste plano, documentado como débito — se uma 2ª tela precisar do mesmo padrão, promove-se para Kotlin (regra "usado por 2ª tela → promove pra shared/tools").

### 5. Nome e local do novo Native Module: `ReaderModule` em `app/`, sem `features/kavita/reader/` nem `features/kavita/page/`

- **Novo NativeModule**: `ReaderModule.kt` em `android/app/src/main/kotlin/com/mymangareader/`, ao lado de `SeriesModule.kt`/`LibraryModule.kt`. O padrão do projeto já nomeia módulos RN por domínio de tela/domínio de dados (`SeriesModule`, `LibraryModule`), não por primitiva genérica — `ReaderModule` mantém essa consistência.
- **Feature Kotlin**: não cria `features/kavita/reader/` nem `features/kavita/page/`. Todos os métodos novos entram em `KavitaChapterFeature.kt` (já em `features/kavita/chapter/`), porque página não é um domínio Kavita independente e criar uma feature "Page" com 2-3 métodos triviais violaria o reaproveitamento mínimo.
- **Reaproveitamento explícito de `SeriesModule`**: `markChaptersRead`/`markChaptersUnread` não são replicados em `ReaderModule` — o RN do Reader importa `SeriesBridge` de `shared/bridge/series.ts` (já em `shared/`, então permitido mesmo com a regra "screen nunca importa de outra screen").

### 6. Migration `Migration_5_6.kt`

```kotlin
package com.mymangareader.core.database.migrations

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

val Migration_5_6 = object : Migration(5, 6) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE reading_progress ADD COLUMN scrollFraction REAL NOT NULL DEFAULT 0.0")
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS page_cache (
                chapterId TEXT NOT NULL,
                pageIndex INTEGER NOT NULL,
                url TEXT NOT NULL,
                cachedAtEpochMs INTEGER NOT NULL,
                PRIMARY KEY(chapterId, pageIndex)
            )
            """.trimIndent(),
        )
    }
}
```
Registrada em `AppDatabase.kt` (`version = 6`, `exportSchema = true`), exatamente o padrão de `Migration_4_5`. Chave primária composta `(chapterId, pageIndex)` permite `REPLACE` idôneo em upsert por página sem duplicar linhas, e permite contar linhas por `chapterId` para comparar com `pageCount` (requisito de cache hit).

### 7. `keepScreenOnDuringReading`: getter dedicado no `UiPreferencesDao`

Adicionar **um único método novo**:
```kotlin
@Query("SELECT keepScreenOnDuringReading FROM ui_preferences WHERE id = 'prefs' LIMIT 1")
suspend fun getKeepScreenOnDuringReading(): Boolean?
```
em vez de reaproveitar `get()` (que traz a entity inteira e acoplaria o Reader a campos de sort/idioma que não são da sua responsabilidade). Sem setter dedicado — a escrita continua exclusiva da tela de Config (`ConfigScreen.tsx`, fora do escopo deste plano), via `upsert(entity)` completo.

---

## Tasks

### Task 001 — RN: instalar dependências novas e linkar módulos nativos

**Por que fazer isso primeiro:** toda a árvore de tasks de UI depende de `@shopify/flash-list` estar instalado e linkado; `@react-native-community/netinfo` é usado pelo banner offline mas precisa constar no lockfile desde já para evitar retrabalho de build.

**O que fazer:**
1. `cd frontend && yarn add @shopify/flash-list@^1.7 @react-native-community/netinfo@^11`.
2. Verificar `android/settings.gradle.kts` — confirmar que `autolinkLibrariesFromCommand` descobre os dois novos módulos.
3. Adicionar explicitamente em `android/app/build.gradle.kts`, no bloco de módulos RN de terceiros:
   ```kotlin
   implementation(project(":shopify_flash-list"))
   implementation(project(":react-native-community_netinfo"))
   ```
   (nomes exatos de projeto Gradle a confirmar após `./gradlew :app:dependencies` durante a implementação).
4. `rm -rf android/build/generated/autolinking` antes do próximo build (cache stale).
5. **Não** instalar `react-native-gesture-handler` nem `react-native-reanimated` — nenhum requisito funcional exige gestos compostos além de tap/scroll nativo.
6. `make build-android` local para confirmar link antes de prosseguir.

**Arquivos a modificar:**
- `frontend/package.json`, `frontend/yarn.lock`
- `android/app/build.gradle.kts`

**Critério de aceite:**
- `make build-android` compila sem erro de view manager ausente ao montar uma view de teste com `FlashList`.
- `NetInfo.fetch()` chamável de um componente RN de teste sem crash.

**Checklist do padrão do projeto:** nenhum código Kotlin/RN de domínio criado ainda — só instalação/link, mínimo necessário para destravar as tasks seguintes.

---

### Task 002 — Kotlin: `Migration_5_6` (scrollFraction + page_cache) e getter de `keepScreenOnDuringReading`

**O que fazer:**
1. Criar `android/core/src/main/kotlin/com/mymangareader/core/database/migrations/Migration_5_6.kt` conforme SQL da decisão 6.
2. Criar `PageCacheEntity`:
   ```kotlin
   @Entity(tableName = "page_cache", primaryKeys = ["chapterId", "pageIndex"])
   data class PageCacheEntity(
       val chapterId: String,
       val pageIndex: Int,
       val url: String,
       val cachedAtEpochMs: Long,
   )
   ```
3. Criar `PageCacheDao`:
   ```kotlin
   @Dao
   interface PageCacheDao {
       @Query("SELECT * FROM page_cache WHERE chapterId = :chapterId ORDER BY pageIndex ASC")
       suspend fun getByChapterId(chapterId: String): List<PageCacheEntity>

       @Query("SELECT COUNT(*) FROM page_cache WHERE chapterId = :chapterId")
       suspend fun countByChapterId(chapterId: String): Int

       @Insert(onConflict = OnConflictStrategy.REPLACE)
       suspend fun insertAll(pages: List<PageCacheEntity>)

       @Query("DELETE FROM page_cache WHERE chapterId = :chapterId")
       suspend fun deleteByChapterId(chapterId: String)

       @Transaction
       suspend fun replaceForChapter(chapterId: String, pages: List<PageCacheEntity>) {
           deleteByChapterId(chapterId)
           insertAll(pages)
       }
   }
   ```
4. `ReadingProgressEntity` — adicionar `val scrollFraction: Float = 0f`. `ReadingProgressDao.get`/`upsert` continuam com a mesma assinatura.
5. `UiPreferencesDao` — adicionar `getKeepScreenOnDuringReading(): Boolean?` (decisão 7).
6. Registrar em `AppDatabase.kt`: `PageCacheEntity::class` em `entities`, `version = 6`, `abstract fun pageCacheDao(): PageCacheDao`, `val MIGRATION_5_6`.
7. Adicionar `MIGRATION_5_6` à lista de `addMigrations(...)` no ponto onde `MIGRATION_4_5` já é registrado (`DatabaseModule.kt`).

**Arquivos a criar:**
- `android/core/src/main/kotlin/com/mymangareader/core/database/migrations/Migration_5_6.kt`
- `android/core/src/main/kotlin/com/mymangareader/core/database/PageCacheEntity.kt`
- `android/core/src/main/kotlin/com/mymangareader/core/database/PageCacheDao.kt`
- `android/core/src/test/kotlin/com/mymangareader/core/database/migrations/Migration_5_6_Test.kt`
- `android/core/src/test/kotlin/com/mymangareader/core/database/PageCacheDaoTest.kt`

**Arquivos a modificar:**
- `ReadingProgressEntity.kt`, `UiPreferencesDao.kt`, `AppDatabase.kt`, `DatabaseModule.kt`

**Critério de aceite:**
- Teste de migration: linha pré-existente em `reading_progress` sobrevive com `scrollFraction = 0.0` após upgrade 5→6.
- `page_cache` criada vazia; `PageCacheDaoTest` cobre `replaceForChapter` (substitui, não acumula) e `countByChapterId`.
- App instala sobre a versão anterior (schema 5) sem crash nem migração destrutiva.

**Checklist do padrão do projeto:** cria só o estritamente necessário no Room (1 coluna + 1 tabela pequena); segue exatamente o padrão já usado por `Migration_4_5`; nenhuma lógica de negócio aqui, só schema.

---

### Task 003 — Kotlin: expandir `KavitaChapterFeature` com progresso e páginas

**O que fazer:**
Injetar `PageCacheDao` no construtor existente e adicionar:

1. `getPageUrls(chapterId, expectedPageCount): Result<List<String>>` — cache-first:
   ```kotlin
   suspend fun getPageUrls(chapterId: String, expectedPageCount: Int): Result<List<String>> {
       val cached = pageCacheDao.getByChapterId(chapterId)
       if (cached.size == expectedPageCount && expectedPageCount > 0) {
           return Result.success(cached.map { it.url })
       }
       val auth = authConfigDao.get() ?: return Result.failure(IllegalStateException("Not authenticated"))
       val baseUrl = urlSource.getActiveUrl().getOrElse { return Result.failure(it) }
       val urls = (0 until expectedPageCount).map { pageIndex ->
           "${baseUrl.trimEnd('/')}/api/reader/image?chapterId=$chapterId&page=$pageIndex&apiKey=${auth.apiKey}"
       }
       val now = System.currentTimeMillis()
       pageCacheDao.replaceForChapter(chapterId, urls.mapIndexed { i, url -> PageCacheEntity(chapterId, i, url, now) })
       return Result.success(urls)
   }
   ```
   A URL final já inclui `apiKey` como query param (mesmo padrão de `buildCoverUrl` em `KavitaSeriesFeature`), então é diretamente consumível por `<Image source={{uri}}>` no RN sem headers de autorização customizados — não é necessária lib de imagem com cache HTTP autenticado.
2. `invalidatePageCache(chapterId): Result<Unit>` — `pageCacheDao.deleteByChapterId(chapterId)`.
3. `getPageCacheUrls(chapterId): Result<List<Pair<Int, String>>>` — leitura direta do cache sem rede (usado pelo RN para checar host desatualizado).
4. `getServerReadProgress(chapterId): Result<Int?>` — `GET /api/Reader/get-progress?chapterId={id}`, `null` se 404/sem progresso.
5. `getLocalProgress(chapterId): Result<LocalProgress?>` — lê `readingProgressDao.get(chapterId)`, mapeia para `LocalProgress(page, scrollFraction)`.
6. `saveLocalProgress(chapterId, seriesId, page, scrollFraction): Result<Unit>` — `readingProgressDao.upsert(...)`. **Não** toca `chapterCacheDao` — isso continua sendo responsabilidade exclusiva do `saveReadingProgress` já existente (os dois métodos coexistem: timer local rápido vs. timer de sync que também reflete status de progresso do capítulo).

**Arquivos a modificar:**
- `android/features/src/main/kotlin/com/mymangareader/features/kavita/chapter/KavitaChapterFeature.kt`

**Critério de aceite:**
- Teste: `getPageUrls` com cache completo não chama `requestTool.request` (zero invocações).
- Teste: cache incompleto/vazio busca da rede e persiste via `replaceForChapter`.
- Teste: `getServerReadProgress` trata 404 como `Result.success(null)`, não falha.
- Teste: `saveLocalProgress` não invoca `chapterCacheDao`.
- Testes cobrem falha de auth para os métodos que fazem rede.

**Checklist do padrão do projeto:** expande a feature existente em vez de criar uma nova; reaproveita `RequestTool`, `AuthConfigDao`, `KavitaUrlSource` sem alteração; lógica de decisão (cache-first) fica no Kotlin só porque depende de Room, não é regra de negócio de UI.

---

### Task 004 — Kotlin: stream `events.activeUrlChanged`

**Por que é necessário:** `KavitaUrlSource.getActiveUrl()` tem cache TTL mas não é reativo — nada observa quando o resultado muda entre chamadas (ex.: WiFi→5G trocando o host). É preciso detectar essa mudança e notificar o RN.

**O que fazer:**
1. Criar `ActiveUrlWatcher` em `android/features/src/main/kotlin/com/mymangareader/features/kavita/`:
   ```kotlin
   @Singleton
   class ActiveUrlWatcher @Inject constructor(
       private val urlSource: KavitaUrlSource,
   ) {
       private val _activeUrl = MutableStateFlow<String?>(null)
       val activeUrl: StateFlow<String?> = _activeUrl.asStateFlow()
       private var pollJob: Job? = null

       fun start(scope: CoroutineScope) {
           if (pollJob != null) return
           pollJob = scope.launch {
               while (isActive) {
                   val current = urlSource.getActiveUrl().getOrNull()
                   if (current != null && current != _activeUrl.value) _activeUrl.value = current
                   delay(POLL_INTERVAL_MS)
               }
           }
       }
   }
   ```
   Estratégia: polling leve (`POLL_INTERVAL_MS = 30_000L`), reaproveitando `getActiveUrl()` já existente. Evita acoplar a um `ConnectivityManager` nativo (camada de abstração extra, indo além do mínimo necessário). O RN decide o que fazer com a mudança.
2. `start(scope)` chamado uma única vez a partir do `init` do `ReaderModule` (Task 005) — não em `Application.onCreate()`, já que só interessa enquanto a tela de leitura está ativa.

**Arquivos a criar:**
- `android/features/src/main/kotlin/com/mymangareader/features/kavita/ActiveUrlWatcher.kt`
- `android/features/src/test/kotlin/com/mymangareader/features/kavita/ActiveUrlWatcherTest.kt`

**Critério de aceite:**
- Teste com fake `KavitaUrlSource` retornando URLs diferentes em chamadas sucessivas confirma emissão só quando o valor muda.
- Teste confirma que `start()` chamado duas vezes não inicia dois jobs.

**Checklist do padrão do projeto:** único ponto novo de lógica reativa Kotlin, justificado por ser o único jeito de observar isso de forma persistente; RN não duplica essa detecção.

---

### Task 005 — Kotlin: `ReaderModule` (NativeModule bridge)

**O que fazer:**
Criar `ReaderModule.kt` em `app/`, injetando `KavitaChapterFeature`, `ActiveUrlWatcher`, `UiPreferencesDao`.

| Método JS | Delegação Kotlin |
|---|---|
| `getPageUrls(chapterId, expectedPageCount, promise)` | `KavitaChapterFeature.getPageUrls` |
| `invalidatePageCache(chapterId, promise)` | `KavitaChapterFeature.invalidatePageCache` |
| `getPageCacheUrls(chapterId, promise)` | `KavitaChapterFeature.getPageCacheUrls` |
| `getServerReadProgress(chapterId, promise)` | `KavitaChapterFeature.getServerReadProgress` |
| `getLocalProgress(chapterId, promise)` | `KavitaChapterFeature.getLocalProgress` |
| `saveLocalProgress(chapterId, seriesId, page, scrollFraction, promise)` | `KavitaChapterFeature.saveLocalProgress` |
| `saveReadingProgress(chapterId, seriesId, page, promise)` | `KavitaChapterFeature.saveReadingProgress` (reaproveitado) |
| `getKeepScreenOnDuringReading(promise)` | `uiPreferencesDao.getKeepScreenOnDuringReading()` |
| `addListener(eventName)` / `removeListeners(count)` | stubs obrigatórios |

Evento: no `init`, `activeUrlWatcher.start(scope)` e coleta de `activeUrlWatcher.activeUrl` (filtrando `null` inicial), emitindo `"activeUrlChanged"` com `{ url }` via `RCTDeviceEventEmitter` — mesmo padrão de `SeriesModule`.

**Arquivos a criar:**
- `android/app/src/main/kotlin/com/mymangareader/ReaderModule.kt`
- `android/app/src/test/kotlin/com/mymangareader/ReaderModuleTest.kt`

**Arquivos a modificar:**
- `android/app/src/main/kotlin/com/mymangareader/AppReactPackage.kt` — adicionar `ReaderModule` em `createNativeModules`.

**Critério de aceite:**
- `NativeModules.ReaderModule` visível no RN.
- Evento `"activeUrlChanged"` emitido quando `ActiveUrlWatcher` detecta mudança.
- Nenhum método de `markChaptersRead`/`Unread` duplicado neste módulo.

**Checklist do padrão do projeto:** módulo nomeado por domínio (não por primitiva); não duplica métodos já expostos em `SeriesModule`; segue exatamente o padrão de `addListener`/`removeListeners`/emissão de evento já usado.

---

### Task 006 — RN: `shared/bridge/page.ts`, `shared/bridge/network.ts`, `shared/bridge/chapter.ts`

**O que fazer:**

`shared/bridge/page.ts` (novo):
```typescript
export interface PageCacheEntry { pageIndex: number; url: string; }
interface ReaderModuleInterface {
  getPageUrls(chapterId: string, expectedPageCount: number): Promise<string[]>;
  invalidatePageCache(chapterId: string): Promise<void>;
  getPageCacheUrls(chapterId: string): Promise<PageCacheEntry[]>;
}
export const ReaderBridge: ReaderModuleInterface = NativeModules.ReaderModule;
```

`shared/bridge/network.ts` (novo):
```typescript
export const ActiveUrlChangedEmitter = new NativeEventEmitter(NativeModules.ReaderModule);
export interface ActiveUrlChangedEvent { url: string; }
```

`shared/bridge/chapter.ts` (novo — hoje `Chapter` só existe em `bridge/series.ts`; aqui reexporta o tipo, sem duplicar, e adiciona o que falta):
```typescript
export type { Chapter, ChapterReadStatus } from './series';
export interface LocalProgress { page: number; scrollFraction: number; }
interface ReaderChapterBridgeInterface {
  getServerReadProgress(chapterId: string): Promise<number | null>;
  getLocalProgress(chapterId: string): Promise<LocalProgress | null>;
  saveLocalProgress(chapterId: string, seriesId: string, page: number, scrollFraction: number): Promise<void>;
  saveReadingProgress(chapterId: string, seriesId: string, page: number): Promise<void>;
  getKeepScreenOnDuringReading(): Promise<boolean>;
}
export const ReaderChapterBridge: ReaderChapterBridgeInterface = NativeModules.ReaderModule;
```

**Arquivos a criar:**
- `frontend/src/shared/bridge/page.ts`
- `frontend/src/shared/bridge/network.ts`
- `frontend/src/shared/bridge/chapter.ts`

**Critério de aceite:**
- Nenhum tipo duplicado — `Chapter` continua definido uma única vez em `series.ts`.
- `tsc --noEmit` passa.

**Checklist do padrão do projeto:** um bridge por domínio, tipado, seguindo `shared/bridge/series.ts` como referência; reexporta em vez de duplicar tipos.

---

### Task 007 — RN: `shared/transforms/page.ts` — gap, janela de pré-carregamento, viewer chapters

**O que fazer:**
Funções puras, sem dependência de React:

```typescript
export function computeGapHeight(prevFooterHeight: number, nextHeaderHeight: number): number {
  return prevFooterHeight + nextHeaderHeight;
}

export type ReaderItemKind = 'HEADER' | 'PAGE' | 'FOOTER' | 'GAP';
export interface ReaderListItem {
  key: string; // `${chapterId}:${kind}:${pageIndex ?? ''}` — estável por identidade lógica
  kind: ReaderItemKind;
  chapterId: string;
  pageIndex?: number;
}

export function buildReaderList(viewer: ViewerChapters, measuredHeights: Map<string, number>): ReaderListItem[];
export function pagePreloadOrder(currentIndex: number, windowRadius: number, totalPages: number): number[];
export function isNearChapterEdge(currentPage: number, totalPages: number, edgeThreshold: number): boolean;

export interface ViewerChapters {
  prev: ChapterWithPages | null;
  curr: ChapterWithPages;
  next: ChapterWithPages | null;
}
export function currChapterOf(viewer: ViewerChapters): ChapterWithPages {
  return viewer.curr;
}
export function reindexAfterPrevInsert(oldIndex: number, prevBlockItemCount: number): number {
  return oldIndex + prevBlockItemCount;
}
```

**Arquivos a criar:**
- `frontend/src/shared/transforms/page.ts`
- `frontend/src/shared/transforms/__tests__/page.test.ts`

**Critério de aceite:**
- `computeGapHeight` — soma correta, nunca negativa.
- `buildReaderList` — Gap só entre dois blocos (nunca antes do primeiro Header nem depois do último Footer); chaves estáveis não mudam ao remontar o mesmo capítulo.
- `pagePreloadOrder` — janela de 7 (3+3+atual), ordenada por distância absoluta; clampa nos limites.
- `isNearChapterEdge` — limiar de 5 páginas.
- `reindexAfterPrevInsert` — desloca corretamente.
- `currChapterOf` — sempre `viewer.curr`, nunca outro campo.
- Cobertura de branch ≥ 90% neste arquivo (núcleo algorítmico mais sensível do plano).

**Checklist do padrão do projeto:** lógica de domínio 100% em RN puro, testável sem mock de bridge; nenhuma dessas regras vaza para o Kotlin.

---

### Task 008 — RN: `shared/transforms/chapter.ts` — regras de progresso (expansão)

**O que fazer:**
Adicionar ao arquivo já existente (não recriar):

```typescript
const READ_THRESHOLD_FRACTION = 0.98;

export function isChapterEffectivelyRead(chapter: Chapter): boolean {
  if (chapter.readStatus === 'READ') return true;
  if (chapter.pageCount <= 0) return false;
  return chapter.pagesRead / chapter.pageCount >= READ_THRESHOLD_FRACTION;
}

export function resolveInitialPage(
  chapter: Chapter,
  local: LocalProgress | null,
  serverPage: number | null,
): { page: number; scrollFraction: number } {
  if (isChapterEffectivelyRead(chapter)) return { page: 0, scrollFraction: 0 };
  if (local) return { page: local.page, scrollFraction: local.scrollFraction };
  if (serverPage != null) return { page: serverPage, scrollFraction: 0 };
  return { page: 0, scrollFraction: 0 };
}

export function shouldUnmarkOnReread(
  wasReadOnOpen: boolean,
  currentPage: number,
  totalPages: number,
  alreadyUnmarkedThisSession: boolean,
): boolean {
  if (!wasReadOnOpen || alreadyUnmarkedThisSession) return false;
  return currentPage < totalPages - 1;
}
```

**Arquivos a modificar:**
- `frontend/src/shared/transforms/chapter.ts`
- `frontend/src/shared/transforms/__tests__/chapter.test.ts`

**Critério de aceite:**
- Capítulo lido reabre do início mesmo com progresso local/servidor presente.
- Capítulo não lido usa local antes de servidor; sem nenhum dos dois usa página 0.
- `shouldUnmarkOnReread` só dispara uma vez por sessão e nunca na última página.

**Checklist do padrão do projeto:** expande transform já existente em vez de criar um novo arquivo paralelo; regra de "98% = lido" e "reabre do início" fica em RN puro, testável isoladamente.

---

### Task 009 — RN: `ReaderService.ts` e `PageService.ts` (thin wrappers)

**O que fazer:**

`screens/reader/ReaderService.ts`:
```typescript
export async function fetchServerReadProgress(chapterId: string): Promise<number | null>
export async function fetchLocalProgress(chapterId: string): Promise<LocalProgress | null>
export async function saveLocalProgress(chapterId: string, seriesId: string, page: number, scrollFraction: number): Promise<void>
export async function saveServerProgress(chapterId: string, seriesId: string, page: number): Promise<void>
export async function fetchKeepScreenOnPref(): Promise<boolean>
export async function markChapterRead(seriesId: string, chapterId: string): Promise<void>   // delega SeriesBridge.markChaptersRead([chapterId])
export async function markChapterUnread(seriesId: string, chapterId: string): Promise<void> // delega SeriesBridge.markChaptersUnread([chapterId])
```
`markChapterRead`/`Unread` importam `SeriesBridge` de `shared/bridge/series.ts` — reaproveitamento explícito, zero duplicação de chamada Kotlin.

`screens/reader/PageService.ts`:
```typescript
export async function fetchPageUrls(chapterId: string, expectedPageCount: number): Promise<string[]>
export async function invalidatePageCache(chapterId: string): Promise<void>
```

**Arquivos a criar:**
- `frontend/src/screens/reader/ReaderService.ts`
- `frontend/src/screens/reader/PageService.ts`
- `frontend/src/screens/reader/__tests__/ReaderService.test.ts`
- `frontend/src/screens/reader/__tests__/PageService.test.ts`

**Critério de aceite:**
- Cada função é um wrapper de 1 linha sobre o bridge — teste confirma delegação correta com args certos.

**Checklist do padrão do projeto:** thin service, zero lógica; mesmo padrão de `SeriesDetailService.ts`.

---

### Task 010 — RN: `useReader.ts` — núcleo (estado, timers, progresso, marcação)

**Por que é a task mais crítica:** concentra toda a lógica de negócio do Reader — nada disso pode vazar para Kotlin nem para componentes dummy.

**O que fazer:**

Estado (`useReducer`, seguindo o padrão de `useSeriesDetail`):
```typescript
export interface State {
  loading: boolean;
  error: string | null;
  viewer: ViewerChapters | null;       // currChapter = viewer.curr sempre
  overlayVisible: boolean;
  currentVisiblePage: number;
  scrollToPageRequest: number | null;
  scrollFraction: number;
  offline: boolean;
  isAdvancing: boolean;
}
```

Timers (`useRef<NodeJS.Timeout>` + `useEffect` de setup/teardown por capítulo ativo):
- **Timer local (2s)**: chama `saveLocalProgress(chapterId, seriesId, page, scrollFraction)` incondicionalmente.
- **Timer de sync (20s)**: chama `saveServerProgress` só se `page` mudou desde o último envio bem-sucedido (`useRef<number|null>`) **e** `chapterId` não está em `suppressServerSyncRef` (`Set<string>`, ligado quando o capítulo acabou de ser marcado como lido).

`onScreenExit` (chamado no cleanup do `useEffect` da tela):
```typescript
async function onScreenExit(viewer: ViewerChapters, page: number, scrollFraction: number) {
  clearInterval(localTimerRef.current);
  clearInterval(syncTimerRef.current);
  const curr = currChapterOf(viewer);
  saveLocalProgress(curr.id, curr.seriesId, page, scrollFraction).catch(() => {});
  if (!isChapterEffectivelyRead(curr)) {
    saveServerProgress(curr.id, curr.seriesId, page).catch(() => {});
  }
}
```
Nota de design (equivalente RN de `NonCancellable`): RN não tem escopo de coroutine cancelável — uma Promise disparada sem `await` continua em microtask mesmo após o componente desmontar. O padrão acima ("dispara sem aguardar, antes de qualquer cleanup que destrua refs") é o equivalente funcional.

Marcação automática como lido:
```typescript
const sessionMarkedReadRef = useRef<Set<string>>(new Set());
const sessionUnmarkedRef = useRef<Set<string>>(new Set());

async function markAsReadIfNeeded(chapter: Chapter, seriesId: string) {
  if (sessionMarkedReadRef.current.has(chapter.id)) return; // idempotente
  sessionMarkedReadRef.current.add(chapter.id);              // otimista, antes da chamada
  suppressServerSyncRef.current.add(chapter.id);
  dispatch({ type: 'OPTIMISTIC_MARK_READ', chapterId: chapter.id });
  try {
    await markChapterRead(seriesId, chapter.id);
  } catch {
    sessionMarkedReadRef.current.delete(chapter.id); // permite retry
    // NÃO reverte o cache local otimista
  }
}
```
Disparo: (a) ao atingir a última página do capítulo atual; (b) ao clicar seta "Próximo" — mesmo sem ter rolado até o fim.

Desmarcação ao reler (mesmo padrão, usando `shouldUnmarkOnReread`):
```typescript
async function unmarkIfRereading(chapter: Chapter, seriesId: string, currentPage: number, totalPages: number) {
  if (!shouldUnmarkOnReread(wasReadOnOpen, currentPage, totalPages, sessionUnmarkedRef.current.has(chapter.id))) return;
  sessionUnmarkedRef.current.add(chapter.id);
  dispatch({ type: 'OPTIMISTIC_MARK_UNREAD', chapterId: chapter.id });
  try {
    await markChapterUnread(seriesId, chapter.id);
  } catch {
    sessionUnmarkedRef.current.delete(chapter.id); // retry
  }
}
```

Navegação entre capítulos:
```typescript
async function advanceToNextChapter() { /* salva progresso final do curr IMEDIATAMENTE, marca como lido, troca viewer, recarrega ponta oposta */ }
async function retreatToPrevChapter() { /* troca viewer, NÃO marca curr como lido, recarrega ponta oposta */ }
async function goToNextChapterManual() { /* seta: abre do início, marca atual como lido; isAdvancing guard */ }
async function goToPrevChapterManual() { /* seta: abre do início, NÃO marca; isAdvancing guard */ }
```
Toda troca de `viewer` é substituição atômica do objeto inteiro — nunca mutação in-place de `viewer.curr`.

**Arquivos a criar:**
- `frontend/src/screens/reader/useReader.ts`
- `frontend/src/screens/reader/__tests__/useReader.test.ts`

**Critério de aceite:**
- Timer local dispara a cada 2s mesmo sem mudança de página.
- Timer de sync só envia quando `page` mudou E capítulo não suprimido.
- Marcar como lido é idempotente por sessão.
- Falha de rede na marcação NÃO reverte estado otimista, mas permite retry.
- `onScreenExit` em capítulo já lido não chama `saveServerProgress`.
- `currChapterOf(viewer)` é sempre a única fonte de "capítulo atual".
- Trocar de capítulo nunca muta o objeto `viewer` anterior (teste de referência).

**Checklist do padrão do projeto:** toda a lógica de negócio (idempotência, supressão, timers) é RN puro; Kotlin só recebe chamadas já decididas.

---

### Task 011 — RN: `useReader.ts` — pré-carregamento de páginas e reação a `activeUrlChanged`

**O que fazer:**
1. **Pré-carregamento de imagens**: usa `pagePreloadOrder` (Task 007). Fila com máximo 3 downloads simultâneos (`useRef` de pool simples — até 3 `Image.prefetch(url)` em voo). Ao inverter direção de scroll, cancela logicamente prefetches cuja URL saiu da janela: mantém `Set<string>` de "URLs desejadas" e descarta silenciosamente o resultado de um prefetch cuja URL não está mais no Set (cancelamento lógico, `Image.prefetch` do RN não expõe cancelamento de rede real).
2. **Trigger de pré-carregamento de vizinho**: quando `isNearChapterEdge(currentPage, totalPages, 5)` é true, dispara carregamento do vizinho na direção do scroll (se ainda não estiver no `viewer`).
3. **Reação a `activeUrlChanged`**: assina `ActiveUrlChangedEmitter`. Ao receber evento, para cada capítulo no `viewer` (prev/curr/next não-nulos), chama `getPageCacheUrls(chapterId)`, compara o host da primeira URL com o novo `url`; se diferente, invalida e recarrega **só aquele capítulo**.

**Arquivos a modificar:**
- `frontend/src/screens/reader/useReader.ts`
- `frontend/src/screens/reader/__tests__/useReader.test.ts`

**Critério de aceite:**
- Nunca mais de 3 `Image.prefetch` em voo simultaneamente.
- Inverter direção descarta prefetches fora da nova janela sem erro.
- Evento `activeUrlChanged` recarrega apenas o capítulo com host desatualizado.
- Borda de 5 páginas dispara pré-carregamento do vizinho exatamente uma vez.

**Checklist do padrão do projeto:** decisão de "quantos" e "quando" pré-carregar é RN puro (`shared/transforms/page.ts`); Kotlin só executa a busca/cache quando mandado.

---

### Task 012 — RN: componentes dummy — `PageImage`, `ChapterHeader`, `ChapterFooter`, `ReaderGap`

**O que fazer:**
Componentes puros, sem import de service/bridge:
- `PageImage.tsx` — `{ url, onLayout }`; `<Image>` com placeholder de loading.
- `ChapterHeader.tsx` — `{ chapterTitle, seriesName, onLayout }`; reporta altura real.
- `ChapterFooter.tsx` — `{ hasNext, chapterTitle, onLayout }`; "Fim do capítulo" + preview do próximo; reporta altura real.
- `ReaderGap.tsx` — `{ height }`; `<View style={{height}} />` vazia — altura *imposta* pelo cálculo de `computeGapHeight`, não medida.

**Arquivos a criar:**
- `frontend/src/screens/reader/components/PageImage.tsx`
- `frontend/src/screens/reader/components/ChapterHeader.tsx`
- `frontend/src/screens/reader/components/ChapterFooter.tsx`
- `frontend/src/screens/reader/components/ReaderGap.tsx`
- testes correspondentes em `__tests__/components/`

**Critério de aceite:**
- Nenhum componente importa `ReaderService`/`PageService`/bridge (grep confirma).
- `onLayout` propaga altura corretamente nos testes.

**Checklist do padrão do projeto:** componentes 100% dummy — recebem tudo via props, nenhuma orquestração.

---

### Task 013 — RN: componentes dummy — overlay (top bar, barra lateral, barra discreta, banner offline)

**O que fazer:**
- `ReaderTopBar.tsx` — `{ seriesName, chapterTitle, onBack, visible }`; fundo semi-transparente.
- `ReaderSideProgressBar.tsx` — `{ totalPages, currentPage, onPageSelect, onPrevChapter, onNextChapter, hasPrev, hasNext, visible }`; uma bolinha por página do capítulo atual; tap/drag chama `onPageSelect(index)`; setas desabilitadas quando `!hasPrev`/`!hasNext`.
- `ReaderThinProgressBar.tsx` — `{ fraction }` (0 a 1, já computado no hook); barra fina 3dp âmbar/dourado, sempre visível.
- `ReaderOfflineBanner.tsx` — `{ visible }`; banner fixo no rodapé, fade simples.

**Arquivos a criar:**
- `frontend/src/screens/reader/components/ReaderTopBar.tsx`
- `frontend/src/screens/reader/components/ReaderSideProgressBar.tsx`
- `frontend/src/screens/reader/components/ReaderThinProgressBar.tsx`
- `frontend/src/screens/reader/components/ReaderOfflineBanner.tsx`
- testes correspondentes em `__tests__/components/`

**Critério de aceite:**
- `ReaderSideProgressBar` renderiza exatamente `totalPages` bolinhas do capítulo atual (nunca soma com vizinhos).
- Setas desabilitadas não disparam callback quando clicadas em teste.
- Nenhum componente desta task importa service/bridge.

**Checklist do padrão do projeto:** mesmo padrão dummy da Task 012.

---

### Task 014 — RN + Kotlin: `useReader.ts` — overlay toggle, tela cheia, keep screen on, offline, overscroll

**O que fazer:**
1. **Toggle overlay**: `overlayVisible` no estado; alternado por tap simples na lista (via `Pressable` que envolve o `FlashList`, sem capturar toques da barra lateral).
2. **Tela cheia**: esconder status bar via `StatusBar.setHidden(true, 'fade')` (API RN nativa) ao montar, restaurar ao desmontar. Esconder a nav bar do sistema não tem API RN nativa sem lib adicional — fica documentado como limitação conhecida, não bloqueia a task (não foi pedida instalação de lib nova para isso).
3. **Keep screen on**: busca `fetchKeepScreenOnPref()` ao montar. RN não expõe manter tela ligada sem código nativo. Decisão: adicionar dois métodos pequenos ao `ReaderModule.kt` (retroativo à Task 005) em vez de instalar lib de terceiros:
   ```kotlin
   @ReactMethod
   fun keepScreenOn(promise: Promise) {
       UiThreadUtil.runOnUiThread {
           currentActivity?.window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
           promise.resolve(null)
       }
   }
   @ReactMethod
   fun allowScreenOff(promise: Promise) {
       UiThreadUtil.runOnUiThread {
           currentActivity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
           promise.resolve(null)
       }
   }
   ```
   `allowScreenOff` sempre chamado no unmount, independente da preferência (idempotente/seguro).
4. **Offline**: assina `NetInfo.addEventListener`; atualiza `state.offline`; banner some ao reconectar.
5. **Overscroll no topo**: `handleScroll` chamado pelo `onScroll` do `FlashList` (Task 016); usa `overscrollArmedRef` conforme decisão de arquitetura 2.

**Arquivos a modificar:**
- `frontend/src/screens/reader/useReader.ts`, testes
- `android/app/src/main/kotlin/com/mymangareader/ReaderModule.kt` (retroativo)
- `android/app/src/test/kotlin/com/mymangareader/ReaderModuleTest.kt`
- `frontend/src/shared/bridge/chapter.ts` (adicionar `keepScreenOn`/`allowScreenOff`)

**Critério de aceite:**
- `keepScreenOn` chamado ao montar quando pref é `true`; `allowScreenOff` chamado ao desmontar sempre.
- Status bar escondida ao montar, restaurada ao desmontar.
- Banner offline reflete `NetInfo` mockado (conecta/desconecta).
- Toggle de overlay alterna a cada tap sem interferir em taps de botões da barra lateral.

**Checklist do padrão do projeto:** os 2 métodos Kotlin novos são primitivos de janela, não acoplados ao domínio Reader por natureza — expostos aqui só porque é o único consumidor até uma 2ª tela precisar (regra "usado por 2ª tela → promove"); toda decisão de "quando" chamar fica no RN.

---

### Task 015 — RN: `screens/reader/ReaderTransform.ts` — labels e formatação

**Nota de nomenclatura**: seguindo o padrão do Plano 006 (`SeriesDetailTransform.ts` fica na screen, não em `shared/`, por ser formatação específica da tela), este arquivo fica em `screens/reader/`. `shared/transforms/page.ts` e `shared/transforms/chapter.ts` já cobrem a lógica de domínio reaproveitável.

**O que fazer:**
```typescript
export function progressBarFraction(page: number, scrollFraction: number, totalPages: number): number {
  if (totalPages <= 0) return 0;
  return Math.min(1, Math.max(0, (page + scrollFraction) / totalPages));
}
export function chapterHeaderTitle(chapter: Chapter, t: Strings): string {
  return chapterDisplayTitle(chapter, t); // reaproveita shared/transforms/chapter.ts
}
export function offlineBannerVisible(isOffline: boolean): boolean {
  return isOffline;
}
```

**Arquivos a criar:**
- `frontend/src/screens/reader/ReaderTransform.ts`
- `frontend/src/screens/reader/__tests__/ReaderTransform.test.ts`

**Critério de aceite:**
- `progressBarFraction` clampa em `[0, 1]`; `totalPages = 0` não gera `NaN`/`Infinity`.
- `chapterHeaderTitle` delega para `chapterDisplayTitle` sem lógica duplicada.

**Checklist do padrão do projeto:** transform específico da screen, reaproveita `shared/transforms/chapter.ts` sem duplicar.

---

### Task 016 — RN: montar `ReaderScreen.tsx` — lista principal e integração

**O que fazer:**
Substituir o stub:
```tsx
export function ReaderScreen() {
  const { seriesId, chapterId, origin } = route.params;
  const reader = useReader(seriesId, chapterId);
  const listRef = useRef<FlashList<ReaderListItem>>(null);

  useEffect(() => () => reader.onScreenExit(), []);

  return (
    <View style={styles.root}>
      <Pressable style={StyleSheet.absoluteFill} onPress={reader.toggleOverlay} />
      <FlashList
        ref={listRef}
        data={reader.listItems}
        keyExtractor={item => item.key}
        estimatedItemSize={800}
        overScrollMode="always"
        onScroll={reader.handleScroll}
        onViewableItemsChanged={reader.handleViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        renderItem={({ item }) => <ReaderListItemRenderer item={item} onLayout={reader.registerLayout} />}
      />
      <ReaderThinProgressBar fraction={progressBarFraction(reader.currentPage, reader.scrollFraction, reader.totalPages)} />
      {reader.overlayVisible && (
        <>
          <ReaderTopBar seriesName={...} chapterTitle={...} onBack={handleBack} visible />
          <ReaderSideProgressBar
            totalPages={reader.totalPages}
            currentPage={reader.currentPage}
            onPageSelect={reader.scrollToPage}
            onPrevChapter={reader.goToPrevChapterManual}
            onNextChapter={reader.goToNextChapterManual}
            hasPrev={!!reader.viewer?.prev}
            hasNext={!!reader.viewer?.next}
          />
        </>
      )}
      <ReaderOfflineBanner visible={reader.offline} />
    </View>
  );
}
```
`ReaderListItemRenderer` é um pequeno componente interno (não exportado, dummy) que faz `switch (item.kind)` para renderizar `PageImage`/`ChapterHeader`/`ChapterFooter`/`ReaderGap`.

`handleBack`: mesmo padrão de `SeriesDetailScreen` (`navigation.canGoBack()` → `goBack()`, senão `reset` para a rota de origem).

**Arquivos a modificar:**
- `frontend/src/screens/reader/ReaderScreen.tsx`

**Arquivos a criar:**
- `frontend/src/screens/reader/components/ReaderListItemRenderer.tsx`
- `frontend/src/screens/reader/__tests__/ReaderScreen.test.tsx`
- `frontend/src/screens/reader/__tests__/components/ReaderListItemRenderer.test.tsx`

**Critério de aceite:**
- Tela monta sem crash com `viewer` inicial vazio (loading).
- `onScreenExit` disparado no unmount.
- `scrollToPageRequest` atualiza `currentVisiblePage` otimisticamente antes de qualquer resposta assíncrona.

**Checklist do padrão do projeto:** screen só monta componentes dummy + hook; nenhuma lógica de negócio inline.

---

### Task 017 — RN: `useReader.ts` — carregamento inicial do trio de capítulos

**O que fazer:**
Fecha o hook com a orquestração de carga inicial:
```typescript
async function loadInitialViewer(seriesId: string, chapterId: string) {
  dispatch({ type: 'LOADING' });
  const chapters = await SeriesBridge.getCachedChapters(seriesId); // bridge direto, shared/
  const currIndex = chapters.findIndex(c => c.id === chapterId);
  const curr = chapters[currIndex];
  const prevChapter = currIndex > 0 ? chapters[currIndex - 1] : null;
  const nextChapter = currIndex < chapters.length - 1 ? chapters[currIndex + 1] : null;

  const [currPages, currLocal, currServer] = await Promise.all([
    fetchPageUrls(curr.id, curr.pageCount),
    fetchLocalProgress(curr.id),
    fetchServerReadProgress(curr.id),
  ]);
  const initial = resolveInitialPage(curr, currLocal, currServer);
  dispatch({ type: 'VIEWER_READY', viewer: { prev: null, curr: {...curr, pages: currPages}, next: null }, initialPage: initial.page, initialScrollFraction: initial.scrollFraction });
  loadNeighbor('prev', prevChapter);
  loadNeighbor('next', nextChapter);
}
```
A lista de capítulos da série é buscada diretamente via `SeriesBridge` (`shared/bridge/series.ts`) — **nunca** importando de `screens/series-detail/*`, reforçando a regra "screen nunca importa de outra screen".

Reload completo em torno de um alvo (seta manual para vizinho não pré-carregado) usa a mesma função `loadInitialViewer` com `chapterId` = alvo.

**Arquivos a modificar:**
- `frontend/src/screens/reader/useReader.ts`, testes

**Critério de aceite:**
- Abrir Reader com capítulo no meio da lista popula `viewer.prev` e `viewer.next` corretamente.
- Abrir com primeiro capítulo → `viewer.prev === null`; último → `viewer.next === null`.
- `resolveInitialPage` de fato usado para definir `scrollToPageRequest` inicial.
- Nenhum import de `screens/series-detail/` presente em `useReader.ts`.

**Checklist do padrão do projeto:** Reader busca seus próprios dados via bridge compartilhado, nunca da outra screen.

---

### Task 018 — RN e Kotlin: strings i18n, navegação final, cobertura e ajuste de floors

**O que fazer:**
1. Adicionar a `shared/i18n/strings.ts` (pt-BR + en) todas as strings novas do Reader (loading, erro, retry, offline, fim de capítulo, preview do próximo, sem próximo/anterior).
2. Confirmar que a navegação raiz já registra `Routes.READER` apontando para `ReaderScreen` (deve já existir desde o stub — task de verificação).
3. Rodar `make coverage`. Este é o maior plano em volume de lógica nova — atualizar `coverageThreshold` em `frontend/package.json` para os novos valores medidos (nunca abaixar).
4. Atualizar `COVERAGE_FLOOR_KOTLIN` em `android/build.gradle.kts` se a expansão elevar a cobertura de linha Kotlin.
5. `make build-android` + instalar em dispositivo físico + smoke test manual (ver verificação abaixo).

**Arquivos a modificar:**
- `frontend/src/shared/i18n/strings.ts`
- `frontend/package.json` (`coverageThreshold`)
- `android/build.gradle.kts` (`COVERAGE_FLOOR_KOTLIN`)
- `frontend/src/navigation/*.tsx` (se algum ajuste faltar)

**Critério de aceite:**
- `make coverage` passa (Kotlin + JS) com floors atualizados.
- Nenhuma string hardcoded em português dentro de componentes do Reader.

---

## Ordem de execução (DAG)

```
001 (instalar deps RN: flash-list, netinfo + link nativo)
  │
002 (Migration_5_6: scrollFraction + page_cache + keepScreenOn getter)
  │
003 (KavitaChapterFeature: getPageUrls, progresso local/servidor) ←─ 002
  │
004 (ActiveUrlWatcher: stream de mudança de URL) ──────────────────┐
  │                                                                 │
005 (ReaderModule: NativeModule bridge) ←─────────── 003 + 004 ────┘
  │
006 (bridge/page.ts, bridge/network.ts, bridge/chapter.ts) ←─ 005
  │
007 (transforms/page.ts: gap, janela, viewer chapters)   ─┐
008 (transforms/chapter.ts: progresso, reread)           ─┤  paralelas, independentes de 001-006
  │                                                        │
009 (ReaderService.ts, PageService.ts) ←─ 006 + 008 ──────┘
  │
010 (useReader: estado, timers, marcação) ←─ 007 + 008 + 009
  │
011 (useReader: pré-carregamento + activeUrlChanged) ←─ 010
  │
012 (componentes: PageImage, Header, Footer, Gap) ─┐  paralela a 007-011
013 (componentes: overlay, barras, banner offline) ─┤  paralela a 007-011
  │                                                  │
014 (useReader: overlay, fullscreen, keepScreenOn, offline, overscroll) ←─ 011 + 013
  │         (retroalimenta Task 005 com keepScreenOn/allowScreenOff)
  │
015 (ReaderTransform.ts: labels) ←─ 008 (paralela a 012-014)
  │
016 (ReaderScreen.tsx: montagem final) ←─ 012 + 013 + 014 + 015
  │
017 (useReader: carregamento inicial do trio) ←─ 016 (fecha o ciclo: hook completo + screen montada)
  │
018 (i18n, navegação, cobertura, smoke test) ←─ 017
```

---

## Verificação end-to-end

1. Abrir um capítulo do meio de uma série (não primeiro, não último) a partir do Detalhe da Série → lista mostra `Header(curr) → páginas → Footer(curr)` imediatamente; `viewer.prev`/`viewer.next` populam em seguida sem re-render perceptível dos itens já visíveis.
2. Abrir o **primeiro** capítulo da série → seta "Anterior" desabilitada, nenhum bloco PREV é criado.
3. Abrir o **último** capítulo → seta "Próximo" desabilitada.
4. Rolar rapidamente até a fronteira entre capítulo atual e o próximo → Gap não causa troca acidental de capítulo; troca só ocorre quando a página do vizinho fica de fato mais visível.
5. Rolar até a última página do capítulo atual (sem interação manual) → capítulo é marcado como lido automaticamente, sem esperar sair da tela; cache local reflete `readStatus: READ` imediatamente.
6. Clicar seta "Próximo capítulo" antes de chegar ao fim → capítulo atual é marcado como lido mesmo sem ter rolado até a última página; novo capítulo abre do início.
7. Clicar seta "Anterior" → capítulo atual **não** é marcado como lido; capítulo anterior abre do início.
8. Reabrir um capítulo já marcado como lido → abre sempre do início (página 0), nunca confiando em `savedPage` inconsistente.
9. Em um capítulo já lido, rolar para uma página que não seja a última → capítulo é desmarcado automaticamente, uma única vez por sessão (checar via `make log` que não repete chamadas).
10. Derrubar o WiFi durante a leitura → banner offline aparece no rodapé; reconectar → banner some.
11. Trocar de rede (WiFi → dados móveis) durante a leitura → só os capítulos com cache de URL desatualizado recarregam (observar via `make log` que `invalidatePageCache`/`getPageUrls` só disparam para o capítulo afetado).
12. Fechar o app no meio da leitura de uma página intermediária, sem esperar os 20s do timer de sync → reabrir o mesmo capítulo restaura a página e a fração de scroll exatas (prova que o timer local de 2s persistiu antes do fechamento).
13. Sair da tela do Reader (botão voltar) no meio de um capítulo não lido → progresso salvo local e remotamente antes do desmonte completar.
14. Sair da tela do Reader em um capítulo já lido → nenhuma chamada de `saveReadingProgress` disparada.
15. Tap simples na área da página → overlay (top bar + barra lateral) aparece com fade; tap de novo → some.
16. Com overlay visível: tap em uma bolinha da barra lateral → pula direto para a página; `currentVisiblePage` atualiza imediatamente, antes da animação terminar.
17. Com overlay visível: arrastar na barra lateral → navegação contínua conforme o dedo se move.
18. Sem overlay: barra fina dourada avança suavemente conforme o scroll, refletindo `(page + scrollFraction) / totalPages`, sem depender da imagem já ter carregado.
19. Puxar a lista para baixo no topo do capítulo atual → dispara carregamento do capítulo anterior; soltar e puxar de novo → dispara novamente (rearma corretamente); mesmo puxão quando o primeiro item não é o topo do capítulo atual → não dispara.
20. Com `keepScreenOnDuringReading = true` na Config → tela não apaga durante a leitura; sair do Reader → volta ao comportamento padrão.
21. Status bar escondida durante a leitura; voltar ao Detalhe da Série → status bar volta a aparecer.
22. Confirmar via log que nunca mais de 3 requisições de imagem estão em voo simultaneamente, e que inverter a direção do scroll cancela (logicamente) prefetches da janela anterior.
23. Chegar a 5 páginas do fim do capítulo atual → capítulo vizinho começa a pré-carregar em background, antes de o usuário rolar até lá.
24. `make coverage` passa com os floors atualizados (Kotlin e JS).
25. `make build-android` + instalação em dispositivo físico sem crash ao abrir o Reader a partir de todos os pontos de entrada existentes.

---

## Arquivos mais críticos

- `android/features/src/main/kotlin/com/mymangareader/features/kavita/chapter/KavitaChapterFeature.kt` — recebe toda a expansão de progresso e páginas (Task 003); único ponto Kotlin de lógica de domínio Chapter/Page.
- `android/core/src/main/kotlin/com/mymangareader/core/database/AppDatabase.kt` — precisa registrar `Migration_5_6`, `PageCacheEntity`/`PageCacheDao`, bump de `version = 6` (Task 002); erro aqui quebra o app inteiro no upgrade.
- `android/app/src/main/kotlin/com/mymangareader/ReaderModule.kt` — novo NativeModule, ponto único de bridge RPC do Reader (Tasks 005/014).
- `frontend/src/screens/reader/useReader.ts` — núcleo de toda a lógica de negócio do Reader (estado, timers, marcação, pré-carregamento, navegação); arquivo mais crítico e mais testado do plano (Tasks 010/011/014/017).
