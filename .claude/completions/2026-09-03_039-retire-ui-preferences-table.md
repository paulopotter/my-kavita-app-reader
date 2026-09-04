---
task: 039 - retire-ui-preferences-table
plan: 017 - Reestruturação
date: 2026-09-03
status: done
---

# 039 - Aposentar a tabela `ui_preferences` (Room)

## O que foi entregue

A tabela Room `ui_preferences` (`:core`) — último órfão do modelo antigo de preferências — foi
removida. As duas únicas configs ainda vivas nela (`keepScreenOnDuringReading` /
`immersiveModeDuringReading`) migraram para `:preferences` via um novo
`frontend/src/shared/tools/reader/reader-prefs.tool.ts` (`ReaderPrefs`, domínio `readerPrefs`).
`ScreenControlModule.kt` virou side-effect-only (WindowManager, sem DB);
`ConfigRepository.kt`/`ConfigStore.kt` perderam os métodos `*UiPreferences*`; a migração Room
13→14 (`Migration_13_14.kt`) faz `DROP TABLE ui_preferences`, e a entity/DAO foram apagados. Sem
migração de dado — os 2 toggles voltaram ao default uma vez no primeiro boot pós-upgrade
(decisão do usuário). O `schemas/AppDatabase/14.json` foi gerado e versionado.

Junto, foram corrigidos 2 bugs pré-existentes do modo imersivo (commits `fix` próprios):
`ScreenControlModule.setImmersiveMode` agora usa `LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES` +
zera `displayCutout()` (imagem desenha por trás do notch); e um novo
`frontend/src/shared/context/immersive/` faz o `App.tsx` remover o `paddingTop` global do shell
enquanto o Reader está em modo imersivo.

## Como foi testado

- **Kotlin:** `cd android && ./gradlew test koverVerify` — verde, incluindo os 2 testes novos
  de `Migration_13_14_Test.kt` (drop + downgrade round-trip) e os 3 casos novos de
  `ScreenControlModuleRobolectricTest.kt` (SHORT_EDGES + displayCutout).
- **JS/TS:** `cd frontend && yarn test:coverage` — 72 suites / 862 testes, coverage
  91.75 / 90.98 / 79.74 / 91.75 (sem queda de floor). tsc + eslint limpos.
- **`scripts/validate-room-schema.sh`** — verde (parity da migração 13→14).
- **Dispositivo físico real**, rc109, via `make redeploy-log` **instalando por cima da versão
  anterior** (upgrade 13→14, não uninstall): app abriu sem crash de migração; Config → Leitura
  com os 2 toggles no default; alternar cada um; Reader respeita keep-screen-on e modo imersivo
  (agora edge-to-edge por trás da câmera); matar o app e reabrir preserva os toggles (agora em
  `:preferences`).

## Aprovação

O usuário rodou `make redeploy-log` em cada fatia e confirmou nesta conversa: "funcionou" (rc108,
fixes do imersivo), "funcionou, pode fazer a fatia 5" (rc109, fatias Kotlin 2-4 + migração).

## Notas

- **Desvio do plano:** a migração ficou em `Migration_13_14.kt` próprio, não agregada no
  `Migration_12_13.kt` — `scripts/validate-room-schema.sh` exige um arquivo por par de versão.
- **Sem migração de dado** (decisão do usuário): `keepScreenOn`/`immersiveMode` resetam para
  os defaults (true / false) uma vez; o usuário reconfigura. Mesmo precedente de
  `library.prefs.ts`.
- **`ReaderPrefs` mora em `shared/tools/reader/`**, não num screen — Config escreve e Reader lê,
  então é cross-screen (mesmo critério de `ChaptersTool.sort`).
- **Follow-up — `bff_match`:** `BffMatchEntity` também está 100% órfã (`BffMatchDao` sem callers
  reais, só registrada no `AppDatabase`/`DatabaseModule`). Candidata ao mesmo `DROP TABLE`, task
  separada.
- **As outras 7 tabelas antigas** (`chapter_cache`, `series_detail_cache`, `reading_progress`,
  `page_cache`, `auth_config`, `server_config`, `bff_server_config`) ainda têm código vivo do
  modelo antigo por trás (`KavitaChapterFeature`/`KavitaSeriesFeature`/`KavitaAuthFeature`/
  `BffFeature`) — só somem quando essas features forem desligadas.
- Versões: APK `0.8.0-rc105` → `0.8.0-rc109`; bundle `0.9.0-rc105` → `0.9.0-rc109`.
- Plano 017 **não** está concluído — Fase 7 (Safeguards: 032, 033, 034) segue aberta.
