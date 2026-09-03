# Backlog 022 — Aposentar a tabela `ui_preferences` (Room) e mover keep-screen-on / immersive para `:preferences`

## What
Eliminar `UiPreferencesEntity` / `UiPreferencesDao` e os métodos
`ConfigRepository.getUiPreferences` / `upsertUiPreferences` (RN + Kotlin). As duas
únicas preferências ainda vivas nessa tabela — `keepScreenOnDuringReading` e
`immersiveModeDuringReading` — passam para o `PreferencesManager` (`:preferences`,
Room), no mesmo padrão que `library.prefs.ts` já usa para o layout da Library.

## Por que agora
Todas as telas de config já rodam na arquitetura nova (Task 035). Sobrou órfão:

- **`UiPreferencesEntity`** ainda tem `chapterSortMode` / `chapterSortFixedThreshold`
  / `chapterSortProgressPercent` (a ordenação de capítulo migrou para
  `ChaptersTool.sort` → `PreferencesManager`, domínio `chapterSortPrefs`),
  `language` (idioma agora vem do locale por-app do SO), `libraryViewMode` /
  `librarySortMode` (migraram para `library.prefs.ts`, domínio `libraryLayout`) e
  `lastSuccessfulSyncAtMs` (checar se algum caller resta).
- A interface RN `UiPreferences` em `frontend/src/shared/bridge/config.ts` lista
  ainda `followingViewMode` / `followingSortMode` que nem existem na entity Kotlin.
- Único consumidor RN de `getUiPreferences` / `upsertUiPreferences`:
  `frontend/src/screens/config/reader/reader.hooks.ts` (os 2 toggles de leitura).

## A pegadinha (por que NÃO é só trocar o `reader.hooks`)
`keepScreenOnDuringReading` / `immersiveModeDuringReading` têm **dois leitores**:

1. A **config** escreve via `ConfigRepository.upsertUiPreferences` →
   `UiPreferencesEntity`.
2. A **tela de leitura real** (`frontend/src/screens/reader/hooks/reader.hooks.ts:616`)
   lê via `ScreenControlModule.getKeepScreenOnDuringReading()` /
   `getImmersiveModeDuringReading()` (Kotlin,
   `android/app/src/main/kotlin/com/mymangareader/ScreenControlModule.kt`), que faz
   `uiPreferencesDao.getKeepScreenOnDuringReading()` — a MESMA entity.

Migrar só a config quebra o Reader no device (o modo imersivo/keep-screen-on param
de refletir a escolha do usuário).

## Escopo (cross-camada — precisa de plano em fatias, verificadas no device)

### Kotlin
- `ScreenControlModule.kt` — remover `getKeepScreenOnDuringReading` /
  `getImmersiveModeDuringReading` (as leituras de DB); manter só os side-effects
  puros de WindowManager (`keepScreenOn` / `allowScreenOff` / `setImmersiveMode`).
  O modo imersivo tem ~15 linhas de comentário sobre `WindowInsets` — não pode
  regredir; testar no device.
- `ConfigRepository.kt` / `ConfigStore.kt` — remover `getUiPreferences` /
  `upsertUiPreferences` / `observeUiPreferences`.
- `AppReactPackage.kt` / `MainApplication.kt` — remover a injeção de
  `uiPreferencesDao` onde só servia isso.
- `UiPreferencesEntity` / `UiPreferencesDao` — deletar. `AppDatabase` — remover da
  lista de entities + `abstract fun uiPreferencesDao()`.
- **Migration Room** — SQLite não faz `DROP COLUMN` a contento; o padrão é
  `DROP TABLE ui_preferences`. Uma migration nova (versão N→N+1). Sem migração de
  dados (a escolha de layout/toggle já foi para o default uma vez — decisão do
  usuário, ver comentário em `library.prefs.ts`).
- `koverVerify` — os testes de `ScreenControlModule` / `ConfigRepository` /
  `ConfigStore` encolhem; conferir o floor.

### RN
- Novo `frontend/src/screens/config/reader/reader.prefs.ts` (modelo:
  `frontend/src/screens/library/library.prefs.ts`) — domínio `readerPrefs`,
  `PreferencesManager.get/put`.
- `reader.hooks.ts` (config) — consome `ReaderPrefs` em vez de `ConfigRepository`.
- `frontend/src/screens/reader/hooks/reader.hooks.ts` — lê a pref via `ReaderPrefs`
  (RN) e passa o booleano para `ScreenControlBridge.keepScreenOn()` /
  `setImmersiveMode()` (que viram side-effect-only).
- `frontend/src/shared/bridge/config.ts` — remover a interface `UiPreferences` +
  os 2 métodos do `ConfigRepositoryModule`.
- Testes: `reader.tests.tsx` (config), os de `reader` screen, `servers`/`config`
  mocks que tocam `ConfigRepository`.

## Depende de
- 035 (feito) — a árvore de config nova precisa estar no lugar.
- 016 (estratégia de rollback de migrations Room) — se estiver decidida, seguir; se
  não, esta task define a migration `DROP TABLE` isoladamente.

## Fora de escopo
- `chapterSort*` / `language` / `library*` na entity já estão órfãos — a migration
  `DROP TABLE` os leva junto, sem trabalho extra.
