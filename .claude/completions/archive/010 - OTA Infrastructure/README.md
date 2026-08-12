# Plano 010 — OTA Infrastructure

## Contexto

O app mymangareader é um shell Kotlin + bundle React Native. Hoje, toda atualização da UI/lógica JS exige reinstalar o APK via USB. Este plano implementa infraestrutura para que o bundle JS possa ser atualizado silenciosamente via HTTP (OTA), sem nova instalação do APK nativo. Inclui sistema de políticas de update com quatro modos (passivo, recomendado, altamente recomendado, obrigatório) e rollback automático em caso de crash.

---

## Versões do sistema

O app tem três versões independentes:
- **App** (APK nativo) — datetime tag: `YYYY.MM.DD.HHMM` (ex: `2026.08.10.1415`)
- **Kotlin** (versionName do APK) — semver: `X.Y.Z` (ex: `0.1.0`)
- **RN** (bundle JS) — semver: `X.Y.Z` (ex: `1.6.0`)

---

## Schema `latest.json`

Hospedado na GitHub Release. Gerado/atualizado pelo CI a cada release.

```json
{
  "lastRNVersion": "2.1.0",
  "url": "https://github.com/paulopotter/my-kavita-app-reader/releases/download/2026.09.01.1000/bundle.js",
  "bundleHash": "sha256:abc123...",
  "minKotlinVersion": "0.2.0",
  "lastAppVersion": "2026.09.01.1000",
  "policies": {
    "required": [
      { "type": "app", "minVersion": "2026.08.17.0000", "releaseNotesUrl": "..." }
    ],
    "highly_recommended": [
      { "type": "rn", "minVersion": "1.9.0", "releaseNotesUrl": "..." },
      { "type": "kotlin", "minVersion": "0.2.0", "releaseNotesUrl": "..." }
    ],
    "recommended": []
  }
}
```

**Campos raiz:**
- `lastRNVersion` — versão mais recente do bundle RN disponível
- `url` — URL de download do bundle RN
- `bundleHash` — SHA-256 do bundle (`sha256:<hex>`), gerado pelo CI; usado para validar integridade após download
- `minKotlinVersion` — versão mínima do APK para aplicar este bundle (compatibilidade técnica)
- `lastAppVersion` — datetime da release mais recente do APK
- `policies` — opcional; ausente = comportamento passivo

**`policies`:** objeto com chaves fixas `required | highly_recommended | recommended`, cada uma é um array (append-only — nunca remover entries sem consciência do impacto). Cada entry: `{ type, minVersion, releaseNotesUrl }`.
- `type`: `app | rn | kotlin` — define qual versão local comparar
- `minVersion`: versão abaixo da qual o aviso aparece; quem está nessa versão ou acima não é afetado

---

## Lógica de avaliação de policies

```
1. Baixa latest.json
2. Se "policies" ausente → passivo, sem aviso
3. Percorre: required[0..n] → highly_recommended[0..n] → recommended[0..n]
4. Para cada entry:
   - type "app"    → compara minVersion com datetime do APK instalado
   - type "rn"     → compara minVersion com versão do bundle em disco
   - type "kotlin" → compara minVersion com versionName do APK
   - Se minVersion > versão local → aplica mode, PARA o loop
5. Nenhum match → passivo
```

**Sempre uma única mensagem** — o primeiro match mais crítico. O usuário nunca sabe quantos problemas existem.

**Modos:**
- `recommended` — banner suave, app funciona normalmente, OTA continua
- `highly_recommended` — aviso persistente, app funciona, mas não recebe mais OTAs até atualizar
- `required` — tela de bloqueio, app não abre até atualizar

---

## `policy-pending.json`

Arquivo no repo raiz do mymangareader, versionado, nasce vazio:

```json
{}
```

Quando há uma policy para publicar na próxima release, edite antes de criar a tag:

```json
{
  "level": "required",
  "type": "app",
  "minVersion": "auto"
}
```

- `minVersion: "auto"` → CI substitui pela tag da release atual
- `minVersion: "1.9.0"` → CI usa o valor literal (para `type: rn` ou `type: kotlin`)
- CI faz append no array correto de `policies` no `latest.json`
- CI reseta `policy-pending.json` para `{}` e commita de volta

---

## Hierarquia de URL do manifest OTA

Resolvida em build time — da maior para menor prioridade:

