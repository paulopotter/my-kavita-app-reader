# Plano 006 — Series Detail Screen

## Contexto

O usuário já tem Biblioteca (003) e Seguindo (004) funcionando. Esta tela é a entrada para a leitura: exibe o detalhe de uma série, seus metadados e a lista de capítulos com ordenação, seleção múltipla e marcação otimista de lido/não-lido.

---

## Princípios que guiam este plano

### Domínio micro → macro

```
Chapter (micro) → Series → Library (macro)
```

- `KavitaChapterFeature` cuida de capítulos (listar, marcar lido/não-lido).
- `KavitaSeriesFeature` cuida de séries (detalhe, metadados) — chama `KavitaChapterFeature` via injeção quando precisar de dados de capítulo.
- Cada domínio tem sua própria subpasta em `features/kavita/`.

### Kotlin é ponte de dados

O Kotlin expõe dados crus. Toda lógica de ordenação, cálculo de continue-chapter, seleção múltipla e controle da janela de 2 min vivem no RN.

O Kotlin só recebe uma chamada de rede ou acessa o Room — nada mais.

### O que já existe e será reaproveitado

**Kotlin:**
- `KavitaSeriesFeature` — já tem `listChaptersForSeries` (que será **movida** para `KavitaChapterFeature` neste plano) e `saveReadingProgress`. A feature de série receberá apenas `getSeriesDetail` e `getSeriesMetadata`.
- `ChapterCacheDao` — já tem `getBySeriesId`, `updateReadStatus`, `insertAll`, `deleteBySeriesId`. Faltam apenas `replaceForSeries` (transação atômica) e `observeFollowedIds` no `FollowedSeriesDao`.
- `FollowedSeriesDao` — já tem `toggle`, `getAllIds`, `isFollowed`. Falta `observeAllIds()` retornando `Flow<List<String>>`.
- `UiPreferencesEntity` — já tem `chapterSortMode`, `chapterSortFixedThreshold`, `chapterSortProgressPercent`.
- `LibraryModule` — **não é tocado**. O `toggleFollow` que ele expõe continua lá para uso da Biblioteca. O novo `SeriesModule` expõe o seu próprio `toggleFollow` para a tela de Detalhe.

**React Native:**
- `useLibrary.ts` — padrão `useReducer + useCallback` a ser seguido em `useSeriesDetail.ts`.
- `LibraryTransform.ts` — padrão de funções puras a ser seguido em `shared/transforms/chapter.ts` e `shared/transforms/series.ts`.
- `shared/bridge/library.ts` — padrão de bridge type a ser seguido em `shared/bridge/series.ts`.

---

## Tasks

### Task 001 — Kotlin: reorganizar pastas e criar `KavitaChapterFeature`

**Por que fazer isso primeiro:**
O `architecture.md` define que `features/kavita/` deve ter subpastas `library/`, `series/`, `chapter/`. Hoje tudo está na raiz de `kavita/`. Esta task cria a estrutura correta antes das demais adicionarem código novo.

**O que fazer:**
1. Criar subpastas `series/` e `chapter/` dentro de `features/kavita/`.
2. Mover `KavitaSeriesFeature.kt` para `features/kavita/series/` e atualizar o `package` para `com.mymangareader.features.kavita.series`.
3. Criar `features/kavita/chapter/KavitaChapterFeature.kt` com os métodos de capítulo que **já existem** em `KavitaSeriesFeature`:
   - Mover `listChaptersForSeries(seriesId): Result<List<ChapterCacheEntity>>` → `KavitaChapterFeature`.
   - Mover `saveReadingProgress(chapterId, seriesId, page)` → `KavitaChapterFeature`.
   - Adicionar `markChaptersRead(seriesId, chapterIds: List<String>): Result<Unit>` — chama `POST /api/Reader/mark-multiple-read`. Em caso de sucesso, chama `chapterCacheDao.updateReadStatus` para cada capítulo.
   - Adicionar `markChaptersUnread(seriesId, chapterIds): Result<Unit>` — chama `POST /api/Reader/mark-multiple-unread`. Atualiza cache.
