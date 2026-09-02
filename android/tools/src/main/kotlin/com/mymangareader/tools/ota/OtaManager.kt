package com.mymangareader.tools.ota

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.security.MessageDigest
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "OtaManager"
private val json = Json { ignoreUnknownKeys = true }
private const val RELEASE_PAGE_URL =
    "https://github.com/paulopotter/my-kavita-app-reader/releases/latest"

@Singleton
class OtaManager @Inject constructor(
    private val store: OtaStore,
    private val client: OkHttpClient,
    @OtaManifestUrl private val manifestUrl: String,
    @KotlinVersionName private val kotlinVersion: String,
    @CurrentAppVersion private val appVersion: String,
    @EmbeddedBundleBuildTimeMs private val embeddedBundleBuildTimeMs: Long,
) {
    private val rnVersion: String
        get() = store.readState().currentBundleVersion.ifBlank { "" }
    private val _downloadProgress = MutableStateFlow(-1f)
    val downloadProgress: StateFlow<Float> = _downloadProgress.asStateFlow()

    // ── Boot lifecycle ─────────────────────────────────────────────────────────

    fun applyRollbackIfNeeded() {
        val state = store.readState()
        if (state.crashDetected && !state.isStable && store.prevBundleFile.exists()) {
            Log.w(TAG, "Crash detected — rolling back to previous bundle")
            store.prevBundleFile.copyTo(store.bundleFile, overwrite = true)
            store.writeState(OtaState())
        }
    }

    // A non-OTA build/deploy repackages a bundle inside the APK, built at embeddedBundleBuildTimeMs.
    // The OTA bundle saved in app-private storage survives reinstalls untouched, and its version
    // string alone can't be trusted to detect staleness (e.g. "0.6.0-ota-test-none" and "0.6.0"
    // compare equal by semver). Comparing each bundle's own build time is version-scheme agnostic:
    // any local rebuild is newer than a previously downloaded OTA built before it.
    fun discardStaleBundleIfNeeded() {
        val state = store.readState()
        if (state.currentBundleVersion.isBlank()) return
        if (state.bundleBuildTimeMs >= embeddedBundleBuildTimeMs) return
        Log.w(
            TAG,
            "Embedded bundle (built at $embeddedBundleBuildTimeMs) is newer than OTA bundle " +
                "${state.currentBundleVersion} (built at ${state.bundleBuildTimeMs}) — " +
                "discarding stale OTA bundle",
        )
        store.bundleFile.delete()
        store.prevBundleFile.delete()
        store.writeState(OtaState())
    }

    fun recordBootStart() {
        val state = store.readState()
        store.writeState(state.copy(bootCount = state.bootCount + 1, crashDetected = false))
        Log.d(TAG, "Boot start — bootCount=${state.bootCount + 1}")
    }

    fun recordStableBoot() {
        val state = store.readState()
        if (state.bootCount >= N_STABLE && !state.isStable) {
            store.writeState(state.copy(isStable = true))
            store.prevBundleFile.delete()
            Log.d(TAG, "Bundle marked stable after ${state.bootCount} boots")
        }
    }

    fun recordCrash() {
        val state = store.readState()
        if (!state.isStable) {
            store.writeState(state.copy(crashDetected = true))
            Log.e(TAG, "Crash recorded — will rollback on next boot")
        }
    }

    // ── OTA check and download ─────────────────────────────────────────────────

    // Manifest fetch + policy + version evaluation, WITHOUT downloading the bundle. MainApplication
    // calls this on boot; MainActivity acts on the OtaDecision (block, or release the system
    // splash right away) and fires download() on applicationScope for the DownloadPending case —
    // so the boot is never held on the download. checkAndDownload() below keeps the old "do both,
    // return one OtaCheckResult" shape for any caller that still wants it.
    suspend fun check(): OtaDecision = withContext(Dispatchers.IO) {
        runCatching {
            Log.d(TAG, "Checking OTA manifest: $manifestUrl")
            val manifest = fetchManifest()
                ?: return@withContext OtaDecision.Failed(IllegalStateException("Failed to fetch manifest"))

            // Evaluate policies:
            //   required          → block app, no download
            //   highly_recommended → show popup, no download, app opens
            //   recommended       → show popup, download proceeds
            val policyResult = evaluatePolicies(manifest.policies)
            if (policyResult?.mode == "required") {
                Log.w(TAG, "Policy required — blocking")
                return@withContext OtaDecision.Blocked(policyResult.releaseNotesUrl)
            }

            // Technical compatibility check (also blocking)
            if (!meetsMinKotlinVersion(kotlinVersion, manifest.minKotlinVersion)) {
                Log.w(TAG, "Kotlin $kotlinVersion < required ${manifest.minKotlinVersion}")
                return@withContext OtaDecision.Blocked(RELEASE_PAGE_URL)
            }

            val advisory = policyResult
                ?.takeIf { it.mode == "highly_recommended" || it.mode == "recommended" }
                ?.let { PolicyAdvisory(it.mode, it.releaseNotesUrl) }

            // highly_recommended never downloads; only recommended proceeds to the bundle.
            if (policyResult?.mode == "highly_recommended") {
                Log.w(TAG, "Policy highly_recommended — skipping download")
                return@withContext OtaDecision.NothingToDo(advisory)
            }

            val state = store.readState()
            if (manifest.lastRNVersion == state.currentBundleVersion) {
                Log.d(TAG, "Bundle already up to date: ${manifest.lastRNVersion}")
                return@withContext OtaDecision.NothingToDo(advisory)
            }

            OtaDecision.DownloadPending(manifest, advisory)
        }.getOrElse { OtaDecision.Failed(it) }
    }

    // Downloads + validates + rotates the bundle for a manifest check() already resolved to
    // DownloadPending. Publishes progress through downloadProgress the whole time. Safe to call on
    // a background scope after MainActivity is up.
    suspend fun download(manifest: OtaManifest): OtaCheckResult = withContext(Dispatchers.IO) {
        runCatching {
            Log.d(TAG, "Downloading bundle ${manifest.lastRNVersion} from ${manifest.url}")
            downloadAndValidate(manifest)
        }.getOrElse { OtaCheckResult.Error(it) }
    }

    suspend fun checkAndDownload(): OtaCheckResult = withContext(Dispatchers.IO) {
        when (val decision = check()) {
            is OtaDecision.Blocked ->
                OtaCheckResult.PolicyMatch(mode = "required", releaseNotesUrl = decision.releaseNotesUrl)
            is OtaDecision.Failed ->
                OtaCheckResult.Error(decision.cause)
            is OtaDecision.NothingToDo ->
                OtaCheckResult.UpToDate(policy = decision.advisory?.toPolicyMatch())
            is OtaDecision.DownloadPending -> {
                val downloadResult = download(decision.manifest)
                if (downloadResult is OtaCheckResult.Updated) {
                    downloadResult.copy(policy = decision.advisory?.toPolicyMatch())
                } else {
                    downloadResult
                }
            }
        }
    }

    private fun PolicyAdvisory.toPolicyMatch() = OtaCheckResult.PolicyMatch(mode, releaseNotesUrl)

    // ── Private helpers ────────────────────────────────────────────────────────

    private fun fetchManifest(): OtaManifest? = runCatching {
        val request = Request.Builder().url(manifestUrl).get().build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return null
            val body = response.body?.string() ?: return null
            json.decodeFromString<OtaManifest>(body)
        }
    }.getOrNull()

    private fun evaluatePolicies(policies: OtaPolicies?): OtaCheckResult.PolicyMatch? {
        if (policies == null) return null
        val levels = listOf(
            "required" to policies.required,
            "highly_recommended" to policies.highlyRecommended,
            "recommended" to policies.recommended,
        )
        for ((mode, entries) in levels) {
            for (entry in entries) {
                if (appliesToCurrentInstall(entry)) {
                    return OtaCheckResult.PolicyMatch(mode = mode, releaseNotesUrl = entry.releaseNotesUrl)
                }
            }
        }
        return null
    }

    private fun appliesToCurrentInstall(entry: OtaPolicyEntry): Boolean = when (entry.type) {
        "app" -> !meetsMinAppVersion(appVersion, entry.minVersion)
        "rn" -> !meetsMinRnVersion(rnVersion, entry.minVersion)
        "kotlin" -> !meetsMinKotlinVersion(kotlinVersion, entry.minVersion)
        else -> false
    }

    private fun downloadAndValidate(manifest: OtaManifest): OtaCheckResult {
        _downloadProgress.value = -1f
        val temp = store.tempBundleFile
        temp.delete()

        val request = Request.Builder().url(manifest.url).get().build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return OtaCheckResult.Error(
                IllegalStateException("Bundle download failed: HTTP ${response.code}")
            )
            val body = response.body ?: return OtaCheckResult.Error(
                IllegalStateException("Empty bundle response")
            )
            val contentLength = body.contentLength()
            var downloaded = 0L

            body.byteStream().use { input ->
                temp.outputStream().use { output ->
                    val buffer = ByteArray(8 * 1024)
                    var read: Int
                    while (input.read(buffer).also { read = it } != -1) {
                        output.write(buffer, 0, read)
                        downloaded += read
                        if (contentLength > 0) {
                            _downloadProgress.value = downloaded.toFloat() / contentLength
                        }
                    }
                }
            }
        }

        if (!verifyHash(temp, manifest.bundleHash)) {
            temp.delete()
            _downloadProgress.value = -1f
            Log.e(TAG, "Bundle hash mismatch — discarding download")
            return OtaCheckResult.Error(IllegalStateException("Bundle hash mismatch"))
        }

        // Rotate: current → prev, temp → current
        if (store.bundleFile.exists()) {
            store.bundleFile.copyTo(store.prevBundleFile, overwrite = true)
        }
        temp.copyTo(store.bundleFile, overwrite = true)
        temp.delete()

        val state = store.readState()
        val prevVersion = state.currentBundleVersion
        store.writeState(
            state.copy(
                currentBundleVersion = manifest.lastRNVersion,
                isStable = false,
                bootCount = 0,
                bundleBuildTimeMs = manifest.bundleBuildTimeMs,
            ),
        )

        _downloadProgress.value = 1f
        Log.d(TAG, "Bundle updated to ${manifest.lastRNVersion}")
        return OtaCheckResult.Updated(prevVersion = prevVersion, newVersion = manifest.lastRNVersion, policy = null)
    }

    private fun verifyHash(file: File, expectedHash: String): Boolean = runCatching {
        // expectedHash format: "sha256:<hex>"
        val hex = expectedHash.removePrefix("sha256:")
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(8 * 1024)
            var read: Int
            while (input.read(buffer).also { read = it } != -1) {
                digest.update(buffer, 0, read)
            }
        }
        val actual = digest.digest().joinToString("") { "%02x".format(it) }
        actual == hex
    }.getOrDefault(false)
}