1. `local.properties` → `OTA_MANIFEST_URL=http://localhost:8080/latest.json` (teste local)
2. Variável de ambiente CI → `OTA_MANIFEST_URL` (forks com servidor próprio)
3. Default hardcoded → `https://github.com/paulopotter/my-kavita-app-reader/releases/latest/download/latest.json`

---

## Bundle em disco

```
filesDir/ota/
├── bundle.js       — bundle ativo (OTA mais recente aplicado)
├── bundle.prev.js  — bundle anterior (rollback)
└── meta.json       — { currentBundleVersion, bootCount, isStable, crashDetected }
```

**Regra de estabilidade**: `N_STABLE = 3` boots sem crash → `isStable = true` → `bundle.prev.js` deletado.

Quando `policies` não existe no JSON ou `getJSBundleFile()` retorna `null` → RN usa asset bundled (`index.android.bundle`) — sem regressão.

---

## Arquitetura

```
SplashActivity (app)
  ├── OtaManager.applyRollbackIfNeeded()
  ├── OtaManager.recordBootStart()
  ├── launch(Dispatchers.IO) {
  │     OtaManager.checkAndDownload()
  │     → se PolicyMatch(required): mostra BlockedScreen, PARA
  │     → se download terminar antes de lançar MainActivity:
  │           mostra botão "Atualizar agora" → reinicia SplashActivity
  │     → se download terminar depois: emite evento via OtaEventBridge
  │   }
  ├── startActivity(MainActivity)   ← só se não required
  └── finish()
       └── delay(5s) → OtaManager.recordStableBoot()

MainApplication.getJSBundleFile()
  └── OtaStore.bundleFile.exists() → path em disco OU null → asset bundled

CrashGuard (app)
  └── Thread.setDefaultUncaughtExceptionHandler → OtaManager.recordCrash()

OtaEventBridge (Native Module — Kotlin → RN):
  ├── emite evento "otaBundleReady" quando download termina com sucesso
  └── expõe método "applyOtaUpdate()" → reinicia app via SplashActivity
        (FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_CLEAR_TASK)

RN side (stub/TODO para história de notificações):
  └── ouve "otaBundleReady" → incrementa badge do sino
        → usuário confirma → chama NativeOtaModule.applyOtaUpdate()
```

**Validação de integridade do bundle:**
- `latest.json` inclui `bundleHash: "sha256:abc123..."` — gerado pelo CI com `sha256sum`
- Após download, app calcula SHA-256 via `MessageDigest.getInstance("SHA-256")`
- Hash não bate → descarta arquivo temporário, mantém bundle anterior, loga erro
- Hash bate → move temporário para `bundle.js`, atualiza `meta.json`

---

## Módulos afetados

- `android/tools/` — `OtaManager`, modelos, utilitários de versão
- `android/app/` — `SplashActivity`, `CrashGuard`, wiring Hilt, `MainApplication`, `build.gradle.kts`, `AndroidManifest.xml`
- `mymangareader/.github/workflows/release.yml` — geração de `latest.json` + `bundle.js`
- `mymangareader/scripts/` — script de validação OTA (novo arquivo)
- `mymangareader/policy-pending.json` — novo arquivo, nasce com `{}`

Módulos não afetados: `core/`, `features/`, `frontend/`

---

## Tasks

### Task 001 — Modelos e `OtaStore`
**Módulo**: `tools/`
**Package**: `com.mymangareader.tools.ota`

Criar:
- `OtaManifest.kt` — modelos `@Serializable`:
  ```kotlin
  @Serializable
  data class OtaManifest(
      val lastRNVersion: String,
      val url: String,
      val bundleHash: String,
      val minKotlinVersion: String,
      val lastAppVersion: String,
      val policies: OtaPolicies? = null,
  )

  @Serializable
  data class OtaPolicies(
      val required: List<OtaPolicyEntry> = emptyList(),
      val highly_recommended: List<OtaPolicyEntry> = emptyList(),
      val recommended: List<OtaPolicyEntry> = emptyList(),
  )

  @Serializable
  data class OtaPolicyEntry(
      val type: String,        // "app" | "rn" | "kotlin"
      val minVersion: String,
      val releaseNotesUrl: String,
  )
  ```

- `OtaState.kt`:
  ```kotlin
  @Serializable
  data class OtaState(
      val currentBundleVersion: String = "",
      val bootCount: Int = 0,
      val isStable: Boolean = false,
      val crashDetected: Boolean = false,
  )
  const val N_STABLE = 3
  ```