4. Atualizar `LibraryModule` para importar do novo package (`kavita.chapter.KavitaChapterFeature` e `kavita.series.KavitaSeriesFeature`).
5. Atualizar `AppReactPackage` e `MainApplication` para os novos imports.
6. `FeaturesModule` (Hilt) — atualizar se necessário.

**Arquivos a criar/modificar:**
- `android/features/.../features/kavita/series/KavitaSeriesFeature.kt` — movido + package atualizado
- `android/features/.../features/kavita/chapter/KavitaChapterFeature.kt` — novo
- `android/app/.../LibraryModule.kt` — imports atualizados
- `android/app/.../AppReactPackage.kt` — imports atualizados

**Critério de aceite:**
- Projeto compila sem erros após a reorganização.
- `LibraryModule` continua funcionando (listSeries, saveReadingProgress).
- Testes unitários de `KavitaChapterFeature` cobrem `markChaptersRead` e `markChaptersUnread`.

---

### Task 002 — Kotlin: expandir `KavitaSeriesFeature` com detalhe e metadados

**O que fazer:**
Com a feature agora em `kavita/series/`, adicionar os dois métodos que faltam:

- `getSeriesDetail(seriesId: String): Result<SeriesDetail>` — chama `GET /api/Series/{id}`.
  Retorna: `{id: String, name: String, coverImageUrl: String, summary: String?}`.
- `getSeriesMetadata(seriesId: String): Result<SeriesMetadata>` — chama `GET /api/Series/{id}/metadata`.
  Retorna: `{genres: List<String>, tags: List<String>}`.
- Data classes `SeriesDetail` e `SeriesMetadata` definidas no mesmo arquivo (ou em `series/SeriesModels.kt`).

**Arquivos a modificar:**
- `android/features/.../features/kavita/series/KavitaSeriesFeature.kt`

**Critério de aceite:**
- Testes unitários com mock de `RequestTool` cobrem detalhe e metadados.
- `KavitaSeriesFeature` não tem nenhum método de capítulo (responsabilidade separada).

---

### Task 003 — Kotlin: adicionar métodos faltantes em `ChapterCacheDao` e `FollowedSeriesDao`

**O que fazer:**

`ChapterCacheDao`:
- `replaceForSeries(seriesId: String, chapters: List<ChapterCacheEntity>)` — `@Transaction`: delete por seriesId + insertAll. Substitui atomicamente a lista de uma série.

`FollowedSeriesDao`:
- `observeAllIds(): Flow<List<String>>` — `@Query("SELECT seriesId FROM followed_series")` retornando `Flow` para o stream reativo do bridge.

**Arquivos a modificar:**
- `android/core/.../database/ChapterCacheDao.kt`
- `android/core/.../database/FollowedSeriesDao.kt`

**Critério de aceite:**
- `replaceForSeries` é atômico (transação Room); teste confirma que capítulos antigos são substituídos, não acumulados.
- `observeAllIds` emite nova lista quando a tabela muda.

---

### Task 004 — Kotlin: criar `SeriesModule` (NativeModule bridge)

**O que fazer:**
Criar `SeriesModule` no `app/`. Ele **não duplica** o `LibraryModule` — cuida apenas do domínio Série/Capítulo (não lista a biblioteca completa).

Métodos a expor via `@ReactMethod`:

| Método JS | Delegação Kotlin |
|---|---|
| `getSeriesDetail(seriesId, promise)` | `KavitaSeriesFeature.getSeriesDetail` |
| `getSeriesMetadata(seriesId, promise)` | `KavitaSeriesFeature.getSeriesMetadata` |
| `getChapters(seriesId, promise)` | `KavitaChapterFeature.listChaptersForSeries` |
| `getCachedChapters(seriesId, promise)` | `chapterCacheDao.getBySeriesId` — leitura direta, sem rede |
| `replaceCachedChapters(seriesId, chapters, promise)` | `chapterCacheDao.replaceForSeries` |
| `markChaptersRead(seriesId, chapterIds, promise)` | `KavitaChapterFeature.markChaptersRead` |
| `markChaptersUnread(seriesId, chapterIds, promise)` | `KavitaChapterFeature.markChaptersUnread` |
| `toggleFollow(seriesId, promise)` | `followedSeriesDao.toggle` |
| `getChapterSortPrefs(promise)` | `uiPreferencesDao.get()` → `{mode, fixedThreshold?, progressPercent}` |
| `setChapterSortPrefs(mode, fixedThreshold?, progressPercent, promise)` | `uiPreferencesDao.upsert(...)` |
| `addListener(eventName)` | stub obrigatório para NativeEventEmitter |
| `removeListeners(count)` | stub obrigatório |

