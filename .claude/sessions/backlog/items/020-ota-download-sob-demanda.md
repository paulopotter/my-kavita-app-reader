# Backlog 020 — OTA download sob demanda (botão "baixar" no popup highly_recommended)

## What
`highly_recommended` deveria oferecer, no popup, um botão **"baixar agora"** que
dispara o download do bundle OTA em background — para que a **próxima
inicialização** já abra com o bundle novo, sem forçar o usuário a esperar. Hoje
não existe caminho para o RN pedir um download OTA sob demanda.

## Estado atual (Task 038 — Splash, 2026-09-02)
- **`required`** → diálogo nativo (Kotlin), botão leva à página de download
  (release page do GitHub). App congelado. OK, não muda.
- **`recommended`** → Kotlin baixa o bundle sozinho em background
  (`OtaDecision.DownloadPending` → `MainApplication.startOtaDownload`). Quando
  termina, a splash RN mostra só o botão **"atualizar"** (`OtaModule.applyOtaUpdate()`
  → restart com o bundle novo). OK, não muda.
- **`highly_recommended`** → Kotlin **NÃO baixa** (`ota-serve.sh`: "download
  skipped"). O popup RN hoje tem **"cancelar"** + **"ver notas"** (abre a URL no
  navegador). Não há botão que baixe.

## O gap
Para o botão "baixar agora" do `highly_recommended`:
- `OtaEventBridge` (Kotlin) não expõe nada como `startDownload()`. Só tem
  `getOtaPolicy` / `getOtaState` / `acknowledgePolicy` / `applyOtaUpdate`.
- `MainApplication.startOtaDownload(decision)` existe, mas só é chamado pelo gate
  no `DownloadPending` (ou seja, `recommended`). Precisaria de um ponto de
  entrada acionável pelo RN, passando a policy pendente.

## Escopo provável
1. **Kotlin** — `@ReactMethod fun startOtaDownload(promise)` no `OtaEventBridge`:
   pega a policy/manifest pendente (o mesmo `pendingPolicy` que o gate guardou) e
   chama `MainApplication.startOtaDownload(...)`. Idempotente se já estiver
   baixando. Emite `otaDownloadProgress` / `otaBundleReady` como o fluxo do
   `recommended` já faz.
2. **RN** — `splash.hooks.ts`: no `highly_recommended`, trocar o botão
   "ver notas" por "baixar agora" → `OtaModule.startOtaDownload()`, fecha o
   popup, `acknowledgePolicy()`. A partir daí o comportamento vira igual ao
   `recommended` (progresso, depois botão "atualizar" / grace de 5s). "Ver notas"
   pode virar um 3º botão ou sair.
3. **Testes** — Kotlin (novo bridge method) + `splash.tests.ts` (novo fluxo do
   botão).

## Caso relacionado (fora de OTA)
Quando a atualização exige **baixar o app inteiro de novo** (mudança no shell
Kotlin, não só no bundle JS) — isso é o `required` e **não dá para fazer via
OTA**. Já coberto: diálogo nativo → página de download. Só registrar aqui que
esse caminho é intencionalmente separado do download OTA.