- `OtaStore.kt` — `@Singleton @Inject constructor(@ApplicationContext val context: Context)`:
  - `val bundleFile: File` → `context.filesDir/ota/bundle.js`
  - `val prevBundleFile: File` → `context.filesDir/ota/bundle.prev.js`
  - `fun readState(): OtaState` — lê `meta.json`; arquivo ausente → `OtaState()` default
  - `fun writeState(state: OtaState)` — escreve `meta.json`
  - Usa `Json { ignoreUnknownKeys = true }` do kotlinx-serialization (já disponível em `tools/`)

Padrão: idêntico a `ConfigStore.kt` — constructor injection, sem `@Module` explícito.

Teste (`OtaStoreTest.kt`): round-trip serialization com temp dir; arquivo ausente retorna default.

---

### Task 002 — Utilitários de versão
**Módulo**: `tools/`
**Package**: `com.mymangareader.tools.ota`

Criar `VersionCheck.kt` com funções top-level puras:
- `meetsMinKotlinVersion(actual: String, minimum: String): Boolean` — parseia semver `X.Y.Z` via `compareValuesBy`; retorna `false` em formato inválido via `runCatching`
- `meetsMinRnVersion(actual: String, minimum: String): Boolean` — mesma lógica semver
- `meetsMinAppVersion(actual: String, minimum: String): Boolean` — parseia datetime tag `YYYY.MM.DD.HHMM` como `Long`; retorna `false` em formato inválido

Teste (`VersionCheckTest.kt`): JUnit4 puro (sem Android), cobre igual/maior/menor/inválido para cada função.

---

### Task 003 — `OtaCheckResult` e `OtaManager`
**Módulo**: `tools/`
**Package**: `com.mymangareader.tools.ota`

Criar `OtaQualifiers.kt`:
```kotlin
@Qualifier @Retention(AnnotationRetention.BINARY) annotation class OtaManifestUrl
@Qualifier @Retention(AnnotationRetention.BINARY) annotation class KotlinVersionName
@Qualifier @Retention(AnnotationRetention.BINARY) annotation class CurrentRnVersion
@Qualifier @Retention(AnnotationRetention.BINARY) annotation class CurrentAppVersion
```

Criar `OtaCheckResult.kt`:
```kotlin
sealed interface OtaCheckResult {
    object UpToDate : OtaCheckResult
    object Updated : OtaCheckResult
    data class PolicyMatch(
        val mode: String,
        val releaseNotesUrl: String,
    ) : OtaCheckResult
    data class Error(val cause: Throwable) : OtaCheckResult
}
```

Criar `OtaManager.kt` — `@Singleton @Inject constructor(store, requestTool, @OtaManifestUrl manifestUrl, @KotlinVersionName kotlinVersion, @CurrentRnVersion rnVersion, @CurrentAppVersion appVersion)`:

- `fun applyRollbackIfNeeded()` — se `crashDetected && !isStable && prevBundleFile.exists()`: copia prev → current, reseta state
- `fun recordBootStart()` — incrementa `bootCount`, zera `crashDetected`
- `fun recordStableBoot()` — se `bootCount >= N_STABLE`: `isStable = true`, deleta prev
- `fun recordCrash()` — se `!isStable`: `crashDetected = true`
- `suspend fun checkAndDownload(): OtaCheckResult`:
  1. GET `manifestUrl` via `requestTool.request()`
  2. Parseia `OtaManifest`
  3. Avalia `policies` (loop: required → highly_recommended → recommended; para no primeiro match)
  4. Se `PolicyMatch(required)` → retorna sem baixar bundle (bloqueio tem prioridade)
  5. Verifica `minKotlinVersion` — se não satisfeita → retorna `PolicyMatch(mode="required", ...releaseUrl)`
  6. Se `lastRNVersion == state.currentBundleVersion` → `UpToDate`
  7. Baixa bundle para arquivo temporário via OkHttp direto (não `requestTool` — precisa de streaming para progresso); emite `downloadProgress: Flow<Float>` (0.0–1.0) baseado em `Content-Length` quando disponível, ou `-1f` para indeterminado
  8. Valida SHA-256: calcula `MessageDigest.getInstance("SHA-256")` sobre o arquivo, compara com `bundleHash` do manifest
  9. Hash inválido → deleta temporário, retorna `Error`
  10. Hash válido → rotaciona `current → prev`, move temporário → `bundle.js`, atualiza `meta.json` → `Updated`