**Event emitter (stream reativo de seguidos):**
No `init` do módulo: observar `followedSeriesDao.observeAllIds()` em um `CoroutineScope`, emitir evento `"seriesFollowedIds"` com array de strings a cada mudança.

**Arquivos a criar/modificar:**
- `android/app/.../SeriesModule.kt` — novo
- `android/app/.../AppReactPackage.kt` — adicionar `SeriesModule` em `createNativeModules`

**Critério de aceite:**
- `NativeModules.SeriesModule` visível no RN.
- Evento `"seriesFollowedIds"` emitido após `toggleFollow`.

---

### Task 005 — RN: `shared/bridge/series.ts` e transforms de domínio

**O que fazer:**

`shared/bridge/series.ts` — tipos TypeScript e instância do bridge:
- `SeriesDetail`, `SeriesMetadata`, `Chapter`, `ChapterSortMode`, `ChapterSortPrefs`
- `export const SeriesBridge = NativeModules.SeriesModule`
- `export const SeriesFollowedEmitter = new NativeEventEmitter(NativeModules.SeriesModule)`

`shared/transforms/chapter.ts` — funções puras de domínio de capítulo:
- `chapterDisplayTitle(chapter): string`
- `chapterNumberComparator(a, b): number` — não usa `sortOrder`
- `sortChapters(chapters, mode, fixedThreshold?, progressPercent): Chapter[]` — 4 modos

`shared/transforms/series.ts` — funções puras de domínio de série:
- `computeContinueChapter(chapters): Chapter | null` — ASC numérico; null se nenhum progresso; primeiro < 98% das páginas

**Arquivos a criar:**
- `frontend/src/shared/bridge/series.ts`
- `frontend/src/shared/transforms/chapter.ts`
- `frontend/src/shared/transforms/series.ts`
- `frontend/src/shared/transforms/__tests__/chapter.test.ts`
- `frontend/src/shared/transforms/__tests__/series.test.ts`

**Critério de aceite:**
- Testes cobrem `chapterDisplayTitle` (3 casos), `sortChapters` (4 modos), `computeContinueChapter` (3 casos).

---

### Task 006 — RN: `SeriesDetailService.ts` e `useSeriesDetail.ts`

**O que fazer:**

`SeriesDetailService.ts` — thin wrapper: uma função por método do bridge.

`useSeriesDetail.ts` — `useReducer` com:
- Local-first: `getCachedChapters` imediato, rede em paralelo com janela de 2 min no RN.
- Ao voltar do Leitor (`useFocusEffect`): força re-sync.
- Pull-to-refresh: força re-sync.
- Marcação otimista: atualiza estado + cache local imediatamente; falha de rede → `saveReadingProgress` (sync queue). Nunca reverte.
- Tolerância 30s: sync remota não sobrescreve `updatedAtLocalMs` < 30s.
- Seleção múltipla: `onChapterLongPress`, `onChapterClick`, `selectAll`, `invertSelection`, `exitSelectionMode`.
- Ordenação: reaplica `sortChapters` a cada mudança; persiste prefs; `toggleSortOrder` cicla os 4 modos.
- Seguir: assina `SeriesFollowedEmitter` → atualiza `isFollowed` reativamente.

**Arquivos a criar:**
- `frontend/src/screens/series-detail/SeriesDetailService.ts`
- `frontend/src/screens/series-detail/useSeriesDetail.ts`
- `frontend/src/screens/series-detail/__tests__/useSeriesDetail.test.ts`

**Critério de aceite:**
- Testes cobrem loading → loaded, marcação otimista sem reversão, seleção, 4 modos de sort.

---

### Task 007 — RN: `SeriesDetailTransform.ts` e componentes dummy

**O que fazer:**

`SeriesDetailTransform.ts`:
- `sortModeLabel(mode, fixedThreshold?, progressPercent, strings): string`
- `actionButtonLabel(continueChapter, readCount, totalCount, strings): string`

