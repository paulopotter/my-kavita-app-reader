---
task: 038 - splash-migration
plan: 017 - reestruturacao
date: 2026-09-02
status: done
---

# 038 - Splash migration

## O que foi entregue

A máquina de sync morta do Kotlin foi removida (`SplashSyncCoordinator`, os métodos
`syncBlocking/syncInBackground/drainSyncQueue` do `StartupModule` e o `features/startup/`).
Não existe mais `SplashActivity` — a `MainActivity` é a launcher e é dona do gate OTA
via `androidx.core:core-splashscreen`, segurando a splash do sistema até o gate resolver
**e** a splash RN pintar (`BootUiReadySignal` + `StartupModule.markUiReady`, com cap de 4s).
O diretório `frontend/src/screens/splash/` foi migrado para a convenção atual
(`splash.screen.tsx` + `splash.styles.ts` + `splash.types.ts` + `hooks/splash.hooks.ts`
+ `components/progress/`); os arquivos legados (`SplashScreen.tsx`, `useSplash.ts`,
`activateFirstServerGroup.*` e testes do hook antigo) foram apagados. A splash virou
rota de verdade do `RootNavigator`; o grafo de boot (`runSplashBoot`) faz servidor →
auth (`:server` `setActiveGroup`/`reauthenticate`, single active group = `groups[0]`) →
warm-up leve da Library (`assembleLibrary({ light: true })` + `seedLibrary`) → um
`SplashDestination` tipado. O destino `'following'` foi cortado (qual aba abre já é
decisão do `MainNavigator`).

Como efeito colateral de performance (era o gargalo que o usuário sentia no device):
o módulo `:cache` ganhou `patch`/`patchAll` (merge JSON + 1 leitura + 1 transação para
um lote) e o `buildSerialsDigest` passou a usar `patchAll` — o loop de
`get()+copy()+put()` por série (≈238 operações Room, ~11,6s numa biblioteca de ~120
séries) virou 1 query + 1 transação. A Library moveu o trabalho pesado por série para
enriquecimento preguiçoso por viewport.

Comportamento dos 3 modos OTA (rc83):
- `required` → diálogo nativo não-cancelável na `MainActivity` (botão → release page)
  **e** `pendingPolicy = "required"` publicado para a splash RN congelar por baixo
  (barreira dupla — sem a trava RN o usuário burla o diálogo nativo).
- `highly_recommended` → só o diálogo advisory no RN, não baixa; o redirect fica preso
  enquanto o diálogo está na tela, libera no dismiss, re-mostra depois de 5 min. O
  botão "baixar sob demanda" precisa de bridge Kotlin nova → backlog 020.
- `recommended` → download em background; a splash RN mostra só o botão "atualizar"
  quando o bundle está pronto, segura `UPDATE_BUTTON_GRACE_MS` (5s) antes do redirect,
  depois `acknowledgePolicy()`.

## Como foi testado

- `cd frontend && yarn jest` → 56 suites, 769 testes, todos verdes.
- `cd frontend && yarn type-check` → limpo. `yarn lint` → 0 erros.
- `make coverage` → Kotlin `koverVerify` BUILD SUCCESSFUL (LINE 83,30%, floor 83);
  threshold JS passa. Floor JS bumpado: `statements`/`lines` 68→71, `functions` 77→78.
  Floor Kotlin mantido em 83.
- **Device físico real:** o usuário rodou `make redeploy-log` nos cenários
  `make ota-required` e `make ota-recommended` em rc82/rc83. Confirmado:
  - boot normal sem tela intermediária (splash do sistema entra direto na splash RN,
    sem frame preto / sem "pulo");
  - `required` continua bloqueado depois de um ciclo background→foreground do app
    (sem a trava RN o usuário conseguiria burlar);
  - `recommended` baixa em bg, mostra o botão "atualizar" e reinicia no bundle novo;
  - Library carrega cache-first no primeiro open e sobrevive a um restart do app.
  - Observação do usuário sobre o botão "atualizar" reaparecer após instalar: é
    artefato do `ota-serve.sh` (sufixo fixo `-ota-test-<policy>` nunca casa com a
    versão instalada); no servidor real o `OtaManager.check()` decide `NothingToDo`
    e o botão não reaparece.

## Aprovação

O usuário aprovou nesta conversa em 2026-09-02: validou os 3 modos OTA no device
("no mais o ota estão funcionando.... então pode marcar como feito"), aprovou deixar
o merge do `buildChapterDigest` como está (semântica inversa ao `patch`), aprovou
registrar o botão de download sob demanda do `highly_recommended` no backlog em vez
de implementar agora, e pediu explicitamente para rodar o fechamento ("pode fazer
tudo").

## Notas

- **Breaking / comportamento:** o modelo de single active server group é premissa —
  a splash usa `groups[0]`; só 1 grupo até o backlog 019 (multi-servidores). `:server`
  `setActiveGroup`/`reauthenticate` são o caminho de auth da splash; `hasServerConfigured`
  / `isAuthenticated` ainda vêm do `SetupBridge` legado (migração é a Task 035).
- **Follow-ups:**
  - backlog 015 — os `console.log` de diagnóstico em `library.hooks.ts` /
    `splash.hooks.ts` ficaram **comentados** (não apagados), apontando para essa task.
  - backlog 020 — botão "baixar sob demanda" no `highly_recommended` (precisa de um
    `@ReactMethod` novo no `OtaEventBridge` para o RN disparar `startOtaDownload`).
  - backlog 018 — `shared/theme/colors.ts` é só o primeiro passe de tokens; tema
    completo é essa história.
- **Decisão registrada:** o merge prev/next do `buildChapterDigest` (get → decode →
  `copy(neighbors)` → encode → put) **não** foi convertido para `patch` — a precedência
  é o inverso (o valor em disco tem que vencer, para uma escrita sem vizinhos não
  apagar vizinhos que uma escrita guiada por Series colocou). Comentado no código.
- **Versões:** `0.8.0-rc72` (frontend `0.9.0-rc72`) → `0.8.0-rc83` (frontend `0.9.0-rc83`).