`val downloadProgress: StateFlow<Float>` — exposto pelo `OtaManager`; `SplashActivity` observa e atualiza a `ProgressBar` em tempo real.

Log tag: `"OtaManager"` — facilita `adb logcat -s OtaManager` em dispositivo físico.

Teste (`OtaManagerTest.kt`): `MockWebServer` + temp dir; 8 cenários: bundle já atualizado, bundle mais novo baixado, `minKotlinVersion` não satisfeita, policy `required` match, policy `highly_recommended` match, policies ausentes, crash de rede, rollback aplicado.

---

### Task 004 — `OtaModule` (placeholder em `tools/`)
**Módulo**: `tools/`

Criar `OtaModule.kt`:
```kotlin
@Module
@InstallIn(SingletonComponent::class)
object OtaModule
// Intentionally empty — string bindings live in app/ to avoid referencing BuildConfig here
```

---

### Task 005 — BuildConfig em `app/build.gradle.kts`
**Arquivo**: `mymangareader/android/app/build.gradle.kts`

Hierarquia de prioridade (maior → menor): `local.properties` > variável de ambiente CI > default GitHub.

Dentro de `defaultConfig { }`, adicionar:
```kotlin
val localProps = java.util.Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) load(f.inputStream())
}
val otaManifestUrl =
    localProps.getProperty("OTA_MANIFEST_URL")
        ?: System.getenv("OTA_MANIFEST_URL")
        ?: "https://github.com/paulopotter/my-kavita-app-reader/releases/latest/download/latest.json"
buildConfigField("String", "OTA_MANIFEST_URL", "\"$otaManifestUrl\"")
buildConfigField("String", "KOTLIN_VERSION_NAME", "\"${versionName}\"")
```

---

### Task 006 — `OtaBindingsModule` em `app/`
**Arquivo**: `mymangareader/android/app/src/main/kotlin/com/mymangareader/OtaBindingsModule.kt`

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object OtaBindingsModule {
    @Provides @Singleton @OtaManifestUrl
    fun provideOtaManifestUrl(): String = BuildConfig.OTA_MANIFEST_URL

    @Provides @Singleton @KotlinVersionName
    fun provideKotlinVersionName(): String = BuildConfig.KOTLIN_VERSION_NAME

    @Provides @Singleton @CurrentRnVersion
    fun provideCurrentRnVersion(store: OtaStore): String =
        store.readState().currentBundleVersion

    @Provides @Singleton @CurrentAppVersion
    fun provideCurrentAppVersion(): String = BuildConfig.VERSION_NAME
}
```

Padrão: idêntico a `NetworkModule.kt`.

---

### Task 007 — `CrashGuard` + integração em `MainApplication`
**Arquivos**: `mymangareader/android/app/src/main/kotlin/com/mymangareader/`

Criar `CrashGuard.kt` — `@Singleton @Inject constructor(otaManager: OtaManager)`:
- `fun install()` — captura handler anterior, instala novo que chama `otaManager.recordCrash()` e delega para o anterior

Modificar `mymangareader/android/app/src/main/kotlin/com/mymangareader/MainApplication.kt`:
- Adicionar `@Inject lateinit var crashGuard: CrashGuard`
- No final de `onCreate()`: `crashGuard.install()`

---

### Task 008 — `SplashActivity`
**Arquivos**:
- `mymangareader/android/app/src/main/kotlin/com/mymangareader/SplashActivity.kt`
- `mymangareader/android/app/src/main/res/values/styles.xml` (adicionar `Theme.Splash`)
- `mymangareader/android/app/src/main/res/values/colors.xml` (adicionar `splash_background`)

A `SplashActivity` é um **orquestrador de boot** — decide para onde o app vai e suporta fluxos futuros (sincronização de cache, dados). Dois cenários de OTA:

- **Download termina antes de lançar `MainActivity`** → exibe botão "Atualizar agora" na própria Splash; toque reinicia `SplashActivity` (`FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_CLEAR_TASK`) carregando o bundle novo
- **Download termina depois** → emite evento via `OtaEventBridge` para o lado RN; RN exibe badge no sino (stub/TODO para história de notificações)

```kotlin
@AndroidEntryPoint
class SplashActivity : AppCompatActivity() {
    @Inject lateinit var otaManager: OtaManager
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var mainActivityLaunched = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        otaManager.applyRollbackIfNeeded()
        otaManager.recordBootStart()
        scope.launch {
            when (val result = otaManager.checkAndDownload()) {
                is OtaCheckResult.PolicyMatch -> {
                    if (result.mode == "required") {
                        showBlockedScreen(result.releaseNotesUrl)  // não lança MainActivity
                        return@launch
                    }
                    showUpdateDialog(result)
                }
                is OtaCheckResult.Updated -> {
                    if (!mainActivityLaunched) showApplyUpdateButton()
                    else OtaEventBridge.emitBundleReady()
                }
                else -> Unit
            }
            if (!mainActivityLaunched) launchMain()
        }
        // Lança MainActivity em paralelo; flag evita duplo launch
        launchMain()
        scope.launch { delay(5_000L); otaManager.recordStableBoot() }
    }

    private fun launchMain() {
        if (mainActivityLaunched) return
        mainActivityLaunched = true
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}
```

**Barra de progresso — lógica de timing:**
```
val minSplashJob = launch { delay(5_000L) }          // mínimo 5s
val otaJob       = launch { otaManager.checkAndDownload() }
// Observa otaManager.downloadProgress → atualiza ProgressBar
joinAll(minSplashJob, otaJob)                         // espera ambos terminarem
launchMain()  // só depois que os 5s passaram E o OTA terminou (ou falhou)
```

Se não houver download (bundle já atualizado ou policy block), a barra anima em modo indeterminado pelos 5s do timeout.

**Barra de progresso na Splash:**
- Timeout mínimo de 5s — a barra anima durante esse período independente do que estiver acontecendo
- Progresso mensurável quando disponível:
  - Download do bundle OTA: progresso real baseado em bytes baixados / tamanho total (se o servidor retornar `Content-Length`)
  - Sem dado mensurável (ex: só checando manifest, sem download): anima de forma indeterminada (barra oscilante)
- Ao atingir 100% (ou 5s, o que vier depois): lança `MainActivity` se não houver bloqueio
- Implementação: `ProgressBar` no layout da Splash com modo determinado/indeterminado trocado em runtime

`styles.xml` — adicionar `Theme.Splash` estendendo `Theme.AppCompat.DayNight.NoActionBar` com `windowBackground = @color/splash_background`.

`colors.xml` — adicionar `splash_background` com valor `#1A1A2E` (mesma cor do `ic_launcher_background`).