Componentes dummy (sem imports de serviço):
- `SeriesDetailHeader.tsx` — capa 2:3, nome, estrela, sinopse, chips, contagem, botão de ação
- `ChapterListItem.tsx` — checkbox/placeholder fixo, zebra, opacidade lido, long press
- `SelectionBottomBar.tsx` — 4 botões de ação

**Arquivos a criar:**
- `frontend/src/screens/series-detail/SeriesDetailTransform.ts`
- `frontend/src/screens/series-detail/__tests__/SeriesDetailTransform.test.ts`
- `frontend/src/screens/series-detail/components/SeriesDetailHeader.tsx`
- `frontend/src/screens/series-detail/components/ChapterListItem.tsx`
- `frontend/src/screens/series-detail/components/SelectionBottomBar.tsx`

**Critério de aceite:**
- Componentes são funções puras. Testes de Transform cobrem todos os labels.

---

### Task 008 — RN: montar `SeriesDetailScreen.tsx` e confirmar navegação

**O que fazer:**
Substituir stub pelo componente real. Loading / Error / Loaded. `RefreshControl`. Botão voltar sensível ao modo seleção. `useFocusEffect` para retorno do Leitor. Navega para `Reader` com `{ chapterId, seriesId }`.

**Arquivos a modificar:**
- `frontend/src/screens/series-detail/SeriesDetailScreen.tsx`
- `frontend/src/navigation/routes.ts` — params de Reader se faltar
- `frontend/src/navigation/MainNavigator.tsx` — confirmar Stack.Screen de Reader

**Critério de aceite:**
- Cache aparece antes da rede. Seleção e back funcionam conforme especificado.

---

### Task 009 — RN: modal de configuração de ordenação de capítulos

**O que fazer:**
`ChapterSortConfigModal.tsx` — acessível por ícone ao lado do toggle de sort. Seletor de modo + campo de limiar (fixedThreshold ou progressPercent conforme o modo). Salva via `setChapterSortPrefs`.

**Arquivos a criar:**
- `frontend/src/screens/series-detail/components/ChapterSortConfigModal.tsx`
- `frontend/src/screens/series-detail/__tests__/ChapterSortConfigModal.test.tsx`

**Critério de aceite:**
- Modal abre/fecha. Salvar reflete imediatamente no botão de sort.

---

### Task 010 — Migração de banco (se necessária)

Verificar se alguma entity recebeu coluna nova. Se sim: `Migration_4_5.kt` + registrar em `AppDatabase`. Se não: nenhuma ação.

**Critério de aceite:** App instala sobre versão anterior sem crash.

---

### Task 011 — Cobertura e ajuste de floors

Rodar `make coverage`. Atualizar `COVERAGE_FLOOR_KOTLIN` e/ou `coverageThreshold` se os floors subiram.

**Critério de aceite:** `make coverage` passa.

---

## Ordem de execução (DAG)

```
001 (reorganizar kavita/ + KavitaChapterFeature)
  ↓
002 (KavitaSeriesFeature: detalhe + metadados) ─┐
003 (DAO: replaceForSeries + observeAllIds)     ─┤→ 004 (SeriesModule)
005 (bridge/series.ts + transforms)             ─┘
  ↓
006 (SeriesDetailService + useSeriesDetail) ← 004 + 005
  ↓
007 (Transform + componentes) ← 005 + 006
  ↓
008 (SeriesDetailScreen + nav) ← 006 + 007
009 (modal de sort) ← 006 + 007
010 (migração) — paralela a 001-004
011 (coverage) — última
```

---

## Verificação end-to-end

1. Biblioteca → série → tela abre com cache imediato (se houver).
2. Após sync: zebra striping e status de lido/não-lido corretos.
3. Botão de ação: "Começar a ler" / "Continuar lendo cap. X" / "Reler".
4. Long press → seleção ativa, bottom bar aparece.
5. "Marcar como lido" → imediato, sem reversão por falha de rede.
6. Back no modo seleção → sai da seleção, não fecha a tela.
7. Pull-to-refresh → força sync.
8. Botão estrela → atualiza reativamente.
9. Config de sort → modal, mudar modo, botão reflete "Auto (cap. X)".
10. `make coverage` passa.