---

### Task 009 — `AndroidManifest.xml`
**Arquivo**: `mymangareader/android/app/src/main/AndroidManifest.xml`

- `SplashActivity`: `android:exported="true"`, `android:noHistory="true"`, `android:theme="@style/Theme.Splash"`, recebe `<intent-filter>` LAUNCHER
- `MainActivity`: `android:exported="false"`, perde o `<intent-filter>` LAUNCHER

---

### Task 010 — Bundle OTA em `MainApplication`
**Arquivo**: `mymangareader/android/app/src/main/kotlin/com/mymangareader/MainApplication.kt`

Adicionar `@Inject lateinit var otaStore: OtaStore`.

No `DefaultReactNativeHost`, sobrescrever:
```kotlin
override fun getJSBundleFile(): String? =
    otaStore.bundleFile.takeIf { it.exists() }?.absolutePath
```

Quando retorna `null` → RN usa asset bundled (`index.android.bundle`). Zero regressão.

---

### Task 011 — `OtaEventBridge` (Native Module)
**Módulo**: `app/`
**Package**: `com.mymangareader`

Criar `OtaEventBridge.kt` — Native Module RN que:
- Expõe evento `"otaBundleReady"` (Kotlin → RN): emitido quando `OtaCheckResult.Updated` chega após `MainActivity` já ter sido lançada
- Expõe método `applyOtaUpdate()` (RN → Kotlin): reinicia o app via `startActivity(SplashActivity, FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_CLEAR_TASK)`

Registrar em `AppReactPackage.createNativeModules()`.

**Lado RN** (`frontend/src/native/OtaModule.ts`) — stub com TODO:
```typescript
// TODO: conectar ao sino de notificações quando história de notificações existir
import { NativeModules, NativeEventEmitter } from 'react-native';
export const OtaModule = NativeModules.OtaEventBridge;
export const OtaEmitter = new NativeEventEmitter(OtaModule);
// Usage: OtaEmitter.addListener('otaBundleReady', () => { /* show badge */ });
// Usage: OtaModule.applyOtaUpdate();
```

---

### Task 012 — `policy-pending.json`
**Arquivo**: `mymangareader/policy-pending.json` (novo, na raiz do mymangareader)

```json
{}
```

`"minVersion": "auto"` é resolvido pelo CI conforme o `type`:
- `type: "app"` → substitui pela tag da release atual (`YYYY.MM.DD.HHMM`)
- `type: "rn"` → substitui pelo `lastRNVersion` da release atual (do `package.json`)
- `type: "kotlin"` → substitui pelo `versionName` do `build.gradle.kts`

Formato quando preenchido (documentado em comentário no `release.yml`):
```json
{
  "level": "required",
  "type": "app",
  "minVersion": "auto"
}
```

---

### Task 013 — Script de validação OTA
**Arquivo**: novo script em `mymangareader/scripts/` (nome a definir na implementação, `.sh` para consistir com os demais scripts do projeto)

Valida:
- `policy-pending.json`: JSON válido; se não vazio, campos obrigatórios presentes e valores dentro dos enums suportados
- `latest.json`: JSON válido; campos raiz obrigatórios presentes; se `policies` presente, estrutura correta

Adicionado como script em `mymangareader/frontend/package.json`:
```json
"validate:ota": "..."
```

---

### Task 014 — CI/CD: `release.yml`
**Arquivo**: `mymangareader/.github/workflows/release.yml`

**Step de validação** (antes de tudo):
- Valida `latest.json` atual (da release anterior) + `policy-pending.json`
- Falha rápido se inválido

**Step de geração do `latest.json`**:
1. Baixa `latest.json` da release anterior (se existir) para preservar `policies`
2. Lê `policy-pending.json`; se não vazio: monta entry com `releaseNotesUrl` gerada da tag, faz append no array correto
3. Atualiza campos raiz: `lastRNVersion`, `url`, `minKotlinVersion`, `lastAppVersion`
4. Reseta `policy-pending.json` para `{}` e commita de volta

**Step de cópia do bundle**:
```yaml
- name: Copy bundle for OTA release
  run: cp mymangareader/android/app/src/main/assets/index.android.bundle bundle.js
```

**Step de build** — passar `OTA_MANIFEST_URL` como env var.

**GitHub Release** — adicionar `latest.json` e `bundle.js` aos artefatos.

**Workflow de CI (testes)** — step condicional que roda o script de validação apenas quando `policy-pending.json` é modificado no commit.

---

### Task 015 — Smoke test em dispositivo físico

```bash
# 1. Instalar e verificar SplashActivity como ponto de entrada
adb logcat -s OtaManager &
./scripts/install-device.sh --launch

# 2. Simular servidor OTA local
python3 -m http.server 8080 &
adb reverse tcp:8080 tcp:8080
# latest.json com lastRNVersion maior, apontando para bundle local

# 3. Boot 1: OTA download em background
# Boot 2: RN carrega do bundle OTA
# Verificar: adb shell run-as com.mymangareader ls files/ota/

# 4. Testar rollback
adb shell "run-as com.mymangareader sh -c \
  'echo {\"crashDetected\":true,\"isStable\":false} > files/ota/meta.json'"
# Rebotar → verificar rollback nos logs

# 5. Testar policy required
# latest.json com policies.required[0] com minVersion > versão instalada
# Verificar tela de bloqueio na SplashActivity

# 6. 3 boots sem crash → verificar isStable=true em meta.json
```

---

## Dependências Gradle novas

Nenhuma biblioteca nova. Verificar/tornar explícita em `mymangareader/android/app/build.gradle.kts`:
```kotlin
implementation("androidx.appcompat:appcompat:1.7.0")
```
(já é transitiva via React Native, mas `SplashActivity` estende `AppCompatActivity`)

---

## Ordem de implementação

```
001 → 002 → 003 → 004   (pipeline tools)
005                      (gradle, independente)
006 ← 004, 005          (wiring Hilt)
007 ← 003               (crash handler)
008 ← 003, 007          (splash activity)
009 ← 008               (manifest)
010 ← 001               (main application)
011 ← 003               (OtaEventBridge + stub RN)
012                      (policy-pending.json, independente)
013 ← 012               (script de validação)
014 ← 005, 012, 013     (CI/CD)
015 ← todos             (smoke test)
```

---

## Backlog relacionado

- **Telemetria interna (debug)**: painel in-app para FPS, cache, estado OTA, gerenciamento de memória — criar item de backlog.
- **Notificações in-app (sino)**: quando existir, consumir `OtaEmitter.addListener('otaBundleReady')` para exibir badge e opção de reiniciar para aplicar o bundle novo.
